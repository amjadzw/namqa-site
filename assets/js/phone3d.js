/* ==========================================================
   NAMQA — iPhone 3D interactif (Three.js)
   Drag to rotate, auto-rotate when idle, Apple Wallet card on screen
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.getElementById('phone-canvas');
if (canvas) {
  initPhone();
}

function initPhone() {
  const scene = new THREE.Scene();
  scene.background = null; // transparent so hero gradient shows

  const container = canvas.parentElement;
  let width = container.clientWidth;
  let height = container.clientHeight;

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 9);

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
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xff8855, 0.8);
  rimLight.position.set(-6, 2, -3);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x8c88ff, 0.6);
  fillLight.position.set(3, -4, 4);
  scene.add(fillLight);

  // ===== Phone group =====
  const phone = new THREE.Group();
  scene.add(phone);

  // Dimensions (iPhone 15 Pro-ish ratio)
  const W = 2.15;    // width
  const H = 4.35;    // height
  const D = 0.26;    // depth
  const BEZEL = 0.065;
  const CORNER = 0.35;

  // ===== Body (titanium frame) =====
  const bodyGeo = new RoundedBoxGeometry(W, H, D, 8, CORNER);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a2e,
    metalness: 0.85,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    reflectivity: 0.5,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  phone.add(body);

  // ===== Back panel (slightly inset, more matte) =====
  const backGeo = new RoundedBoxGeometry(W - 0.02, H - 0.02, D + 0.005, 8, CORNER - 0.005);
  const backMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a274a,
    metalness: 0.3,
    roughness: 0.65,
    clearcoat: 0.3,
  });
  const back = new THREE.Mesh(backGeo, backMat);
  back.position.z = -0.002;
  phone.add(back);

  // ===== Screen (front face) =====
  const screenTex = createWalletCardTexture();
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTex,
    toneMapped: false,
  });
  const screenGeo = new THREE.PlaneGeometry(W - BEZEL * 2, H - BEZEL * 2);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = D / 2 + 0.001;
  phone.add(screen);

  // ===== Dynamic island =====
  const islandGeo = new THREE.CapsuleGeometry(0.1, 0.35, 4, 12);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4 });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.rotation.z = Math.PI / 2;
  island.position.set(0, H / 2 - 0.28, D / 2 + 0.003);
  phone.add(island);

  // ===== Camera bump on back =====
  const cameraBump = new THREE.Group();
  const bumpBaseGeo = new RoundedBoxGeometry(0.85, 0.85, 0.08, 4, 0.18);
  const bumpBaseMat = new THREE.MeshPhysicalMaterial({
    color: 0x201e3e,
    metalness: 0.5,
    roughness: 0.5,
  });
  const bumpBase = new THREE.Mesh(bumpBaseGeo, bumpBaseMat);
  cameraBump.add(bumpBase);

  // lens rings
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x222244,
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1,
  });
  const lensPositions = [[-0.17, 0.17], [0.17, 0.17], [0, -0.17]];
  lensPositions.forEach(([x, y]) => {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.12, 24),
      lensMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, 0.06);
    cameraBump.add(ring);

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.13, 24),
      glassMat
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y, 0.07);
    cameraBump.add(glass);
  });

  cameraBump.position.set(-W / 2 + 0.62, H / 2 - 0.62, -D / 2 - 0.04);
  phone.add(cameraBump);

  // ===== Side buttons =====
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 0.85, roughness: 0.4 });
  // Volume up
  const volUp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.1), btnMat);
  volUp.position.set(-W / 2 - 0.005, 0.8, 0);
  phone.add(volUp);
  // Volume down
  const volDown = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.1), btnMat);
  volDown.position.set(-W / 2 - 0.005, 0.3, 0);
  phone.add(volDown);
  // Action button
  const actionBtn = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.1), btnMat);
  actionBtn.position.set(-W / 2 - 0.005, 1.3, 0);
  phone.add(actionBtn);
  // Power
  const power = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.1), btnMat);
  power.position.set(W / 2 + 0.005, 0.7, 0);
  phone.add(power);

  // ===== Subtle ground shadow =====
  const shadowGeo = new THREE.PlaneGeometry(5, 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
  });
  // radial gradient canvas for shadow
  const sC = document.createElement('canvas');
  sC.width = 256; sC.height = 128;
  const sCtx = sC.getContext('2d');
  const grd = sCtx.createRadialGradient(128, 64, 10, 128, 64, 120);
  grd.addColorStop(0, 'rgba(0,0,0,0.5)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grd;
  sCtx.fillRect(0, 0, 256, 128);
  shadowMat.map = new THREE.CanvasTexture(sC);
  shadowMat.transparent = true;
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -H / 2 - 0.3;
  scene.add(shadow);

  // ===== Initial pose — strong 3D angle so it's obviously a 3D object =====
  phone.rotation.y = -0.7;
  phone.rotation.x = 0.12;
  phone.position.x = 0.2;

  // Entry animation: subtle 'present itself' rotation on load
  let entryProgress = 0;
  const entryDuration = 1600; // ms
  const entryStartRotY = -1.4;
  const entryEndRotY = -0.7;
  phone.rotation.y = entryStartRotY;

  // ===== Drag controls =====
  const state = {
    isDragging: false,
    startX: 0, startY: 0,
    startRotY: 0, startRotX: 0,
    velocityX: 0, velocityY: 0,
    lastX: 0, lastY: 0,
    lastTime: 0,
    idle: true,
    idleTimer: 0,
  };

  const onDown = (x, y) => {
    state.isDragging = true;
    state.startX = x; state.startY = y;
    state.lastX = x; state.lastY = y;
    state.startRotY = phone.rotation.y;
    state.startRotX = phone.rotation.x;
    state.velocityX = 0; state.velocityY = 0;
    state.lastTime = performance.now();
    state.idle = false;
    canvas.style.cursor = 'grabbing';
  };
  const onMove = (x, y) => {
    if (!state.isDragging) return;
    const dx = x - state.startX;
    const dy = y - state.startY;
    phone.rotation.y = state.startRotY + dx * 0.008;
    phone.rotation.x = Math.max(-1.2, Math.min(1.2, state.startRotX + dy * 0.008));

    const now = performance.now();
    const dt = Math.max(1, now - state.lastTime);
    state.velocityX = (x - state.lastX) / dt;
    state.velocityY = (y - state.lastY) / dt;
    state.lastX = x; state.lastY = y;
    state.lastTime = now;
  };
  const onUp = () => {
    state.isDragging = false;
    state.idleTimer = performance.now();
    canvas.style.cursor = 'grab';
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    onDown(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', () => { if (state.isDragging) onUp(); });

  // Touch fallback (some older touch flows)
  canvas.addEventListener('touchmove', (e) => { if (state.isDragging) e.preventDefault(); }, { passive: false });

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
  const IDLE_AFTER = 2000; // ms
  let lastFrame = performance.now();

  const animStart = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    // Entry animation
    if (entryProgress < 1 && !state.isDragging) {
      entryProgress = Math.min(1, (now - animStart) / entryDuration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - entryProgress, 3);
      phone.rotation.y = entryStartRotY + (entryEndRotY - entryStartRotY) * eased;
      state.idleTimer = now; // delay auto-spin start
    }

    // Inertia after drag
    if (!state.isDragging && (Math.abs(state.velocityX) > 0.0001 || Math.abs(state.velocityY) > 0.0001)) {
      phone.rotation.y += state.velocityX * 16 * dt;
      phone.rotation.x += state.velocityY * 16 * dt;
      phone.rotation.x = Math.max(-1.2, Math.min(1.2, phone.rotation.x));
      state.velocityX *= 0.92;
      state.velocityY *= 0.92;
    }

    // Idle auto-rotation: smoothly resume when no interaction
    if (!state.isDragging && Math.abs(state.velocityX) < 0.0005) {
      const sinceIdle = now - state.idleTimer;
      if (sinceIdle > IDLE_AFTER || state.idle) {
        state.idle = true;
        phone.rotation.y += 0.25 * dt; // gentle spin
        // Ease x back to slight tilt
        phone.rotation.x += (0.08 - phone.rotation.x) * 0.02;
      }
    }

    // Subtle float (bob) — always on
    phone.position.y = Math.sin(now * 0.0008) * 0.08;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

/* ==========================================================
   Draw the Apple Wallet card texture on a canvas
   ========================================================== */
function createWalletCardTexture() {
  const c = document.createElement('canvas');
  // Portrait texture, high res for crispness
  c.width = 540;
  c.height = 1100;
  const ctx = c.getContext('2d');

  const W = c.width, H = c.height;

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

  // Right icons
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

  // === Main Namqa Card ===
  const cardX = 30, cardY = 240, cardW = W - 60, cardH = 320, radius = 24;

  // Card gradient (Namqa violet)
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, '#3f3ba0');
  cardGrad.addColorStop(0.5, '#2E2B7A');
  cardGrad.addColorStop(1, '#1F1D5E');
  roundRect(ctx, cardX, cardY, cardW, cardH, radius, cardGrad);

  // subtle sheen
  const sheen = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  sheen.addColorStop(0, 'rgba(255,255,255,0.18)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  roundRect(ctx, cardX, cardY, cardW, cardH, radius, sheen);

  // Decorative orange blob
  ctx.save();
  ctx.beginPath();
  ctx.arc(cardX + cardW - 50, cardY + 60, 90, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 107, 61, 0.35)';
  ctx.filter = 'blur(20px)';
  ctx.fill();
  ctx.restore();

  // Namqa logo (stylized polar bear + text)
  drawNamqaLogo(ctx, cardX + 32, cardY + 52);

  // Card details
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '500 13px -apple-system, Inter, sans-serif';
  ctx.fillText('MEMBRE · AMBASSADEUR', cardX + 32, cardY + 140);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px -apple-system, Inter, sans-serif';
  ctx.fillText('Amjad Mohamed', cardX + 32, cardY + 172);

  // Points balance — big orange
  ctx.fillStyle = '#FF6B3D';
  ctx.font = '800 56px -apple-system, "Space Grotesk", sans-serif';
  ctx.fillText('1 240', cardX + 32, cardY + 250);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '500 16px -apple-system, Inter, sans-serif';
  ctx.fillText('pts fidélité', cardX + 200, cardY + 250);

  // Small footer inside card
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '500 12px -apple-system, Inter, sans-serif';
  ctx.fillText('N° 0427-8891-2024', cardX + 32, cardY + 285);

  // === Barcode section ===
  const barcodeY = cardY + cardH + 24;
  roundRect(ctx, cardX, barcodeY, cardW, 130, 20, '#ffffff');

  // Barcode pattern
  ctx.fillStyle = '#14123E';
  const bStartX = cardX + 40;
  const bW = cardW - 80;
  const lines = 52;
  for (let i = 0; i < lines; i++) {
    const lw = 2 + Math.random() * 6;
    const lh = 60;
    const x = bStartX + (bW / lines) * i;
    ctx.fillRect(x, barcodeY + 20, lw, lh);
  }

  // Barcode number
  ctx.fillStyle = '#14123E';
  ctx.font = '600 14px -apple-system, Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('4 2 7 8 8 9 1 2 0 2 4 8', cardX + cardW / 2, barcodeY + 108);
  ctx.textAlign = 'left';

  // === Secondary card preview (stacked behind) ===
  const card2Y = barcodeY + 170;
  roundRect(ctx, cardX + 16, card2Y - 12, cardW - 32, 24, 12, '#FF6B3D');
  const card2Grad = ctx.createLinearGradient(cardX, card2Y, cardX + cardW, card2Y + 180);
  card2Grad.addColorStop(0, '#E85420');
  card2Grad.addColorStop(1, '#FF6B3D');
  roundRect(ctx, cardX, card2Y, cardW, 180, 22, card2Grad);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px -apple-system, Inter, sans-serif';
  ctx.fillText('Café des Alpes', cardX + 28, card2Y + 44);
  ctx.font = '500 13px -apple-system, Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Carte de fidélité · 8/10 tampons', cardX + 28, card2Y + 68);

  // Stamps
  for (let i = 0; i < 10; i++) {
    const sx = cardX + 28 + i * 44;
    const sy = card2Y + 110;
    ctx.beginPath();
    ctx.arc(sx + 14, sy + 14, 14, 0, Math.PI * 2);
    if (i < 8) {
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#FF6B3D';
      ctx.font = '800 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx + 14, sy + 20);
      ctx.textAlign = 'left';
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Home indicator
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  roundRect(ctx, W / 2 - 65, H - 20, 130, 5, 3, 'rgba(255,255,255,0.5)');

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx, x, y, w, h, r, fill) {
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
  if (typeof fill === 'string' || fill instanceof CanvasGradient) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function drawNamqaLogo(ctx, x, y) {
  // Stylized polar-bear-like line mark above "Namqa"
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // back line
  ctx.moveTo(x, y + 4);
  ctx.bezierCurveTo(x + 30, y - 16, x + 90, y - 20, x + 140, y + 8);
  // ear
  ctx.moveTo(x + 10, y);
  ctx.bezierCurveTo(x + 14, y - 10, x + 24, y - 10, x + 24, y - 2);
  // snout dot
  ctx.moveTo(x + 6, y + 4);
  ctx.lineTo(x + 8, y + 4);
  ctx.stroke();
  ctx.restore();

  // "Namqa" text
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px -apple-system, "Space Grotesk", sans-serif';
  ctx.fillText('Namqa', x, y + 38);
  ctx.font = '500 12px -apple-system, Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Studio', x + 70, y + 38);
}
