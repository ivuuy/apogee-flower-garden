import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const canvas = document.querySelector("#c");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020406);
scene.fog = new THREE.FogExp2(0x07111a, 0.014);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 120);
camera.position.set(10.5, 5.4, 12.8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.22;
controls.minDistance = 6;
controls.maxDistance = 22;
controls.minPolarAngle = 1.05;
controls.maxPolarAngle = 1.62;
controls.target.set(0, 1.2, 0);

const uniforms = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3() }, uCamPos: { value: camera.position } };
const rand = (a, b) => a + Math.random() * (b - a);
const choose = (items) => items[Math.floor(Math.random() * items.length)];

function makeGround() {
  const geo = new THREE.CircleGeometry(29, 96);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0c1a19, roughness: 0.96, metalness: 0 });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(25.5, 96), new THREE.MeshStandardMaterial({ color: 0x10261f, roughness: 1 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.012;
  scene.add(inner);
}

function makeGrass() {
  const count = 15000;
  const base = new THREE.ConeGeometry(0.045, 1.05, 3, 1);
  const geo = new THREE.InstancedBufferGeometry().copy(base);
  const offsets = new Float32Array(count * 3), phases = new Float32Array(count), scales = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * 28, a = Math.random() * Math.PI * 2;
    offsets[i * 3] = Math.cos(a) * r; offsets[i * 3 + 1] = 0.5; offsets[i * 3 + 2] = Math.sin(a) * r;
    phases[i] = Math.random() * Math.PI * 2; scales[i] = rand(0.45, 1.65);
  }
  geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
  geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aOffset; attribute float aPhase; attribute float aScale; varying float vShade; uniform float uTime; uniform vec3 uWind; void main(){ vec3 p=position; float sway=sin(uTime*1.25+aPhase+ aOffset.x*.08)*.08 + uWind.x*.09; p.x += sway*p.y; p.z += cos(uTime*.9+aPhase)*.045*p.y + uWind.z*.06*p.y; p.y*=aScale; vec4 world=vec4(p+aOffset,1.); gl_Position=projectionMatrix*modelViewMatrix*world; vShade=.45+.55*aScale/1.65; }`,
    fragmentShader: `varying float vShade; void main(){ gl_FragColor=vec4(mix(vec3(.10,.25,.12),vec3(.32,.62,.26),vShade),1.); }`
  });
  scene.add(new THREE.Mesh(geo, mat));
}

function makeFlowers() {
  const count = 950;
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .025, 1.2, 5), new THREE.MeshStandardMaterial({ color: 0x356b42, roughness: .9 }), count);
  const petalGeo = new THREE.ConeGeometry(.19, .62, 8, 2);
  const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ roughness: .46, metalness: .04, side: THREE.DoubleSide }), count * 8);
  const centers = new THREE.InstancedMesh(new THREE.SphereGeometry(.15, 10, 7), new THREE.MeshStandardMaterial({ color: 0xffc76b, roughness: .36, emissive: 0x1d0c00, emissiveIntensity: .12 }), count);
  const palette = [0xf3a9a0, 0xffd08d, 0xb4d7bd, 0x8fb7dc, 0xc9a8d8, 0xf1e3af];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const r = 2 + Math.sqrt(Math.random()) * 23, a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, h = rand(.55, 1.55), s = rand(.6, 1.28);
    const tilt = rand(-.16, .16);
    dummy.position.set(x, h * .5, z); dummy.scale.setScalar(s); dummy.rotation.z = tilt; dummy.rotation.x = rand(-.12, .12); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
    const patch = (Math.sin(x * .19) + Math.cos(z * .16) + Math.sin((x + z) * .07)) * .5;
    const color = new THREE.Color(choose(palette)); color.offsetHSL(patch * .03, 0, patch * .05);
    stems.setColorAt(i, new THREE.Color(0x356b42)); centers.setColorAt(i, new THREE.Color(0xffc76b));
    dummy.position.set(x, h + .05 * s, z); dummy.scale.set(s, s, s);
    for (let p = 0; p < 8; p++) { const t = (p / 8) * Math.PI * 2; dummy.position.x = x + Math.cos(t) * .20 * s; dummy.position.z = z + Math.sin(t) * .20 * s; dummy.rotation.set(Math.PI / 2, t, .18); dummy.updateMatrix(); petals.setMatrixAt(i * 8 + p, dummy.matrix); petals.setColorAt(i * 8 + p, color); }
    dummy.position.set(x, h + .05, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); centers.setMatrixAt(i, dummy.matrix);
  }
  stems.instanceMatrix.needsUpdate = true; petals.instanceMatrix.needsUpdate = true; centers.instanceMatrix.needsUpdate = true;
  scene.add(stems, petals, centers);
}

function makeFireflies() {
  const count = 110, positions = new Float32Array(count * 3), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) { const r = rand(3, 25), a = Math.random() * Math.PI * 2; positions[i * 3] = Math.cos(a) * r; positions[i * 3 + 1] = rand(.8, 4.8); positions[i * 3 + 2] = Math.sin(a) * r; phases[i] = Math.random() * 6.28; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(positions, 3)); geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({ uniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: `attribute float aPhase; uniform float uTime; varying float vA; void main(){ vec3 p=position; p.y += sin(uTime*.9+aPhase)*.18; vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=3.6*(80./-mv.z); gl_Position=projectionMatrix*mv; vA=.45+.55*sin(uTime*2.+aPhase); }`, fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(1.,.76,.35,(1.-d*2.)*vA); }` });
  scene.add(new THREE.Points(geo, mat));
}

function makeParticles() {
  const count = 512, positions = new Float32Array(count * 3), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) { const r = Math.sqrt(Math.random()) * 27, a = Math.random() * 6.28; positions[i * 3] = Math.cos(a) * r; positions[i * 3 + 1] = rand(.05, 5); positions[i * 3 + 2] = Math.sin(a) * r; phases[i] = Math.random() * 6.28; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(positions, 3)); geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({ uniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: `attribute float aPhase; uniform float uTime; void main(){ vec3 p=position; p.y += sin(uTime*.38+aPhase)*.09; p.x += sin(uTime*.23+aPhase)*.025; vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=1.25*(75./-mv.z); gl_Position=projectionMatrix*mv; }`, fragmentShader: `void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(.55,.78,1.,(1.-d*2.)*.22); }` });
  scene.add(new THREE.Points(geo, mat));
}

function makeFluid() {
  const size = 128;
  const options = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
  const targets = [new THREE.WebGLRenderTarget(size, size, options), new THREE.WebGLRenderTarget(size, size, options)];
  const simScene = new THREE.Scene(), simCamera = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { uPrev: { value: targets[0].texture }, uPoint: { value: new THREE.Vector2(.5, .5) }, uForce: { value: new THREE.Vector2() }, uTime: uniforms.uTime }, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.); }`, fragmentShader: `varying vec2 vUv; uniform sampler2D uPrev; uniform vec2 uPoint; uniform vec2 uForce; uniform float uTime; void main(){ vec2 uv=vUv; vec4 v=texture2D(uPrev,uv)*.985; float d=distance(uv,uPoint); v.xy += uForce*exp(-d*180.)*.75; v.xy *= .994; gl_FragColor=v; }` }));
  simScene.add(quad);
  let read = 0;
  return { update(force) { quad.material.uniforms.uPrev.value = targets[read].texture; quad.material.uniforms.uForce.value.lerp(force, .35); renderer.setRenderTarget(targets[1 - read]); renderer.render(simScene, simCamera); renderer.setRenderTarget(null); read = 1 - read; }, pointer: quad.material.uniforms.uPoint.value };
}

makeGround(); makeGrass(); makeFlowers(); makeFireflies(); makeParticles();
scene.add(new THREE.HemisphereLight(0x94b8cf, 0x07100b, 1.3));
const moon = new THREE.DirectionalLight(0xb5d4ff, 2.5); moon.position.set(-10, 18, 5); scene.add(moon);
const warm = new THREE.PointLight(0xffa96d, 18, 18, 2); warm.position.set(0, 3.5, 0); scene.add(warm);
const fluid = makeFluid();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .62, .72, .62); composer.addPass(bloom);
const afterimage = new AfterimagePass(); afterimage.uniforms.damp.value = .93; composer.addPass(afterimage);
const vignette = new ShaderPass({ uniforms: { tDiffuse: { value: null }, darkness: { value: 1.15 }, offset: { value: 1.05 } }, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform float darkness; uniform float offset; varying vec2 vUv; void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 p=vUv-.5; float v=1.-smoothstep(.2,.78,length(p)*offset)*darkness*.42; gl_FragColor=vec4(c.rgb*v,c.a); }` }); composer.addPass(vignette); composer.addPass(new OutputPass());

const pointer = new THREE.Vector2(), gust = new THREE.Vector3();
let pointerDown = false;
addEventListener("pointerdown", () => { pointerDown = true; controls.autoRotate = false; gust.set(rand(-.8, .8), 0, rand(-.8, .8)); });
addEventListener("pointerup", () => { pointerDown = false; controls.autoRotate = true; });
addEventListener("pointermove", (event) => { pointer.x = (event.clientX / innerWidth) * 2 - 1; pointer.y = -(event.clientY / innerHeight) * 2 + 1; fluid.pointer.set(pointer.x * .45 + .5, pointer.y * .45 + .5); if (pointerDown) gust.set(pointer.x, 0, pointer.y); });
addEventListener("click", () => { gust.set(rand(-1, 1), 0, rand(-1, 1)); });
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });

const menuPanel = document.querySelector("#menu-panel"), menuToggle = document.querySelector("#menu-toggle");
function setMenu(open) { menuPanel.classList.toggle("open", open); menuToggle.setAttribute("aria-expanded", String(open)); }
menuToggle.addEventListener("click", () => setMenu(!menuPanel.classList.contains("open")));
document.querySelector("#menu-close").addEventListener("click", () => setMenu(false));
document.querySelectorAll("[data-close]").forEach((link) => link.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (event) => { if (event.key === "Escape") setMenu(false); });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime(); uniforms.uTime.value = t;
  const ambient = new THREE.Vector3(Math.sin(t * .23) * .35, 0, Math.cos(t * .19) * .28);
  const field = ambient.addScaledVector(gust, .72); uniforms.uWind.value.lerp(field, .08); gust.multiplyScalar(.95);
  fluid.update(new THREE.Vector2(uniforms.uWind.value.x, uniforms.uWind.value.z));
  uniforms.uCamPos.value.copy(camera.position); controls.update(); composer.render();
}
setTimeout(() => document.querySelector("#loading").classList.add("done"), 900);
animate();
