/* ==========================================================
   NAMQA — iPhone 3D interactif (Three.js)
   Drag to rotate, auto-rotate when idle, Apple Wallet card on screen
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Preload the Fromi card image so the canvas texture can include it
const fromiImg = new Image();
let fromiImgLoaded = false;
fromiImg.crossOrigin = 'anonymous';
fromiImg.src = 'assets/images/carte-fromi.jpg';
fromiImg.onload = () => { fromiImgLoaded = true; };

// Shared flag so the scene knows whether to show the "stamped" state on hover
const fromiState = { stamped: false, texture: null };

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
  const screenTex = createWalletCardTexture(false);
  fromiState.texture = screenTex;
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTex,
    toneMapped: false,
  });

  // Re-draw the texture once the Fromi image is loaded, then again on hover changes
  const refreshScreen = () => {
    const c = screenTex.image;
    drawWalletCardOnCanvas(c, fromiState.stamped);
    screenTex.needsUpdate = true;
  };
  if (!fromiImgLoaded) {
    fromiImg.addEventListener('load', refreshScreen, { once: true });
  }
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

  // Hover to "stamp" — turn grey coffee cups to black on the Fromi card
  const setStamped = (on) => {
    if (fromiState.stamped === on) return;
    fromiState.stamped = on;
    drawWalletCardOnCanvas(screenTex.image, on);
    screenTex.needsUpdate = true;
  };
  canvas.addEventListener('pointerenter', () => setStamped(true));
  canvas.addEventListener('pointerleave', () => setStamped(false));

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
function createWalletCardTexture(stamped) {
  const c = document.createElement('canvas');
  // Portrait texture, high res for crispness
  c.width = 540;
  c.height = 1100;
  drawWalletCardOnCanvas(c, stamped);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

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
  cardGrad.addColorStop(0, '#4F4FC9');
  cardGrad.addColorStop(0.5, '#2E2E80');
  cardGrad.addColorStop(1, '#121240');
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
  ctx.fillStyle = '#FF6B35';
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
  ctx.fillStyle = '#121240';
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
  ctx.fillStyle = '#121240';
  ctx.font = '600 14px -apple-system, Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('4 2 7 8 8 9 1 2 0 2 4 8', cardX + cardW / 2, barcodeY + 108);
  ctx.textAlign = 'left';

  // === Secondary card — Fromi real photo loyalty card ===
  const card2Y = barcodeY + 170;
  const card2H = 220;
  // subtle stacked hint
  roundRect(ctx, cardX + 16, card2Y - 12, cardW - 32, 24, 12, '#1f6b4a');

  // Card container with clipping
  ctx.save();
  roundRect(ctx, cardX, card2Y, cardW, card2H, 22, '#1f6b4a');
  ctx.beginPath();
  // clip to rounded rect
  const rx = cardX, ry = card2Y, rw = cardW, rh = card2H, rr = 22;
  ctx.moveTo(rx + rr, ry);
  ctx.lineTo(rx + rw - rr, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
  ctx.lineTo(rx + rw, ry + rh - rr);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
  ctx.lineTo(rx + rr, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
  ctx.lineTo(rx, ry + rr);
  ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
  ctx.closePath();
  ctx.clip();

  // Draw the Fromi photo if loaded, else draw a green placeholder
  if (fromiImgLoaded && fromiImg.naturalWidth > 0) {
    const ir = fromiImg.naturalWidth / fromiImg.naturalHeight;
    const cr = cardW / card2H;
    let dw, dh, dx, dy;
    if (ir > cr) {
      dh = card2H;
      dw = card2H * ir;
      dx = cardX - (dw - cardW) / 2;
      dy = card2Y;
    } else {
      dw = cardW;
      dh = cardW / ir;
      dx = cardX;
      dy = card2Y - (dh - card2H) / 2;
    }
    ctx.drawImage(fromiImg, dx, dy, dw, dh);

    // Overlay: when hovered (stamped), darken the 10 coffee stamps.
    // Approximate stamp grid from the real card image: two rows of 5 cups
    // positioned inside a light pane on the right side of the card.
    if (stamped) {
      // Adaptive dark overlays on cup locations.
      // Coordinates tuned for the photo's composition (right pane with cups).
      const gridX = cardX + cardW * 0.30;
      const gridY = card2Y + card2H * 0.18;
      const gridW = cardW * 0.62;
      const gridH = card2H * 0.58;
      const cols = 5, rows = 2;
      const cellW = gridW / cols;
      const cellH = gridH / rows;
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const cxp = gridX + cellW * col + cellW / 2;
          const cyp = gridY + cellH * r + cellH / 2;
          const rad = Math.min(cellW, cellH) * 0.38;
          // black cup overlay with warm edge
          const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, rad);
          g.addColorStop(0, 'rgba(12, 12, 18, 0.95)');
          g.addColorStop(0.7, 'rgba(12, 12, 18, 0.85)');
          g.addColorStop(1, 'rgba(12, 12, 18, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cxp, cyp, rad, 0, Math.PI * 2);
          ctx.fill();
          // tiny white steam dot to read as stamp
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.arc(cxp, cyp - rad * 0.3, rad * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  } else {
    // Fallback while image loads: solid green with text
    const card2Grad = ctx.createLinearGradient(cardX, card2Y, cardX + cardW, card2Y + card2H);
    card2Grad.addColorStop(0, '#1f6b4a');
    card2Grad.addColorStop(1, '#2f8a5d');
    ctx.fillStyle = card2Grad;
    ctx.fillRect(cardX, card2Y, cardW, card2H);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px -apple-system, Inter, sans-serif';
    ctx.fillText('FROMI · Namqa Studio', cardX + 28, card2Y + 44);
  }
  ctx.restore();

  // "Testez-moi →" pill label, bottom-left of the Fromi card
  const pillX = cardX + 18;
  const pillY = card2Y + card2H - 46;
  const pillW = 150, pillH = 32;
  // pill shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2, stamped ? '#FF6B35' : '#ffffff');
  ctx.restore();
  ctx.fillStyle = stamped ? '#ffffff' : '#121240';
  ctx.font = '800 13px -apple-system, Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TESTEZ-MOI', pillX + 16, pillY + 21);
  // arrow
  ctx.strokeStyle = stamped ? '#ffffff' : '#121240';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const ax = pillX + 108;
  const ay = pillY + pillH / 2;
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 18, ay);
  ctx.moveTo(ax + 12, ay - 5);
  ctx.lineTo(ax + 18, ay);
  ctx.lineTo(ax + 12, ay + 5);
  ctx.stroke();

  // Home indicator
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  roundRect(ctx, W / 2 - 65, H - 20, 130, 5, 3, 'rgba(255,255,255,0.5)');
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
