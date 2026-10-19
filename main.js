/* ==========================================================================
   2021 LAMBORGHINI COUNTACH LPI 800-4 — THREE.JS EXPERIENCE
   Features:
     - Launch Horizontal Side View (Front Facing Left) with Smoke Trail (I2)
     - Scroll-driven Exterior Paint Morph (Red -> Orange -> Blue -> Silver -> Black -> White -> Purple) & Interior Cockpit View (I3)
     - 4-Wheel Steering & 4-Wheel Drive Interactive System with Dynamic 3D Connecting Lines & Clickable Wheels (I4)
     - Max Speed & 0-60 MPH Acceleration Launch Simulator (I5)
     - Full-screen Cinematic Finale with Sound Toggle & "Claim 1 of 112 Today" Gold Button with Digital Key Celebration Modal (I6)
   ========================================================================== */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/OBJLoader.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';

// --- COLOR PALETTE DEFINITION (I3 Requirement) ---
const COLOR_OPTIONS = [
  { name: 'Rosso Mars', hex: '#C4151C', desc: 'Racing Red' },
  { name: 'Arancio Atlas', hex: '#FF5E00', desc: 'Pearl Orange' },
  { name: 'Blu Uranus', hex: '#0066FF', desc: 'Electric Azure' },
  { name: 'Grigio Telesto', hex: '#9EABB3', desc: 'Streamlined Grey' }, // Initial Default
  { name: 'Nero Noctis', hex: '#141416', desc: 'Obsidian Black' },
  { name: 'Bianco Siderale', hex: '#F0F2F5', desc: 'Iridescent White' },
  { name: 'Viola Pasifae', hex: '#6B1782', desc: 'Iconic Purple' }
];

// --- CAMERA STAGE POSITIONS & TARGETS ---
const CAMERA_PRESETS = [
  // 0: Hero View (I2: Front facing left, horizontal side view looking from +X)
  {
    camPos: new THREE.Vector3(4.8, 0.85, 0.05),
    target: new THREE.Vector3(0, 0.45, 0.05),
    fov: 42
  },
  // 1: Feature 1 (Colours & Interior: Dynamic Front Quarter view)
  {
    camPos: new THREE.Vector3(3.6, 1.35, 2.8),
    target: new THREE.Vector3(0, 0.5, 0.4),
    fov: 44
  },
  // 2: Feature 2 (4WD & 4WS: Elevated view showcasing all 4 wheels & chassis)
  {
    camPos: new THREE.Vector3(3.7, 2.7, 2.2),
    target: new THREE.Vector3(0, 0.35, 0.2),
    fov: 45
  },
  // 3: Feature 3 (Speed & Performance: Aggressive rear quarter chase angle)
  {
    camPos: new THREE.Vector3(3.3, 0.95, -3.4),
    target: new THREE.Vector3(0, 0.55, -0.4),
    fov: 43
  },
  // 4: Section 4 (Cinematic Finale: Elegant studio showcase)
  {
    camPos: new THREE.Vector3(4.2, 1.2, 1.6),
    target: new THREE.Vector3(0, 0.45, 0.1),
    fov: 42
  }
];

// Cockpit Interior Preset
const COCKPIT_PRESET = {
  camPos: new THREE.Vector3(-0.35, 0.82, 0.08),
  target: new THREE.Vector3(-0.38, 0.72, 0.65),
  fov: 60
};

// --- GLOBAL APPLICATION STATE ---
const state = {
  activeSection: 0,
  scrollProgress: 0,
  isInteriorView: false,
  isOrbitMode: false,
  soundEnabled: false,
  steerAngle: 0, // In degrees (-30 to +30)
  autoSweep: false,
  autoSweepTime: 0,
  activeWheelId: null,
  activeColorIndex: 3, // Grigio Telesto default
  activeColorHex: '#9EABB3',
  isLaunching: false,
  launchSpeed: 0,
  wheelSpinSpeed: 0.08, // Base acceleration spin
  roadSpeed: 0.08,
  smokeIntensity: 1.0,
  carRoot: null,
  wheels: {
    fl: null, // Front-Left
    fr: null, // Front-Right
    rl: null, // Rear-Left
    rr: null  // Rear-Right
  },
  wheelColliders: [],
  drivetrainLines: null,
  pulseParticles: null,
  smokeSystem: null,
  groundGrid: null,
  audioEngine: null
};

// --- INITIALIZE THREE.JS SCENE ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070709);
scene.fog = new THREE.FogExp2(0x070709, 0.035);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.copy(CAMERA_PRESETS[0].camPos);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 + 0.02; // Don't go below ground
controls.minDistance = 1.2;
controls.maxDistance = 12.0;
controls.target.copy(CAMERA_PRESETS[0].target);
controls.enabled = false; // Disabled by default, toggled via UI button

// --- LIGHTING SETUP (Luxury Automotive Studio) ---
function setupLighting() {
  // Ambient Soft Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Main Key Directional Light (Overhead Studio Softbox)
  const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
  keyLight.position.set(5, 8, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 25;
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  // Rim / Edge Contour Light (Sharp Gold/Cyan Backlight for Countach wedge edges)
  const rimLight = new THREE.DirectionalLight(0xe5b80b, 1.8);
  rimLight.position.set(-6, 4, -5);
  scene.add(rimLight);

  // Front Fill Light
  const frontLight = new THREE.DirectionalLight(0xddeeff, 1.2);
  frontLight.position.set(0, 3, 7);
  scene.add(frontLight);

  // Under-Chassis Warm Glow
  const underGlow = new THREE.PointLight(0xe5b80b, 1.0, 6);
  underGlow.position.set(0, 0.15, 0);
  scene.add(underGlow);

  // Studio Ceiling Light Panel (Visual Mesh)
  const panelGeo = new THREE.PlaneGeometry(10, 4);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const ceilingPanel = new THREE.Mesh(panelGeo, panelMat);
  ceilingPanel.position.set(0, 6.5, 0);
  ceilingPanel.rotation.x = Math.PI / 2;
  scene.add(ceilingPanel);
}
setupLighting();

// --- GROUND & SPEED LINES (Asphalt / Studio Floor) ---
function setupGround() {
  // Infinite Ground Plane with shadow receiver
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x09090c,
    roughness: 0.8,
    metalness: 0.2
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Animated Speed Road Grid (Simulates forward acceleration)
  const gridHelper = new THREE.GridHelper(60, 60, 0xe5b80b, 0x1f1f28);
  gridHelper.position.y = 0.005;
  scene.add(gridHelper);
  state.groundGrid = gridHelper;
}
setupGround();

// --- PBR MATERIALS FOR COUNTACH MESHES ---
const textureLoader = new THREE.TextureLoader();

// Load available textures from 2021-lamborghini-countach-lpi-800-4/textures
const carbonAlbedo = textureLoader.load('2021-lamborghini-countach-lpi-800-4/textures/TexturesCom_Plastic_CarbonFiber_1K_albedo.png');
carbonAlbedo.wrapS = carbonAlbedo.wrapT = THREE.RepeatWrapping;
carbonAlbedo.repeat.set(4, 4);

const carbonNormal = textureLoader.load('2021-lamborghini-countach-lpi-800-4/textures/TexturesCom_Plastic_CarbonFiber_1K_normal.png');
carbonNormal.wrapS = carbonNormal.wrapT = THREE.RepeatWrapping;
carbonNormal.repeat.set(4, 4);

const carbonRoughness = textureLoader.load('2021-lamborghini-countach-lpi-800-4/textures/TexturesCom_Plastic_CarbonFiber_1K_roughne.png');
carbonRoughness.wrapS = carbonRoughness.wrapT = THREE.RepeatWrapping;
carbonRoughness.repeat.set(4, 4);

const tireTexture = textureLoader.load('2021-lamborghini-countach-lpi-800-4/textures/pzer2.jpeg');
const licenseTexture = textureLoader.load('2021-lamborghini-countach-lpi-800-4/textures/license_albedo.png');
const cockpitTexture = textureLoader.load('2021-lamborghini-countach-lpi-800-4/textures/ctiuamez5bo41.png');
const logoBadgeTexture = textureLoader.load('2021-lamborghini-countach-lpi-800-4/textures/Lamborghini-text-logo-1440x900.png');

// 1. Car Paint Physical Material (Clearcoat Luxury Finish)
const carPaintMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(state.activeColorHex),
  metalness: 0.85,
  roughness: 0.18,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  reflectivity: 1.0,
  envMapIntensity: 1.5
});

// 2. Carbon Fiber Material (Diffusers, side skirts, mirrors)
const carbonFiberMaterial = new THREE.MeshStandardMaterial({
  map: carbonAlbedo,
  normalMap: carbonNormal,
  roughnessMap: carbonRoughness,
  roughness: 0.45,
  metalness: 0.35
});

// 3. Tinted Automotive Glass Material
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x111115,
  metalness: 0.1,
  roughness: 0.04,
  transmission: 0.85,
  transparent: true,
  opacity: 0.4,
  ior: 1.52
});

// 4. Alloy Rims Material (Dark Titanium Bronze Finish)
const alloyRimMaterial = new THREE.MeshStandardMaterial({
  color: 0x3e3f44,
  metalness: 0.92,
  roughness: 0.22
});

// 5. Tire Rubber Material
const tireMaterial = new THREE.MeshStandardMaterial({
  map: tireTexture,
  color: 0x222224,
  roughness: 0.88,
  metalness: 0.08
});

// 6. Glowing LED Headlights
const headlightMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: new THREE.Color(0xeef6ff),
  emissiveIntensity: 3.2,
  roughness: 0.1,
  metalness: 0.2
});

// 7. Glowing Taillights (Countach signature hexagons)
const taillightMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0020,
  emissive: new THREE.Color(0xff0015),
  emissiveIntensity: 3.5,
  roughness: 0.15,
  metalness: 0.1
});

// 8. Racing Yellow Brake Calipers
const caliperMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2ca3a,
  roughness: 0.3,
  metalness: 0.4
});

// 9. Carbon-Ceramic Drilled Brake Rotor Disc
const brakeDiscMaterial = new THREE.MeshStandardMaterial({
  color: 0x999999,
  roughness: 0.28,
  metalness: 0.92
});

// 10. Cockpit Dashboard Screen Material
const dashboardMaterial = new THREE.MeshBasicMaterial({
  map: cockpitTexture
});

// 11. License Plate Material
const licenseMaterial = new THREE.MeshStandardMaterial({
  map: licenseTexture,
  roughness: 0.5,
  metalness: 0.1
});

// 12. Matte Black Chassis Trim & Grilles
const blackTrimMaterial = new THREE.MeshStandardMaterial({
  color: 0x16161a,
  roughness: 0.7,
  metalness: 0.3
});

// 13. Interior Leather (Rosso & Nero Italian upholstery)
const leatherMaterial = new THREE.MeshStandardMaterial({
  color: 0x1f1a18,
  roughness: 0.65,
  metalness: 0.1
});

// 14. Lamborghini Logo Badge Material
const logoBadgeMaterial = new THREE.MeshStandardMaterial({
  map: logoBadgeTexture,
  transparent: true,
  roughness: 0.2,
  metalness: 0.8
});

// --- REAR TIRE SMOKE PARTICLE SYSTEM (I2 & Acceleration Demo) ---
function setupSmokeTrail() {
  const particleCount = 220;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);
  const alphas = new Float32Array(particleCount);
  const velocities = [];

  // Procedural feather-edge smoke sprite texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(235, 235, 240, 0.8)');
  gradient.addColorStop(0.4, 'rgba(210, 210, 220, 0.4)');
  gradient.addColorStop(0.8, 'rgba(160, 160, 170, 0.1)');
  gradient.addColorStop(1, 'rgba(140, 140, 150, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const smokeTexture = new THREE.CanvasTexture(canvas);

  // Rear tires are at Z ≈ -1.25, X ≈ ±0.91, Y ≈ 0.12 in centered coordinates
  for (let i = 0; i < particleCount; i++) {
    const isRight = Math.random() > 0.5;
    const originX = isRight ? 0.91 : -0.91;
    positions[i * 3 + 0] = originX + (Math.random() - 0.5) * 0.2;
    positions[i * 3 + 1] = 0.08 + Math.random() * 0.15;
    positions[i * 3 + 2] = -1.25 + (Math.random() - 0.5) * 0.3;

    scales[i] = 0.3 + Math.random() * 0.5;
    alphas[i] = Math.random() * 0.7;

    velocities.push({
      vx: (Math.random() - 0.5) * 0.015,
      vy: 0.008 + Math.random() * 0.015,
      // Drifts backwards in -Z (towards screen right in side view!)
      vz: -0.04 - Math.random() * 0.05,
      life: Math.random(),
      isRight: isRight
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.PointsMaterial({
    size: 1.2,
    map: smokeTexture,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  state.smokeSystem = {
    points,
    geometry,
    velocities,
    count: particleCount
  };
}
setupSmokeTrail();

function updateSmokeParticles(delta) {
  if (!state.smokeSystem) return;
  const pos = state.smokeSystem.geometry.attributes.position.array;
  const vel = state.smokeSystem.velocities;
  const count = state.smokeSystem.count;
  const intensity = state.smokeIntensity;

  for (let i = 0; i < count; i++) {
    vel[i].life += delta * 0.9 * intensity;

    pos[i * 3 + 0] += vel[i].vx * (1 + intensity * 0.5);
    pos[i * 3 + 1] += vel[i].vy * (1 + intensity * 0.5);
    pos[i * 3 + 2] += vel[i].vz * (1 + intensity);

    if (vel[i].life >= 1.0) {
      vel[i].life = 0;
      const originX = vel[i].isRight ? 0.91 : -0.91;
      pos[i * 3 + 0] = originX + (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 1] = 0.08 + Math.random() * 0.15;
      pos[i * 3 + 2] = -1.25 + (Math.random() - 0.5) * 0.3;
    }
  }

  state.smokeSystem.geometry.attributes.position.needsUpdate = true;
}

// --- 4-WHEEL DRIVE & 4-WHEEL STEERING 3D CONNECTING LINES (I4) ---
function setupDrivetrainLines() {
  const lineGroup = new THREE.Group();
  lineGroup.name = 'drivetrainLinesGroup';

  // Wheel Hub Anchor Centers (Centered space)
  // Front Right: (+0.90, 0.37, +1.57)
  // Front Left:  (-0.90, 0.37, +1.57)
  // Rear Right:  (+0.91, 0.35, -1.25)
  // Rear Left:   (-0.91, 0.35, -1.25)
  // Center Diff: (0, 0.36, 0.16)

  // Glowing Neon Gold Material
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xe5b80b,
    linewidth: 3,
    transparent: true,
    opacity: 0.9
  });

  // Line segments:
  // 1. FL <-> FR (Front Axle)
  // 2. RL <-> RR (Rear Axle)
  // 3. Front Center <-> Rear Center (Central Driveshaft)
  // 4. FL <-> Center, FR <-> Center, RL <-> Center, RR <-> Center (Torque Vectoring X-Drive)
  const linePositions = new Float32Array(14 * 3); // 7 segments * 2 points * 3 coords
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

  const lines = new THREE.LineSegments(lineGeo, lineMaterial);
  lineGroup.add(lines);

  // Animated Energy Particles traveling along 4WD drivetrain
  const pCount = 36;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xffe680,
    size: 0.12,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });
  const energyPoints = new THREE.Points(pGeo, pMat);
  lineGroup.add(energyPoints);

  lineGroup.visible = false; // Becomes visible in Section 2 (4WD & 4WS)
  scene.add(lineGroup);

  state.drivetrainLines = {
    group: lineGroup,
    geometry: lineGeo,
    pointsGeometry: pGeo,
    particleT: new Float32Array(pCount)
  };

  for (let i = 0; i < pCount; i++) {
    state.drivetrainLines.particleT[i] = i / pCount;
  }
}
setupDrivetrainLines();

function updateDrivetrainLines(time) {
  if (!state.drivetrainLines || !state.drivetrainLines.group.visible) return;

  // Retrieve live hub positions
  const flPos = new THREE.Vector3(-0.90, 0.37, 1.57);
  const frPos = new THREE.Vector3(0.90, 0.37, 1.57);
  const rlPos = new THREE.Vector3(-0.91, 0.35, -1.25);
  const rrPos = new THREE.Vector3(0.91, 0.35, -1.25);

  if (state.wheels.fl) state.wheels.fl.steerPivot.getWorldPosition(flPos);
  if (state.wheels.fr) state.wheels.fr.steerPivot.getWorldPosition(frPos);
  if (state.wheels.rl) state.wheels.rl.steerPivot.getWorldPosition(rlPos);
  if (state.wheels.rr) state.wheels.rr.steerPivot.getWorldPosition(rrPos);

  const frontCenter = new THREE.Vector3().addVectors(flPos, frPos).multiplyScalar(0.5);
  const rearCenter = new THREE.Vector3().addVectors(rlPos, rrPos).multiplyScalar(0.5);
  const centerDiff = new THREE.Vector3().addVectors(frontCenter, rearCenter).multiplyScalar(0.5);

  const posArr = state.drivetrainLines.geometry.attributes.position.array;
  let idx = 0;

  function addSegment(p1, p2) {
    posArr[idx++] = p1.x; posArr[idx++] = p1.y; posArr[idx++] = p1.z;
    posArr[idx++] = p2.x; posArr[idx++] = p2.y; posArr[idx++] = p2.z;
  }

  // 1. Front Axle
  addSegment(flPos, frPos);
  // 2. Rear Axle
  addSegment(rlPos, rrPos);
  // 3. Central Driveshaft
  addSegment(frontCenter, rearCenter);
  // 4. Torque Vectoring Links to Center
  addSegment(flPos, centerDiff);
  addSegment(frPos, centerDiff);
  addSegment(rlPos, centerDiff);
  addSegment(rrPos, centerDiff);

  state.drivetrainLines.geometry.attributes.position.needsUpdate = true;

  // Update Energy Pulses along driveshaft and axles
  const pArr = state.drivetrainLines.pointsGeometry.attributes.position.array;
  const pT = state.drivetrainLines.particleT;
  for (let i = 0; i < pT.length; i++) {
    pT[i] = (pT[i] + 0.015) % 1.0;
    const t = pT[i];
    let pt;
    if (i % 3 === 0) {
      // Flowing from center along front axle
      pt = new THREE.Vector3().lerpVectors(centerDiff, (i % 2 === 0 ? flPos : frPos), t);
    } else if (i % 3 === 1) {
      // Flowing from center along rear axle
      pt = new THREE.Vector3().lerpVectors(centerDiff, (i % 2 === 0 ? rlPos : rrPos), t);
    } else {
      // Flowing along central shaft
      pt = new THREE.Vector3().lerpVectors(rearCenter, frontCenter, t);
    }
    pArr[i * 3 + 0] = pt.x;
    pArr[i * 3 + 1] = pt.y;
    pArr[i * 3 + 2] = pt.z;
  }
  state.drivetrainLines.pointsGeometry.attributes.position.needsUpdate = true;
}

// --- CLICKABLE WHEEL COLLIDERS (I4) ---
function setupWheelColliders() {
  const wheelDefs = [
    { id: 'FL', name: 'Front-Left Wheel', pos: new THREE.Vector3(-0.90, 0.37, 1.57) },
    { id: 'FR', name: 'Front-Right Wheel', pos: new THREE.Vector3(0.90, 0.37, 1.57) },
    { id: 'RL', name: 'Rear-Left Wheel', pos: new THREE.Vector3(-0.91, 0.35, -1.25) },
    { id: 'RR', name: 'Rear-Right Wheel', pos: new THREE.Vector3(0.91, 0.35, -1.25) }
  ];

  const colGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
  colGeo.rotateZ(Math.PI / 2);
  const colMat = new THREE.MeshBasicMaterial({
    color: 0xe5b80b,
    transparent: true,
    opacity: 0.0,
    wireframe: true
  });

  wheelDefs.forEach(def => {
    const mesh = new THREE.Mesh(colGeo, colMat.clone());
    mesh.position.copy(def.pos);
    mesh.userData = { isWheelCollider: true, wheelId: def.id, name: def.name };
    scene.add(mesh);
    state.wheelColliders.push(mesh);
  });
}
setupWheelColliders();

// --- OBJ MODEL LOADING & PREPARATION ---
function loadCountachModel() {
  const loaderBar = document.getElementById('loader-bar');
  const loaderPct = document.getElementById('loader-pct');
  const loaderStatus = document.getElementById('loader-status');
  const loadingScreen = document.getElementById('loading-screen');

  const objLoader = new OBJLoader();

  objLoader.load(
    '2021-lamborghini-countach-lpi-800-4/source/countach.obj',
    (object) => {
      loaderStatus.textContent = 'APPLYING BESPOKE ITALIAN FINISHES & CHASSIS GEOMETRY...';
      loaderBar.style.width = '100%';
      loaderPct.textContent = '100%';

      // 1. Center & Scale the Car
      // Raw offsets: X center ≈ -2.13, Y min ≈ -1.21, Z center ≈ -0.23
      const carGroup = new THREE.Group();
      carGroup.name = 'LamborghiniCountachLPI800_4';

      // Transform raw vertices into centered, real-world 1:1 scale (scale 0.5)
      // Car dimensions: ~4.9m length, 2.4m width, 1.14m height
      object.position.set(2.13, 1.21, 0.23);
      object.scale.set(0.5, 0.5, 0.5);
      carGroup.add(object);

      // 2. Identify Wheel Meshes to create Steer & Spin Pivots
      // Front Right: TIRE1.003, Circle.004, Cube.039
      // Front Left:  TIRE1.004, Circle.005, Cube.040
      // Rear Right:  TIRE1.001, Circle.006
      // Rear Left:   Circle.003, Circle.007
      const frNames = ['TIRE1.003', 'Circle.004', 'Cube.039'];
      const flNames = ['TIRE1.004', 'Circle.005', 'Cube.040'];
      const rrNames = ['TIRE1.001', 'Circle.006'];
      const rlNames = ['Circle.003', 'Circle.007'];

      const frMeshes = [], flMeshes = [], rrMeshes = [], rlMeshes = [];

      // 3. Traverse and Assign High Quality PBR Materials
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const mName = child.name;
          if (frNames.includes(mName)) frMeshes.push(child);
          else if (flNames.includes(mName)) flMeshes.push(child);
          else if (rrNames.includes(mName)) rrMeshes.push(child);
          else if (rlNames.includes(mName)) rlMeshes.push(child);

          // Assign Materials based on material.name or geometry group names
          applyMaterialToMesh(child);
        }
      });

      // 4. Create Pivot Groups for Wheels
      state.wheels.fr = createWheelRig(carGroup, frMeshes, new THREE.Vector3(0.90, 0.37, 1.57), 'FR');
      state.wheels.fl = createWheelRig(carGroup, flMeshes, new THREE.Vector3(-0.90, 0.37, 1.57), 'FL');
      state.wheels.rr = createWheelRig(carGroup, rrMeshes, new THREE.Vector3(0.91, 0.35, -1.25), 'RR');
      state.wheels.rl = createWheelRig(carGroup, rlMeshes, new THREE.Vector3(-0.91, 0.35, -1.25), 'RL');

      scene.add(carGroup);
      state.carRoot = carGroup;

      // Finish Loading Screen Transition
      setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        playSynthSound('engineStart');
      }, 600);
    },
    (xhr) => {
      if (xhr.lengthComputable) {
        const pct = Math.round((xhr.loaded / xhr.total) * 95);
        loaderBar.style.width = pct + '%';
        loaderPct.textContent = pct + '%';
      }
    },
    (error) => {
      console.error('Error loading Countach OBJ:', error);
      loaderStatus.textContent = 'ERROR LOADING MODEL — CHECKING ASSETS...';
    }
  );
}

function applyMaterialToMesh(mesh) {
  const assignMat = (mat) => {
    const name = mat.name || '';
    if (name === 'Material.012') {
      return carPaintMaterial; // Exterior Car Body Paint
    } else if (name === 'Material.002') {
      return carbonFiberMaterial; // Carbon Fiber diffusers & trims
    } else if (name === 'Material.004' || name === 'Material.007') {
      return glassMaterial; // Windshield & windows
    } else if (name === 'Material.025') {
      return tireMaterial; // Tire treads
    } else if (name === 'Material.011') {
      return alloyRimMaterial; // Alloy Wheel Rims
    } else if (name === 'Material.008' || name === 'Material.005') {
      return taillightMaterial; // Red Taillights
    } else if (name === 'Material.009' || name === 'Material.010') {
      return headlightMaterial; // Front LED Headlights
    } else if (name === 'Material.042') {
      return caliperMaterial; // Yellow Brake Calipers
    } else if (name === 'Material.020') {
      return brakeDiscMaterial; // Brake Disc Rotors
    } else if (name === 'Material.029') {
      return licenseMaterial; // License Plates
    } else if (name === 'Material.017') {
      return leatherMaterial; // Cockpit Leather
    } else if (name === 'Material.018') {
      return dashboardMaterial; // Interior Dash Screen
    } else if (name.includes('Lamborghini-text-logo')) {
      return logoBadgeMaterial; // Wordmark Logo
    } else {
      return blackTrimMaterial; // Grilles & chassis trim
    }
  };

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(m => assignMat(m));
  } else if (mesh.material) {
    mesh.material = assignMat(mesh.material);
  }
}

function createWheelRig(parent, meshList, centerWorld, id) {
  // steerPivot handles steering around Y axis
  const steerPivot = new THREE.Group();
  steerPivot.position.copy(centerWorld);
  parent.add(steerPivot);

  // spinGroup handles wheel rotation around X axis as car moves
  const spinGroup = new THREE.Group();
  steerPivot.add(spinGroup);

  meshList.forEach(mesh => {
    // Re-parent mesh into spinGroup while maintaining world geometry
    mesh.parent.remove(mesh);
    // Offset mesh position relative to wheel hub center
    mesh.position.sub(centerWorld);
    spinGroup.add(mesh);
  });

  return { steerPivot, spinGroup, centerWorld, id };
}

loadCountachModel();

// --- SOUND SYSTEM (Client-Side Web Audio API Synthesizer) ---
class SupercarAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.isMuted = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // V12 Idle Engine Synth (Twin detuned saw oscillators through resonant filter)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'triangle';
      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime); // V12 low rumble
      this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not allowed or supported yet:', e);
    }
  }

  toggleSound() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.65, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  setEngineRPM(rpmNormalized) {
    if (!this.initialized || this.isMuted) return;
    const baseFreq = 42 + rpmNormalized * 180;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.0, this.ctx.currentTime, 0.08);
    this.engineFilter.frequency.setTargetAtTime(220 + rpmNormalized * 1400, this.ctx.currentTime, 0.08);
  }

  playBeep() {
    if (!this.initialized || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playKeyChime() {
    if (!this.initialized || this.isMuted) return;
    // Luxury chord fanfare: D6, F#6, A6, D7
    const freqs = [1174.66, 1479.98, 1760.0, 2349.32];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.07);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.07 + 0.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime + i * 0.07);
      osc.stop(this.ctx.currentTime + i * 0.07 + 0.8);
    });
  }
}

state.audioEngine = new SupercarAudioEngine();

function playSynthSound(type) {
  if (type === 'beep') state.audioEngine.playBeep();
  else if (type === 'keyChime') state.audioEngine.playKeyChime();
}

// --- COLOR TRANSITION ENGINE (I3: Red -> Orange -> Blue -> Silver -> Black -> White -> Purple) ---
function updateColorFromScroll(sectionProgress) {
  // Maps 0.0 to 1.0 across the 7 colors in sequence
  const numColors = COLOR_OPTIONS.length;
  const scaledT = Math.max(0, Math.min(1, sectionProgress)) * (numColors - 1);
  const idx1 = Math.floor(scaledT);
  const idx2 = Math.min(numColors - 1, idx1 + 1);
  const factor = scaledT - idx1;

  const col1 = new THREE.Color(COLOR_OPTIONS[idx1].hex);
  const col2 = new THREE.Color(COLOR_OPTIONS[idx2].hex);
  const interpolated = new THREE.Color().lerpColors(col1, col2, factor);

  carPaintMaterial.color.copy(interpolated);

  // Update UI swatch highlights
  const activeIdx = Math.round(scaledT);
  updateActiveColorUI(activeIdx, interpolated.getHexString());
}

function updateActiveColorUI(index, currentHexStr) {
  state.activeColorIndex = index;
  state.activeColorHex = COLOR_OPTIONS[index].hex;

  const swatches = document.querySelectorAll('.color-chip');
  swatches.forEach((chip, i) => {
    chip.classList.toggle('active', i === index);
  });

  const nameEl = document.getElementById('current-color-name');
  if (nameEl) nameEl.textContent = `${COLOR_OPTIONS[index].name} (${COLOR_OPTIONS[index].desc})`;

  // Update Digital Key Fob Card specs
  const fobColor = document.getElementById('fob-color-spec');
  if (fobColor) fobColor.textContent = COLOR_OPTIONS[index].name.toUpperCase();
}

// --- 4-WHEEL STEERING LOGIC (I4: Move Left and Right) ---
function setSteeringAngle(angleDeg) {
  state.steerAngle = Math.max(-30, Math.min(30, angleDeg));

  // Front wheels steer by angleDeg
  const frontRad = THREE.MathUtils.degToRad(-state.steerAngle);
  // Rear wheels counter-steer at low speeds for tighter turn radius (±3.2°)
  const rearRad = THREE.MathUtils.degToRad(state.steerAngle * 0.12);

  if (state.wheels.fl) state.wheels.fl.steerPivot.rotation.y = frontRad;
  if (state.wheels.fr) state.wheels.fr.steerPivot.rotation.y = frontRad;
  if (state.wheels.rl) state.wheels.rl.steerPivot.rotation.y = rearRad;
  if (state.wheels.rr) state.wheels.rr.steerPivot.rotation.y = rearRad;

  // Update UI display
  const disp = document.getElementById('steer-angle-display');
  if (disp) {
    const dir = state.steerAngle > 0 ? 'RIGHT' : (state.steerAngle < 0 ? 'LEFT' : 'STRAIGHT');
    disp.textContent = `${Math.abs(state.steerAngle).toFixed(1)}° ${dir}`;
  }

  const slider = document.getElementById('steer-slider');
  if (slider && Number(slider.value) !== Math.round(state.steerAngle)) {
    slider.value = Math.round(state.steerAngle);
  }
}

// --- RAYCASTER FOR CLICKABLE WHEELS (I4) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (e) => {
  // Only detect wheel clicks when in section 2 (Steering) or when not clicking UI panels
  if (e.target.closest('.section-content') || e.target.closest('.site-header') || e.target.closest('.modal-card')) {
    return;
  }

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(state.wheelColliders, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    if (hit.userData.isWheelCollider) {
      selectWheel(hit.userData.wheelId);
      playSynthSound('beep');
    }
  }
});

function selectWheel(wheelId) {
  state.activeWheelId = wheelId;
  const wheelData = {
    'FL': {
      title: 'FRONT-LEFT ACTIVE STEERING ASSEMBLY',
      steer: 'Electronic Power Rack (±30° Range)',
      torque: '40% Regenerative Front AWD Bias',
      tires: 'Pirelli P-Zero Corsa 255/30 ZR20',
      status: 'High Agility & Dynamic Turn-In Ready'
    },
    'FR': {
      title: 'FRONT-RIGHT ACTIVE STEERING ASSEMBLY',
      steer: 'Electronic Power Rack (±30° Range)',
      torque: '40% Regenerative Front AWD Bias',
      tires: 'Pirelli P-Zero Corsa 255/30 ZR20',
      status: 'Active Dynamic Toe & Camber Vectoring'
    },
    'RL': {
      title: 'REAR-LEFT 4WS ACTUATOR & DIFFERENTIAL',
      steer: 'Mechatronic Rear Axle Actuator (±3.2°)',
      torque: '60% V12 Mechanical Differential Bias',
      tires: 'Pirelli P-Zero Corsa 355/25 ZR21',
      status: 'Counter-Phase Agile Low-Speed Rotation'
    },
    'RR': {
      title: 'REAR-RIGHT 4WS ACTUATOR & DIFFERENTIAL',
      steer: 'Mechatronic Rear Axle Actuator (±3.2°)',
      torque: '60% V12 Mechanical Differential Bias',
      tires: 'Pirelli P-Zero Corsa 355/25 ZR21',
      status: 'In-Phase High-Velocity Stability Lock'
    }
  };

  const data = wheelData[wheelId];
  if (!data) return;

  const badgeEl = document.getElementById('telem-wheel-id');
  const titleEl = document.getElementById('telem-wheel-title');
  const steerEl = document.getElementById('telem-steer-type');
  const torqueEl = document.getElementById('telem-torque-split');
  const tireEl = document.getElementById('telem-tire-spec');
  const statusEl = document.getElementById('telem-status');

  if (badgeEl) badgeEl.textContent = wheelId;
  if (titleEl) titleEl.textContent = data.title;
  if (steerEl) steerEl.textContent = data.steer;
  if (torqueEl) torqueEl.textContent = data.torque;
  if (tireEl) tireEl.textContent = data.tires;
  if (statusEl) statusEl.textContent = data.status;

  // Highlight button
  document.querySelectorAll('.wh-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.wheel === wheelId);
  });
}

// --- LAUNCH ACCELERATION SIMULATOR (I5: 0-60 in 2.8s & Max Speed 221 MPH) ---
function triggerLaunchControl() {
  if (state.isLaunching) return;
  state.isLaunching = true;

  const btn = document.getElementById('btn-launch-demo');
  const speedoNum = document.getElementById('speedo-num');
  const needle = document.getElementById('speedo-needle');
  const tachVal = document.getElementById('tach-val');
  const gearVal = document.getElementById('gear-val');
  const smokeVal = document.getElementById('smoke-val');

  btn.style.pointerEvents = 'none';
  btn.querySelector('.launch-btn-text').textContent = 'LAUNCH CONTROL ACTIVE — BUILDING BOOST...';

  // Audio building up
  if (state.audioEngine) state.audioEngine.setEngineRPM(0.75);

  let stage = 0; // 0: staging, 1: launch 0-60, 2: rush to 221
  let startTime = performance.now();

  const launchAnim = (now) => {
    const elapsed = (now - startTime) / 1000;

    if (stage === 0) {
      // 0.8s pre-stage rev limiter
      tachVal.textContent = '4,500 RPM (TWO-STEP LAUNCH)';
      smokeVal.textContent = 'PRE-HEATING TIRES';
      state.smokeIntensity = 2.0;

      if (elapsed >= 0.8) {
        stage = 1;
        startTime = now;
        btn.querySelector('.launch-btn-text').textContent = 'MAXIMUM HYBRID TORQUE RELEASED!';
      }
    } else if (stage === 1) {
      // 0 to 60 mph in 2.8 seconds!
      const t = Math.min(1.0, elapsed / 2.8);
      const currentMph = Math.round(t * 60);
      speedoNum.textContent = currentMph;

      // Needle sweeps from -135deg (0mph) to -45deg (60mph)
      const deg = -135 + (currentMph / 240) * 270;
      needle.style.transform = `rotate(${deg}deg)`;

      gearVal.textContent = currentMph < 42 ? '1ST GEAR' : '2ND GEAR';
      tachVal.textContent = `${Math.round(4500 + t * 4000)} RPM`;
      smokeVal.textContent = 'HEAVY BURNOUT TRAIL (BURNING RUBBER)';

      // High spin, intense smoke, car suspension squat
      state.wheelSpinSpeed = 0.35;
      state.roadSpeed = 0.35;
      state.smokeIntensity = 3.5;
      if (state.carRoot) state.carRoot.position.y = -0.02; // Anti-squat

      if (state.audioEngine) state.audioEngine.setEngineRPM(0.5 + t * 0.5);

      if (t >= 1.0) {
        stage = 2;
        startTime = now;
      }
    } else if (stage === 2) {
      // Rush from 60 to 221 MPH
      const t = Math.min(1.0, elapsed / 2.4);
      const currentMph = Math.round(60 + t * (221 - 60));
      speedoNum.textContent = currentMph;

      const deg = -135 + (currentMph / 240) * 270;
      needle.style.transform = `rotate(${deg}deg)`;

      const gearNum = Math.min(7, 2 + Math.floor(t * 5));
      gearVal.textContent = `${gearNum}TH GEAR (ISR)`;
      tachVal.textContent = '8,500 RPM (REDLINE)';
      smokeVal.textContent = 'HIGH-SPEED DOWNFORCE STABILIZED';

      state.wheelSpinSpeed = 0.65;
      state.roadSpeed = 0.65;
      state.smokeIntensity = 1.8;

      if (t >= 1.0) {
        // Complete!
        btn.querySelector('.launch-btn-text').textContent = 'LAUNCH TEST COMPLETE: 0-60 IN 2.8s | 221 MPH REACHED';
        setTimeout(() => {
          // Return to normal cruising
          state.isLaunching = false;
          state.wheelSpinSpeed = 0.08;
          state.roadSpeed = 0.08;
          state.smokeIntensity = 1.0;
          if (state.carRoot) state.carRoot.position.y = 0.0;
          if (state.audioEngine) state.audioEngine.setEngineRPM(0.0);
          btn.style.pointerEvents = 'auto';
          btn.querySelector('.launch-btn-text').textContent = 'TRIGGER LAUNCH CONTROL (0-60 MPH TEST)';
          smokeVal.textContent = 'STANDBY';
          tachVal.textContent = '850 RPM (IDLE)';
          gearVal.textContent = '1ST GEAR';
          needle.style.transform = `rotate(-135deg)`;
          speedoNum.textContent = '0';
        }, 3500);
        return;
      }
    }

    requestAnimationFrame(launchAnim);
  };

  requestAnimationFrame(launchAnim);
}

// --- GOLDEN CONFETTI SYSTEM FOR CELEBRATION MODAL ---
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const count = 90;
  const particles = [];
  const colors = ['#E5B80B', '#F8D348', '#FFFFFF', '#D4AF37', '#FF5E00'];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height * 0.35 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 8 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let animId;
  const renderConfetti = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.rotation += p.rotSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (active) animId = requestAnimationFrame(renderConfetti);
  };

  renderConfetti();
}

// --- SCROLL OBSERVER & SECTION DETECTION ---
function setupScrollSystem() {
  const sections = document.querySelectorAll('.story-section');
  const navItems = document.querySelectorAll('.nav-item');
  const hudText = document.getElementById('hud-text');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const windowH = window.innerHeight;

    sections.forEach((sec, idx) => {
      const rect = sec.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (windowH - rect.top) / (rect.height + windowH)));

      if (rect.top <= windowH * 0.5 && rect.bottom >= windowH * 0.5) {
        if (state.activeSection !== idx) {
          state.activeSection = idx;

          // Update active navigation tab
          navItems.forEach(n => {
            n.classList.toggle('active', parseInt(n.dataset.section) === idx);
          });

          // HUD indicator text
          const hudLabels = [
            'LAUNCH PROFILE | HORIZONTAL SIDE VIEW (ACCELERATING)',
            'FEATURE 01 | CRAFTSMANSHIP & 7 DYNAMIC EXTERIOR HUES',
            'FEATURE 02 | 4WD & 4-WHEEL ACTIVE STEERING CHASSIS',
            'FEATURE 03 | HYBRID VELOCITY & 0-60 LAUNCH CONTROL',
            'CINEMATIC FINALE | EXCLUSIVE 1 OF 112 ALLOCATION'
          ];
          if (hudText) hudText.textContent = hudLabels[idx] || '';

          // Toggle Drivetrain Lines visibility in Section 2 (4WD & 4WS)
          if (state.drivetrainLines) {
            state.drivetrainLines.group.visible = (idx === 2);
          }
        }

        // Section 1: Dynamic Exterior Color Morph on Scroll (I3 requirement)
        if (idx === 1 && !state.isInteriorView) {
          const sec1Progress = Math.max(0, Math.min(1, -rect.top / (rect.height - windowH * 0.8)));
          updateColorFromScroll(sec1Progress);
        }
      }
    });
  }, { passive: true });
}
setupScrollSystem();

// --- EVENT HANDLERS & DOM BINDINGS ---
function setupUIListeners() {
  // 1. Audio Toggle Button
  const audioBtn = document.getElementById('audio-toggle');
  const audioIcon = document.getElementById('audio-icon');
  const audioText = document.getElementById('audio-text');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isSoundOn = state.audioEngine.toggleSound();
      audioIcon.textContent = isSoundOn ? '🔊' : '🔇';
      audioText.textContent = isSoundOn ? 'SOUND ON' : 'SOUND OFF';
      audioBtn.classList.toggle('active', isSoundOn);
      if (isSoundOn) playSynthSound('beep');
    });
  }

  // 2. 360° Free Orbit Camera Toggle
  const orbitBtn = document.getElementById('orbit-toggle');
  const orbitText = document.getElementById('orbit-text');
  if (orbitBtn) {
    orbitBtn.addEventListener('click', () => {
      state.isOrbitMode = !state.isOrbitMode;
      controls.enabled = state.isOrbitMode;
      orbitBtn.classList.toggle('active', state.isOrbitMode);
      orbitText.textContent = state.isOrbitMode ? 'LOCK CAMERA' : '360° ORBIT';
      playSynthSound('beep');
    });
  }

  // 3. Color Chips Click (I3)
  const chips = document.querySelectorAll('.color-chip');
  chips.forEach((chip, i) => {
    chip.addEventListener('click', () => {
      const hex = chip.dataset.color;
      carPaintMaterial.color.set(hex);
      updateActiveColorUI(i, hex);
      playSynthSound('beep');
    });
  });

  // 4. Interior Cockpit Toggle (I3)
  const interiorBtn = document.getElementById('interior-toggle-btn');
  const interiorText = document.getElementById('interior-btn-text');
  if (interiorBtn) {
    interiorBtn.addEventListener('click', () => {
      state.isInteriorView = !state.isInteriorView;
      interiorBtn.classList.toggle('active', state.isInteriorView);
      interiorText.textContent = state.isInteriorView ? 'RETURN TO EXTERIOR' : 'INSPECT COCKPIT INTERIOR';
      playSynthSound('beep');
    });
  }

  // 5. Steering Slider & Buttons (I4)
  const steerSlider = document.getElementById('steer-slider');
  if (steerSlider) {
    steerSlider.addEventListener('input', (e) => {
      state.autoSweep = false;
      document.getElementById('btn-steer-auto')?.classList.remove('active');
      setSteeringAngle(parseFloat(e.target.value));
    });
  }

  document.getElementById('btn-steer-left')?.addEventListener('click', () => {
    state.autoSweep = false;
    document.getElementById('btn-steer-auto')?.classList.remove('active');
    setSteeringAngle(-25);
    playSynthSound('beep');
  });

  document.getElementById('btn-steer-center')?.addEventListener('click', () => {
    state.autoSweep = false;
    document.getElementById('btn-steer-auto')?.classList.remove('active');
    setSteeringAngle(0);
    playSynthSound('beep');
  });

  document.getElementById('btn-steer-right')?.addEventListener('click', () => {
    state.autoSweep = false;
    document.getElementById('btn-steer-auto')?.classList.remove('active');
    setSteeringAngle(25);
    playSynthSound('beep');
  });

  document.getElementById('btn-steer-auto')?.addEventListener('click', function() {
    state.autoSweep = !state.autoSweep;
    this.classList.toggle('active', state.autoSweep);
    playSynthSound('beep');
  });

  // Wheel Selector Buttons (I4)
  document.querySelectorAll('.wh-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectWheel(btn.dataset.wheel);
      playSynthSound('beep');
    });
  });

  // 6. Launch Control Demo Trigger (I5)
  document.getElementById('btn-launch-demo')?.addEventListener('click', () => {
    triggerLaunchControl();
  });

  // 7. Call To Action & Celebration Modal (I6 & O4)
  const keyModal = document.getElementById('key-modal');
  const openModal = () => {
    if (keyModal) {
      keyModal.classList.add('open');
      keyModal.setAttribute('aria-hidden', 'false');
      launchConfetti();
      playSynthSound('keyChime');
    }
  };

  document.getElementById('claim-gold-btn')?.addEventListener('click', openModal);
  document.getElementById('quick-claim-btn')?.addEventListener('click', openModal);

  document.getElementById('modal-close-btn')?.addEventListener('click', () => {
    keyModal?.classList.remove('open');
    keyModal?.setAttribute('aria-hidden', 'true');
  });

  // Close modal on background overlay click
  keyModal?.addEventListener('click', (e) => {
    if (e.target === keyModal) {
      keyModal.classList.remove('open');
      keyModal.setAttribute('aria-hidden', 'true');
    }
  });

  // Owner Name Engraving
  const ownerInput = document.getElementById('owner-input');
  const fobOwner = document.getElementById('fob-owner-name');
  const updateNameBtn = document.getElementById('btn-update-name');

  const applyOwnerName = () => {
    const val = ownerInput.value.trim() || 'DISTINGUISHED COLLECTOR';
    if (fobOwner) fobOwner.textContent = val.toUpperCase();
    playSynthSound('beep');
  };

  updateNameBtn?.addEventListener('click', applyOwnerName);
  ownerInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') applyOwnerName();
  });

  // Download Certificate
  document.getElementById('btn-download-pass')?.addEventListener('click', () => {
    alert(`AUTOMOBILI LAMBORGHINI ALLOCATION PASS CONFIRMED\n\nChassis: #042 / 112\nCommissioned For: ${ownerInput.value.toUpperCase()}\nLivery: ${COLOR_OPTIONS[state.activeColorIndex].name.toUpperCase()}\n\nYour official documentation has been authorized by Sant'Agata Bolognese.`);
    playSynthSound('beep');
  });

  // Copy VIP Token
  const copyBtn = document.getElementById('btn-copy-code');
  const copyText = document.getElementById('copy-btn-text');
  copyBtn?.addEventListener('click', () => {
    navigator.clipboard?.writeText('LPI800-042-LAMBO-112');
    if (copyText) copyText.textContent = 'COPIED TO CLIPBOARD!';
    playSynthSound('beep');
    setTimeout(() => {
      if (copyText) copyText.textContent = 'COPY VIP CODE: LPI800-042';
    }, 2500);
  });
}
setupUIListeners();

// --- ANIMATION LOOP & CAMERA INTERPOLATION ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // 1. Auto-Sweep Steering Mode (I4)
  if (state.autoSweep) {
    state.autoSweepTime += delta * 1.5;
    const sweepAngle = Math.sin(state.autoSweepTime) * 26;
    setSteeringAngle(sweepAngle);
  }

  // 2. Wheel Rotation & Ground Movement (Simulates continuous drive / acceleration)
  const spinDelta = state.wheelSpinSpeed;
  if (state.wheels.fl) state.wheels.fl.spinGroup.rotation.x += spinDelta;
  if (state.wheels.fr) state.wheels.fr.spinGroup.rotation.x += spinDelta;
  if (state.wheels.rl) state.wheels.rl.spinGroup.rotation.x += spinDelta;
  if (state.wheels.rr) state.wheels.rr.spinGroup.rotation.x += spinDelta;

  // Move road grid backwards
  if (state.groundGrid) {
    state.groundGrid.position.z = (state.groundGrid.position.z - state.roadSpeed) % 1.0;
  }

  // 3. Smoke Particle Simulation (I2)
  updateSmokeParticles(delta);

  // 4. Dynamic 4WD Drivetrain Lines (I4)
  updateDrivetrainLines(time);

  // 5. Camera Interpolation (When not in free 360° orbit mode)
  if (!state.isOrbitMode) {
    let targetCamPos, targetLookAt, targetFov;

    if (state.isInteriorView) {
      targetCamPos = COCKPIT_PRESET.camPos;
      targetLookAt = COCKPIT_PRESET.target;
      targetFov = COCKPIT_PRESET.fov;
    } else {
      const preset = CAMERA_PRESETS[state.activeSection] || CAMERA_PRESETS[0];
      targetCamPos = preset.camPos;
      targetLookAt = preset.target;
      targetFov = preset.fov;
    }

    // Smooth lerp camera position and lookAt
    camera.position.lerp(targetCamPos, 0.05);
    controls.target.lerp(targetLookAt, 0.05);

    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.05);
      camera.updateProjectionMatrix();
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// --- WINDOW RESIZE HANDLER ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Start Animation
animate();
