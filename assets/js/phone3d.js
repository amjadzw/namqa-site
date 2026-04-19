/* ==========================================================
   NAMQA — Hero 3D scene
   - Phone on the left with Fromi loyalty card on screen
   - Member card floating to the right, detached from the phone
   - Both objects are interactive (drag to rotate, hover FX)
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ===== Asset preloads =====
const fromiImg = new Image();
let fromiImgLoaded = false;
fromiImg.crossOrigin = 'anonymous';
fromiImg.src = 'assets/images/carte-fromi.jpg';
fromiImg.onload = () => { fromiImgLoaded = true; };

// ===== Shared state for textures =====
const fromiState = { stamped: false };
const memberState = { hovered: false, pointsAnim: 0 }; // 0 = 1240, 1 = 1290

const canvas = document.getElementById('phone-canvas');
if (canvas) initScene();

function initScene() {
  const scene = new THREE.Scene();
  scene.background = null;

  const container = canvas.parentElement;
  let width = container.clientWidth;
  let height = container.clientHeight;

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 11);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ===== Lighting =====
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xff8855, 0.8);
  rimLight.position.set(-6, 2, -3);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x8c88ff, 0.6);
  fillLight.position.set(3, -4, 4);
  scene.add(fillLight);

  // ===== Build phone (LEFT) =====
  const { group: phone, screenTexture: phoneScreenTex, W: PW, H: PH } = buildPhone();
  phone.position.x = -1.95;
  phone.rotation.y = -0.55;
  phone.rotation.x = 0.08;
  scene.add(phone);

  // ===== Build member card (RIGHT, detached) =====
  const { group: card, textures: cardTextures } = buildMemberCard();
  card.position.set(2.25, 0.1, 0.8);
  card.rotation.y = 0.45;
  card.rotation.x = -0.05;
  card.rotation.z = -0.08;
  scene.add(card);

  // ===== Ground shadow =====
  const shadowGeo = new THREE.PlaneGeometry(9, 2.5);
  const sC = document.createElement('canvas');
  sC.width = 512; sC.height = 128;
  const sCtx = sC.getContext('2d');
  const grd = sCtx.createRadialGradient(256, 64, 10, 256, 64, 220);
  grd.addColorStop(0, 'rgba(0,0,0,0.45)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grd;
  sCtx.fillRect(0, 0, 512, 128);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(sC),
    transparent: true,
    opacity: 0.65,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -PH / 2 - 0.3;
  scene.add(shadow);

  // ===== Raycaster for picking which object to drag / hover =====
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Picking meshes (invisible helpers, full bounds of each object)
  const pickPhone = new THREE.Mesh(
    new THREE.BoxGeometry(PW * 1.15, PH * 1.05, 0.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  phone.add(pickPhone);

  const pickCard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 4.4),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  card.add(pickCard);

  const pickables = [pickPhone, pickCard];

  function getHit(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (!hits.length) return null;
    return hits[0].object === pickPhone ? 'phone' : 'card';
  }

  // ===== Drag controls (per object) =====
  const controls = {
    target: null, // 'phone' | 'card' | null
    startX: 0, startY: 0,
    startRotX: 0, startRotY: 0,
    velocityX: 0, velocityY: 0,
    lastX: 0, lastY: 0,
    lastTime: 0,
    idlePhoneAt: performance.now(),
    idleCardAt: performance.now(),
  };

  const onDown = (x, y) => {
    const hit = getHit(x, y);
    if (!hit) return;
    controls.target = hit;
    controls.startX = x; controls.startY = y;
    controls.lastX = x; controls.lastY = y;
    const obj = hit === 'phone' ? phone : card;
    controls.startRotY = obj.rotation.y;
    controls.startRotX = obj.rotation.x;
    controls.velocityX = 0; controls.velocityY = 0;
    controls.lastTime = performance.now();
    canvas.style.cursor = 'grabbing';
  };
  const onMove = (x, y) => {
    // Hover detection
    const hit = getHit(x, y);
    const newCardHover = (hit === 'card');
    if (newCardHover !== memberState.hovered) {
      memberState.hovered = newCardHover;
      redrawMemberCardFront();
    }
    const newPhoneHover = (hit === 'phone');
    if (newPhoneHover !== fromiState.stamped) {
      fromiState.stamped = newPhoneHover;
      drawWalletCardOnCanvas(phoneScreenTex.image, fromiState.stamped);
      phoneScreenTex.needsUpdate = true;
    }

    if (!controls.target) {
      canvas.style.cursor = hit ? 'grab' : 'default';
      return;
    }
    const obj = controls.target === 'phone' ? phone : card;
    const dx = x - controls.startX;
    const dy = y - controls.startY;
    obj.rotation.y = controls.startRotY + dx * 0.008;
    obj.rotation.x = Math.max(-1.2, Math.min(1.2, controls.startRotX + dy * 0.008));

    const now = performance.now();
    const dt = Math.max(1, now - controls.lastTime);
    controls.velocityX = (x - controls.lastX) / dt;
    controls.velocityY = (y - controls.lastY) / dt;
    controls.lastX = x; controls.lastY = y;
    controls.lastTime = now;
  };
  const onUp = () => {
    if (controls.target === 'phone') controls.idlePhoneAt = performance.now();
    if (controls.target === 'card') controls.idleCardAt = performance.now();
    controls.target = null;
    canvas.style.cursor = 'grab';
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    onDown(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', () => {
    // leaving canvas: clear hovers
    if (memberState.hovered) { memberState.hovered = false; redrawMemberCardFront(); }
    if (fromiState.stamped) {
      fromiState.stamped = false;
      drawWalletCardOnCanvas(phoneScreenTex.image, false);
      phoneScreenTex.needsUpdate = true;
    }
    if (controls.target) onUp();
  });
  canvas.addEventListener('touchmove', (e) => { if (controls.target) e.preventDefault(); }, { passive: false });

  function redrawMemberCardFront() {
    // kick off the points animation on hover in
    if (memberState.hovered) memberState.pointsAnim = Math.max(memberState.pointsAnim, 0.001);
    drawMemberCardCanvas(cardTextures.frontCanvas, memberState);
    cardTextures.front.needsUpdate = true;
  }
  // Initial paint
  redrawMemberCardFront();

  // Reload textures when the Fromi photo finishes loading
  if (!fromiImgLoaded) {
    fromiImg.addEventListener('load', () => {
      drawWalletCardOnCanvas(phoneScreenTex.image, fromiState.stamped);
      phoneScreenTex.needsUpdate = true;
    }, { once: true });
  }

  // ===== Resize =====
  const resize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', resize);

  // ===== Animation loop =====
  const IDLE_AFTER = 2200;
  let lastFrame = performance.now();
  const startTime = performance.now();
  const phoneEntryStart = -1.3;
  const cardEntryStart = 1.5;
  const phoneEntryEnd = -0.55;
  const cardEntryEnd = 0.45;
  phone.rotation.y = phoneEntryStart;
  card.rotation.y = cardEntryStart;
  const entryDuration = 1500;

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    // Entry animation
    const entry = Math.min(1, (now - startTime) / entryDuration);
    if (entry < 1 && controls.target !== 'phone' && controls.target !== 'card') {
      const eased = 1 - Math.pow(1 - entry, 3);
      phone.rotation.y = phoneEntryStart + (phoneEntryEnd - phoneEntryStart) * eased;
      card.rotation.y = cardEntryStart + (cardEntryEnd - cardEntryStart) * eased;
      controls.idlePhoneAt = now;
      controls.idleCardAt = now;
    }

    // Phone auto-rotation when idle
    if (controls.target !== 'phone' && (now - controls.idlePhoneAt) > IDLE_AFTER) {
      phone.rotation.y += 0.2 * dt;
      phone.rotation.x += (0.08 - phone.rotation.x) * 0.02;
    }
    // Card auto-rotation when idle (slightly slower, opposite direction for contrast)
    if (controls.target !== 'card' && (now - controls.idleCardAt) > IDLE_AFTER) {
      card.rotation.y += -0.15 * dt;
      card.rotation.x += (-0.05 - card.rotation.x) * 0.02;
    }

    // Subtle float (different phases)
    phone.position.y = Math.sin(now * 0.0008) * 0.08;
    card.position.y = 0.1 + Math.sin(now * 0.0008 + 1.5) * 0.1;

    // Points animation on hover
    const target = memberState.hovered ? 1 : 0;
    const prev = memberState.pointsAnim;
    memberState.pointsAnim += (target - memberState.pointsAnim) * Math.min(1, dt * 5);
    if (Math.abs(memberState.pointsAnim - prev) > 0.002) {
      drawMemberCardCanvas(cardTextures.frontCanvas, memberState);
      cardTextures.front.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

/* ==========================================================
   PHONE BUILDER
   ========================================================== */
function buildPhone() {
  const group = new THREE.Group();

  const W = 2.15, H = 4.35, D = 0.26;
  const BEZEL = 0.065, CORNER = 0.35;

  const bodyGeo = new RoundedBoxGeometry(W, H, D, 8, CORNER);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a2e,
    metalness: 0.85,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));

  const backGeo = new RoundedBoxGeometry(W - 0.02, H - 0.02, D + 0.005, 8, CORNER - 0.005);
  const backMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a274a,
    metalness: 0.3,
    roughness: 0.65,
  });
  const back = new THREE.Mesh(backGeo, backMat);
  back.position.z = -0.002;
  group.add(back);

  // Screen
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 540;
  screenCanvas.height = 1100;
  drawWalletCardOnCanvas(screenCanvas, false);
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 8;

  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const screenGeo = new THREE.PlaneGeometry(W - BEZEL * 2, H - BEZEL * 2);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = D / 2 + 0.001;
  group.add(screen);

  // Dynamic island
  const islandGeo = new THREE.CapsuleGeometry(0.1, 0.35, 4, 12);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4 });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.rotation.z = Math.PI / 2;
  island.position.set(0, H / 2 - 0.28, D / 2 + 0.003);
  group.add(island);

  // Camera bump (back)
  const bumpBase = new THREE.Mesh(
    new RoundedBoxGeometry(0.85, 0.85, 0.08, 4, 0.18),
    new THREE.MeshPhysicalMaterial({ color: 0x201e3e, metalness: 0.5, roughness: 0.5 })
  );
  const bump = new THREE.Group();
  bump.add(bumpBase);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x222244, metalness: 0.9, roughness: 0.1, clearcoat: 1 });
  [[-0.17, 0.17], [0.17, 0.17], [0, -0.17]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 24), lensMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, 0.06);
    bump.add(ring);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.13, 24), glassMat);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y, 0.07);
    bump.add(glass);
  });
  bump.position.set(-W / 2 + 0.62, H / 2 - 0.62, -D / 2 - 0.04);
  group.add(bump);

  // Side buttons
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 0.85, roughness: 0.4 });
  const addBtn = (x, y, h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.1), btnMat);
    b.position.set(x, y, 0);
    group.add(b);
  };
  addBtn(-W / 2 - 0.005, 0.8, 0.35);
  addBtn(-W / 2 - 0.005, 0.3, 0.35);
  addBtn(-W / 2 - 0.005, 1.3, 0.25);
  addBtn(W / 2 + 0.005, 0.7, 0.55);

  return { group, screenTexture: screenTex, W, H, D };
}

/* ==========================================================
   MEMBER CARD BUILDER — detached, 3D plane
   ========================================================== */
function buildMemberCard() {
  const group = new THREE.Group();
  const CW = 2.8, CH = 4.0, CD = 0.06;

  // Front + back canvases
  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = 700; frontCanvas.height = 1000;
  drawMemberCardCanvas(frontCanvas, { hovered: false, pointsAnim: 0 });
  const frontTex = new THREE.CanvasTexture(frontCanvas);
  frontTex.colorSpace = THREE.SRGBColorSpace;
  frontTex.anisotropy = 8;

  const backCanvas = document.createElement('canvas');
  backCanvas.width = 700; backCanvas.height = 1000;
  drawMemberCardBackCanvas(backCanvas);
  const backTex = new THREE.CanvasTexture(backCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.anisotropy = 8;

  // Card body — thin rounded box for depth
  const bodyGeo = new RoundedBoxGeometry(CW, CH, CD, 4, 0.18);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x2E2E80,
    metalness: 0.2,
    roughness: 0.55,
    clearcoat: 0.5,
  });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));

  // Front face
  const frontMat = new THREE.MeshBasicMaterial({ map: frontTex, toneMapped: false });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(CW - 0.04, CH - 0.04), frontMat);
  front.position.z = CD / 2 + 0.001;
  group.add(front);

  // Back face (mirrored)
  const backMat = new THREE.MeshBasicMaterial({ map: backTex, toneMapped: false });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(CW - 0.04, CH - 0.04), backMat);
  back.position.z = -CD / 2 - 0.001;
  back.rotation.y = Math.PI;
  group.add(back);

  return {
    group,
    textures: { front: frontTex, back: backTex, frontCanvas, backCanvas }
  };
}

/* ==========================================================
   MEMBER CARD FRONT — draw on canvas (style REI Co-op, but Namqa)
   ========================================================== */
function drawMemberCardCanvas(c, state) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  // Base gradient (indigo depths)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1A1650');
  bg.addColorStop(0.55, '#2E2E80');
  bg.addColorStop(1, '#25206B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ===== Top bar (MEMBER # 0427-8891) =====
  const topH = 90;
  // Logo (left)
  drawNamqaLogoBig(ctx, 36, 32, '#ffffff');
  // Member # (right)
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 14px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('MEMBER #', W - 36, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('0427-8891-2024', W - 36, 72);
  ctx.textAlign = 'left';

  // ===== Hero area (geometric pattern w/ logo mark) =====
  const heroY = topH + 20;
  const heroH = 360;
  // Pattern background
  drawGeometricPattern(ctx, 30, heroY, W - 60, heroH);
  // Rounded mask for hero
  // (pattern is already masked below via overlay)

  // Soft title over pattern
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 54px "Space Grotesk", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Carte Membre', W / 2, heroY + heroH / 2 - 10);
  ctx.font = '500 18px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText('Namqa Studio · Ambassadeur', W / 2, heroY + heroH / 2 + 24);
  ctx.restore();
  ctx.textAlign = 'left';

  // ===== Holder info block =====
  const infoY = heroY + heroH + 26;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '700 12px Inter, sans-serif';
  ctx.fillText('TITULAIRE · AMBASSADEUR', 40, infoY + 4);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Amjad Mohamed', 40, infoY + 48);

  // Points (animated)
  const pts = Math.round(1240 + 50 * state.pointsAnim);
  const delta = state.pointsAnim > 0.02 ? '+50' : '';
  ctx.fillStyle = '#FF6B35';
  ctx.font = '800 68px "Space Grotesk", sans-serif';
  const ptsStr = pts.toLocaleString('fr-FR').replace(',', ' ');
  ctx.fillText(ptsStr, 40, infoY + 128);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '500 18px Inter, sans-serif';
  // measure pts width
  ctx.font = '800 68px "Space Grotesk", sans-serif';
  const ptsW = ctx.measureText(ptsStr).width;
  ctx.font = '500 18px Inter, sans-serif';
  ctx.fillText('pts fidélité', 40 + ptsW + 14, infoY + 128);

  // Delta badge (+50) on hover
  if (state.pointsAnim > 0.05) {
    const ba = state.pointsAnim; // alpha
    ctx.save();
    ctx.globalAlpha = Math.min(1, ba * 1.2);
    const bx = 40 + ptsW + 130, by = infoY + 90;
    const bw = 86, bh = 32;
    roundRect(ctx, bx, by, bw, bh, bh / 2, '#22C55E');
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(delta + ' pts', bx + bw / 2, by + 21);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ===== Barcode pill (bottom, integrated) =====
  const bcY = H - 150;
  const bcX = 40;
  const bcW = W - 80;
  const bcH = 110;
  // White pill
  roundRect(ctx, bcX, bcY, bcW, bcH, 18, '#ffffff');
  // Barcode lines
  ctx.fillStyle = '#121240';
  const seed = 'namqa0427';
  let r = 0;
  for (let i = 0; i < seed.length; i++) r = (r * 31 + seed.charCodeAt(i)) & 0xffff;
  const rand = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const nLines = 58;
  const lineArea = bcW - 60;
  for (let i = 0; i < nLines; i++) {
    const lw = 1.5 + rand() * 5.5;
    const lx = bcX + 30 + (lineArea / nLines) * i;
    ctx.fillRect(lx, bcY + 18, lw, 58);
  }
  // Barcode number
  ctx.fillStyle = '#121240';
  ctx.font = '600 15px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('4 2 7 8 8 9 1 2 0 2 4 8', W / 2, bcY + 98);
  ctx.textAlign = 'left';

  // Very subtle card glow on hover (rim)
  if (state.hovered || state.pointsAnim > 0.05) {
    const a = Math.min(0.25, state.pointsAnim * 0.35);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 107, 53, ${a})`;
    ctx.lineWidth = 6;
    roundRectStroke(ctx, 4, 4, W - 8, H - 8, 24);
    ctx.restore();
  }
}

function drawMemberCardBackCanvas(c) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#25206B');
  bg.addColorStop(1, '#1A1650');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Magnetic stripe
  ctx.fillStyle = '#0A0820';
  ctx.fillRect(0, 180, W, 80);

  // Signature panel
  roundRect(ctx, 60, 360, W - 120, 80, 10, '#ffffff');
  ctx.fillStyle = 'rgba(18,18,64,0.7)';
  ctx.font = 'italic 500 22px "Space Grotesk", sans-serif';
  ctx.fillText('Amjad Mohamed', 80, 410);

  // Logo
  drawNamqaLogoBig(ctx, W / 2 - 80, H - 200, '#ffffff');

  // Fine print
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '500 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('namqastudio.ch · support@namqa.ch', W / 2, H - 60);
  ctx.textAlign = 'left';
}

/* ==========================================================
   Geometric pattern (Namqa-themed) on the card hero
   ========================================================== */
function drawGeometricPattern(ctx, x, y, w, h) {
  ctx.save();
  // Mask to rounded rect
  roundRect(ctx, x, y, w, h, 24, '#1A1650');
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 24);
  ctx.clip();

  // Diagonal indigo gradient base
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#2E2E80');
  grad.addColorStop(1, '#1A1650');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Concentric orange arcs (radiating from top right)
  const cx = x + w + 40, cy = y - 40;
  const ringCount = 8;
  for (let i = 0; i < ringCount; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 80 + i * 70, 0, Math.PI * 2);
    const a = 0.06 + (i / ringCount) * 0.08;
    ctx.strokeStyle = `rgba(255, 107, 53, ${a})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Orange glow blob
  const blob = ctx.createRadialGradient(x + w * 0.78, y + h * 0.22, 0, x + w * 0.78, y + h * 0.22, w * 0.55);
  blob.addColorStop(0, 'rgba(255, 107, 53, 0.45)');
  blob.addColorStop(0.6, 'rgba(255, 107, 53, 0.08)');
  blob.addColorStop(1, 'rgba(255, 107, 53, 0)');
  ctx.fillStyle = blob;
  ctx.fillRect(x, y, w, h);

  // Indigo glow bottom-left
  const blob2 = ctx.createRadialGradient(x + w * 0.15, y + h * 0.85, 0, x + w * 0.15, y + h * 0.85, w * 0.6);
  blob2.addColorStop(0, 'rgba(120, 120, 240, 0.35)');
  blob2.addColorStop(1, 'rgba(120, 120, 240, 0)');
  ctx.fillStyle = blob2;
  ctx.fillRect(x, y, w, h);

  // Dotted grid
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 18; j++) {
      const px = x + 24 + i * ((w - 48) / 11);
      const py = y + 24 + j * ((h - 48) / 17);
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Giant stroked "N" monogram
  ctx.save();
  ctx.translate(x + w * 0.1, y + h * 0.55);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -110);
  ctx.lineTo(80, 0);
  ctx.lineTo(80, -110);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/* ==========================================================
   PHONE WALLET CARD — only the Fromi card, bigger & cleaner
   ========================================================== */
function drawWalletCardOnCanvas(c, stamped) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  // Wallet dark background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#050510');
  bgGrad.addColorStop(1, '#0a0a18');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Status bar
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px -apple-system, Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('9:41', 42, 52);
  ctx.textAlign = 'right';
  ctx.font = '600 18px -apple-system, Inter, sans-serif';
  ctx.fillText('●●●●   5G   ▮▮▮', W - 42, 52);

  // Wallet title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 40px -apple-system, "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Cartes', 36, 130);

  // Search bar
  roundRect(ctx, 30, 158, W - 60, 50, 14, '#1c1c28');
  ctx.fillStyle = '#6e6e82';
  ctx.font = '500 18px -apple-system, Inter, sans-serif';
  ctx.fillText('🔍  Rechercher', 50, 188);

  // === FROMI CARD — big, centered, shows the full card clearly ===
  const cardX = 30;
  const cardY = 250;
  const cardW = W - 60;
  const cardH = 620; // much bigger so the photo is fully visible

  // Card background (green base)
  ctx.save();
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fillStyle = '#1f6b4a';
  ctx.fill();
  ctx.clip();

  if (fromiImgLoaded && fromiImg.naturalWidth > 0) {
    // cover-fit the image into the card area
    const ir = fromiImg.naturalWidth / fromiImg.naturalHeight;
    const cr = cardW / cardH;
    let dw, dh, dx, dy;
    if (ir > cr) {
      dh = cardH;
      dw = cardH * ir;
      dx = cardX - (dw - cardW) / 2;
      dy = cardY;
    } else {
      dw = cardW;
      dh = cardW / ir;
      dx = cardX;
      dy = cardY - (dh - cardH) / 2;
    }
    ctx.drawImage(fromiImg, dx, dy, dw, dh);

    // Hover state: subtle dark vignette + small "stamped" badges on each cup
    if (stamped) {
      // gentle vignette to enhance contrast when stamping
      const vg = ctx.createRadialGradient(cardX + cardW / 2, cardY + cardH / 2, cardW * 0.35, cardX + cardW / 2, cardY + cardH / 2, cardW);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vg;
      ctx.fillRect(cardX, cardY, cardW, cardH);

      // Tight, controlled stamp dots — placed on approximate cup centers of the card photo
      // Normalized coordinates (xRel, yRel) inside the card rectangle, tuned visually.
      const cupsNorm = [
        // row 1
        [0.42, 0.28], [0.56, 0.28], [0.69, 0.28], [0.82, 0.28], [0.93, 0.30],
        // row 2
        [0.42, 0.50], [0.56, 0.50], [0.69, 0.50], [0.82, 0.50], [0.93, 0.52],
      ];
      const stampR = Math.min(cardW, cardH) * 0.038;
      cupsNorm.forEach(([xr, yr]) => {
        const px = cardX + cardW * xr;
        const py = cardY + cardH * yr;
        // Soft black filled circle, tightly contained
        const g = ctx.createRadialGradient(px, py, 0, px, py, stampR);
        g.addColorStop(0, 'rgba(12, 12, 18, 0.95)');
        g.addColorStop(0.85, 'rgba(12, 12, 18, 0.85)');
        g.addColorStop(1, 'rgba(12, 12, 18, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, stampR, 0, Math.PI * 2);
        ctx.fill();

        // Mini white check mark to read as "stamped"
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = Math.max(1.5, stampR * 0.18);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(px - stampR * 0.4, py);
        ctx.lineTo(px - stampR * 0.1, py + stampR * 0.35);
        ctx.lineTo(px + stampR * 0.45, py - stampR * 0.3);
        ctx.stroke();
      });
    }
  } else {
    // fallback solid while the image loads
    const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    grad.addColorStop(0, '#1f6b4a');
    grad.addColorStop(1, '#2f8a5d');
    ctx.fillStyle = grad;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px -apple-system, Inter, sans-serif';
    ctx.fillText('FROMI · Namqa', cardX + 24, cardY + 48);
  }
  ctx.restore();

  // Testez-moi pill — bottom-right of the card
  const pillW = 160, pillH = 36;
  const pillX = cardX + cardW - pillW - 20;
  const pillY = cardY + cardH - pillH - 20;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2, stamped ? '#FF6B35' : '#ffffff');
  ctx.restore();
  ctx.fillStyle = stamped ? '#ffffff' : '#121240';
  ctx.font = '800 14px -apple-system, Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TESTEZ-MOI', pillX + 18, pillY + 23);
  ctx.strokeStyle = stamped ? '#ffffff' : '#121240';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const ax = pillX + 120;
  const ay = pillY + pillH / 2;
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 20, ay);
  ctx.moveTo(ax + 13, ay - 6);
  ctx.lineTo(ax + 20, ay);
  ctx.lineTo(ax + 13, ay + 6);
  ctx.stroke();

  // Home indicator
  roundRect(ctx, W / 2 - 65, H - 20, 130, 5, 3, 'rgba(255,255,255,0.5)');
}

/* ==========================================================
   Canvas helpers
   ========================================================== */
function roundRect(ctx, x, y, w, h, r, fill) {
  roundRectPath(ctx, x, y, w, h, r);
  if (typeof fill === 'string' || fill instanceof CanvasGradient) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}
function roundRectStroke(ctx, x, y, w, h, r) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawNamqaLogoBig(ctx, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // polar bear back line
  ctx.moveTo(x, y + 8);
  ctx.bezierCurveTo(x + 36, y - 20, x + 108, y - 24, x + 168, y + 12);
  // ear
  ctx.moveTo(x + 12, y + 2);
  ctx.bezierCurveTo(x + 16, y - 12, x + 28, y - 12, x + 28, y - 2);
  // snout dot
  ctx.moveTo(x + 6, y + 6);
  ctx.lineTo(x + 10, y + 6);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.font = '800 34px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Namqa', x, y + 48);
  ctx.font = '500 14px Inter, sans-serif';
  ctx.fillStyle = color === '#ffffff' ? 'rgba(255,255,255,0.75)' : color;
  ctx.fillText('Studio', x + 96, y + 48);
}
