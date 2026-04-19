/* ==========================================================
   NAMQA — Hero 3D scene (v2)
   - Phone with Fromi loyalty card; each cup stamps individually
     as the cursor passes over it (UV-based hover trail)
   - Compact detached member card to the right with progressive
     +1 point animation on hover
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ===== Asset preloads =====
const fromiImg = new Image();
let fromiImgLoaded = false;
fromiImg.crossOrigin = 'anonymous';
fromiImg.src = 'assets/images/carte-fromi.jpg';
fromiImg.onload = () => { fromiImgLoaded = true; };

// ===== Cup layout (used by both the drawing and the raycaster) =====
// Fromi card cups positioned relative to the card area.
// 2 rows × 5 cols, inset 14% on both sides.
const FROMI_CUPS_UV = [
  [0.14, 0.30], [0.31, 0.30], [0.48, 0.30], [0.65, 0.30], [0.82, 0.30],
  [0.14, 0.52], [0.31, 0.52], [0.48, 0.52], [0.65, 0.52], [0.82, 0.52],
];

// ===== Shared state for textures =====
// cups[i] = 0 (grey, default) -> 1 (fully stamped black)
const fromiState = {
  cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  dirty: true,
};
const memberState = {
  hovered: false,
  pointsAnim: 0, // 0 = 1240, 1 = 1290
};

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

  // ===== Build phone =====
  const { group: phone, screenMesh, screenTexture: phoneScreenTex, W: PW, H: PH } = buildPhone();
  phone.position.x = -1.85;
  phone.rotation.y = -0.38;
  phone.rotation.x = 0.05;
  scene.add(phone);

  // ===== Build member card (smaller, refined) =====
  const { group: card, textures: cardTextures, CW, CH } = buildMemberCard();
  card.position.set(1.80, 0.15, 0.8);
  card.rotation.y = 0.18;
  card.rotation.x = -0.02;
  card.rotation.z = -0.04;
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
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sC),
      transparent: true,
      opacity: 0.6,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -PH / 2 - 0.3;
  scene.add(shadow);

  // ===== Raycaster =====
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Picking mesh for member card
  const pickCard = new THREE.Mesh(
    new THREE.PlaneGeometry(CW * 1.08, CH * 1.05),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  card.add(pickCard);

  // Cup hitboxes in TEXTURE UV coordinates (normalized on the screen canvas)
  // Derived from FROMI_CUPS_UV (relative to the card area) and card bounds
  // within the phone screen canvas (cardX=30, cardY=250, cardW=480, cardH=620,
  // canvas 540x1100). We compute screen-canvas UV once at startup.
  const CARD_X = 30 / 540;       // 0.0556
  const CARD_Y = 250 / 1100;     // 0.2273
  const CARD_W = 480 / 540;      // 0.8889
  const CARD_H = 620 / 1100;     // 0.5636
  const cupUVs = FROMI_CUPS_UV.map(([xr, yr]) => [
    CARD_X + CARD_W * xr,
    CARD_Y + CARD_H * yr,
  ]);
  const CUP_RADIUS_UV = 0.055; // hover tolerance

  function getPhoneScreenUV(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(screenMesh, false);
    if (!hits.length) return null;
    return hits[0].uv; // Vector2, (0..1, 0..1)
  }

  function getCardHit(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObject(pickCard, false).length > 0;
  }

  // ===== Drag state =====
  const drag = {
    target: null,
    startX: 0, startY: 0,
    startRotX: 0, startRotY: 0,
    velocityX: 0, velocityY: 0,
    lastX: 0, lastY: 0,
    lastTime: 0,
    idlePhoneAt: performance.now(),
    idleCardAt: performance.now(),
  };

  const onDown = (x, y) => {
    const onCard = getCardHit(x, y);
    const onPhone = !onCard && getPhoneScreenUV(x, y) !== null;
    const target = onCard ? 'card' : (onPhone ? 'phone' : null);
    if (!target) return;
    drag.target = target;
    drag.startX = x; drag.startY = y;
    drag.lastX = x; drag.lastY = y;
    const obj = target === 'phone' ? phone : card;
    drag.startRotY = obj.rotation.y;
    drag.startRotX = obj.rotation.x;
    drag.velocityX = 0; drag.velocityY = 0;
    drag.lastTime = performance.now();
    canvas.style.cursor = 'grabbing';
  };

  const onMove = (x, y) => {
    // --- HOVER DETECTION ---
    const onCard = getCardHit(x, y);
    if (onCard !== memberState.hovered) {
      memberState.hovered = onCard;
    }

    // Hover on phone: pick each cup individually by UV
    const uv = getPhoneScreenUV(x, y);
    if (uv) {
      // Find which cup is under the cursor
      for (let i = 0; i < cupUVs.length; i++) {
        const dx = uv.x - cupUVs[i][0];
        const dy = (1 - uv.y) - cupUVs[i][1]; // Canvas is Y-flipped vs UV
        if (dx * dx + dy * dy <= CUP_RADIUS_UV * CUP_RADIUS_UV) {
          if (fromiState.cups[i] < 1) {
            fromiState.cups[i] = 1; // mark as stamped (animation tween handles actual fade)
            fromiState.dirty = true;
          }
        }
      }
    }

    // cursor
    if (!drag.target) {
      canvas.style.cursor = (onCard || uv) ? 'grab' : 'default';
      return;
    }
    const obj = drag.target === 'phone' ? phone : card;
    const dxp = x - drag.startX;
    const dyp = y - drag.startY;
    obj.rotation.y = drag.startRotY + dxp * 0.008;
    obj.rotation.x = Math.max(-1.2, Math.min(1.2, drag.startRotX + dyp * 0.008));

    const now = performance.now();
    const dt = Math.max(1, now - drag.lastTime);
    drag.velocityX = (x - drag.lastX) / dt;
    drag.velocityY = (y - drag.lastY) / dt;
    drag.lastX = x; drag.lastY = y;
    drag.lastTime = now;
  };

  const onUp = () => {
    if (drag.target === 'phone') drag.idlePhoneAt = performance.now();
    if (drag.target === 'card') drag.idleCardAt = performance.now();
    drag.target = null;
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
    if (memberState.hovered) { memberState.hovered = false; }
    // Reset cups with a fade out (handled in animation loop)
    if (drag.target) onUp();
  });
  canvas.addEventListener('touchmove', (e) => { if (drag.target) e.preventDefault(); }, { passive: false });

  // Fromi image late-load: repaint when ready
  if (!fromiImgLoaded) {
    fromiImg.addEventListener('load', () => {
      fromiState.dirty = true;
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
  const phoneEntryStart = -1.1;
  const cardEntryStart = 1.1;
  const phoneEntryEnd = -0.38;
  const cardEntryEnd = 0.18;
  phone.rotation.y = phoneEntryStart;
  card.rotation.y = cardEntryStart;
  const entryDuration = 1400;

  // Easing for cup stamp anim (per cup has its own actual/displayed value)
  const cupDisplayed = new Array(10).fill(0);

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    const entry = Math.min(1, (now - startTime) / entryDuration);
    if (entry < 1 && !drag.target) {
      const e = 1 - Math.pow(1 - entry, 3);
      phone.rotation.y = phoneEntryStart + (phoneEntryEnd - phoneEntryStart) * e;
      card.rotation.y = cardEntryStart + (cardEntryEnd - cardEntryStart) * e;
      drag.idlePhoneAt = now;
      drag.idleCardAt = now;
    }

    // Idle auto-sway (gentle, back and forth, never full spin)
    if (drag.target !== 'phone' && (now - drag.idlePhoneAt) > IDLE_AFTER) {
      const t = (now - drag.idlePhoneAt) / 1000;
      phone.rotation.y = -0.38 + Math.sin(t * 0.6) * 0.12;
      phone.rotation.x += (0.05 - phone.rotation.x) * 0.02;
    }
    if (drag.target !== 'card' && (now - drag.idleCardAt) > IDLE_AFTER) {
      const t = (now - drag.idleCardAt) / 1000;
      card.rotation.y = 0.18 + Math.sin(t * 0.55 + 1.2) * 0.08;
      card.rotation.x += (-0.02 - card.rotation.x) * 0.02;
    }

    // Float bobs
    phone.position.y = Math.sin(now * 0.0008) * 0.08;
    card.position.y = Math.sin(now * 0.0008 + 1.5) * 0.09;

    // Animate cups toward target
    let cupsChanged = false;
    for (let i = 0; i < 10; i++) {
      const target = fromiState.cups[i];
      const prev = cupDisplayed[i];
      cupDisplayed[i] += (target - cupDisplayed[i]) * Math.min(1, dt * 8);
      if (Math.abs(cupDisplayed[i] - prev) > 0.002) cupsChanged = true;
    }

    // Count stamped cups -> drives the member card point anim automatically
    const stampedCount = cupDisplayed.reduce((a, b) => a + b, 0); // 0..10
    const targetPoints = memberState.hovered
      ? Math.min(1, stampedCount / 10)
      : 0;
    memberState.pointsAnim += (targetPoints - memberState.pointsAnim) * Math.min(1, dt * 4);

    if (cupsChanged || fromiState.dirty) {
      drawWalletCardOnCanvas(phoneScreenTex.image, cupDisplayed);
      phoneScreenTex.needsUpdate = true;
      fromiState.dirty = false;
    }

    // Redraw member card if hovered or points anim is in motion
    drawMemberCardCanvas(cardTextures.frontCanvas, memberState);
    cardTextures.front.needsUpdate = true;

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

  group.add(new THREE.Mesh(
    new RoundedBoxGeometry(W, H, D, 8, CORNER),
    new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2e, metalness: 0.85, roughness: 0.35,
      clearcoat: 0.6, clearcoatRoughness: 0.25,
    })
  ));

  const back = new THREE.Mesh(
    new RoundedBoxGeometry(W - 0.02, H - 0.02, D + 0.005, 8, CORNER - 0.005),
    new THREE.MeshPhysicalMaterial({ color: 0x2a274a, metalness: 0.3, roughness: 0.65 })
  );
  back.position.z = -0.002;
  group.add(back);

  // Screen
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 540;
  screenCanvas.height = 1100;
  drawWalletCardOnCanvas(screenCanvas, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 8;
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W - BEZEL * 2, H - BEZEL * 2),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screenMesh.position.z = D / 2 + 0.001;
  group.add(screenMesh);

  // Dynamic island
  const island = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.1, 0.35, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4 })
  );
  island.rotation.z = Math.PI / 2;
  island.position.set(0, H / 2 - 0.28, D / 2 + 0.003);
  group.add(island);

  // Camera bump
  const bump = new THREE.Group();
  bump.add(new THREE.Mesh(
    new RoundedBoxGeometry(0.85, 0.85, 0.08, 4, 0.18),
    new THREE.MeshPhysicalMaterial({ color: 0x201e3e, metalness: 0.5, roughness: 0.5 })
  ));
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

  return { group, screenMesh, screenTexture: screenTex, W, H, D };
}

/* ==========================================================
   MEMBER CARD BUILDER — compact, refined
   ========================================================== */
function buildMemberCard() {
  const group = new THREE.Group();
  // Smaller & more realistic card ratio (credit-card-ish, portrait)
  const CW = 1.85, CH = 2.72, CD = 0.05;

  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = 700; frontCanvas.height = 1050;
  drawMemberCardCanvas(frontCanvas, { hovered: false, pointsAnim: 0 });
  const frontTex = new THREE.CanvasTexture(frontCanvas);
  frontTex.colorSpace = THREE.SRGBColorSpace;
  frontTex.anisotropy = 8;

  const backCanvas = document.createElement('canvas');
  backCanvas.width = 700; backCanvas.height = 1050;
  drawMemberCardBackCanvas(backCanvas);
  const backTex = new THREE.CanvasTexture(backCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.anisotropy = 8;

  // Card body (thin slab)
  group.add(new THREE.Mesh(
    new RoundedBoxGeometry(CW, CH, CD, 4, 0.14),
    new THREE.MeshPhysicalMaterial({
      color: 0x1A1650, metalness: 0.15, roughness: 0.55, clearcoat: 0.4,
    })
  ));

  // Front face
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(CW - 0.03, CH - 0.03),
    new THREE.MeshBasicMaterial({ map: frontTex, toneMapped: false })
  );
  front.position.z = CD / 2 + 0.001;
  group.add(front);

  // Back face
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(CW - 0.03, CH - 0.03),
    new THREE.MeshBasicMaterial({ map: backTex, toneMapped: false })
  );
  back.position.z = -CD / 2 - 0.001;
  back.rotation.y = Math.PI;
  group.add(back);

  return { group, textures: { front: frontTex, back: backTex, frontCanvas, backCanvas }, CW, CH };
}

/* ==========================================================
   MEMBER CARD FRONT — compact & beautiful
   Style inspired by premium bank / loyalty cards.
   Holder: "Lucas Berger" (fictional, different from Amjad).
   ========================================================== */
function drawMemberCardCanvas(c, state) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;

  // --- Background: subtle indigo base with soft gradient ---
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1A1650');
  bg.addColorStop(0.6, '#26236B');
  bg.addColorStop(1, '#1A1650');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // --- Subtle dotted grid ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 24; j++) {
      const px = 30 + i * ((W - 60) / 15);
      const py = 30 + j * ((H - 60) / 23);
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Soft radial glows ---
  const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.18, 0, W * 0.85, H * 0.18, W * 0.7);
  glow1.addColorStop(0, 'rgba(255, 107, 53, 0.28)');
  glow1.addColorStop(1, 'rgba(255, 107, 53, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.8, 0, W * 0.1, H * 0.8, W * 0.8);
  glow2.addColorStop(0, 'rgba(101, 97, 214, 0.25)');
  glow2.addColorStop(1, 'rgba(101, 97, 214, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // --- Header: Namqa logo + chip ---
  // Mini bear outline
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(40, 68);
  ctx.bezierCurveTo(60, 48, 110, 46, 150, 72);
  ctx.moveTo(52, 60);
  ctx.bezierCurveTo(56, 50, 66, 50, 68, 58);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Namqa', 40, 118);
  ctx.font = '500 13px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('MEMBER CARD', 162, 118);

  // Golden chip on the right
  const chipX = W - 110, chipY = 60, chipW = 70, chipH = 55;
  const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
  chipGrad.addColorStop(0, '#FFD57E');
  chipGrad.addColorStop(0.5, '#E8A547');
  chipGrad.addColorStop(1, '#B87322');
  roundRect(ctx, chipX, chipY, chipW, chipH, 8, chipGrad);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(chipX + 8, chipY + (chipH / 4) * i);
    ctx.lineTo(chipX + chipW - 8, chipY + (chipH / 4) * i);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(chipX + chipW / 2, chipY + 4);
  ctx.lineTo(chipX + chipW / 2, chipY + chipH - 4);
  ctx.stroke();

  // --- Tier ribbon: "AMBASSADEUR" ---
  const tierY = 175;
  ctx.fillStyle = 'rgba(255, 107, 53, 0.2)';
  roundRect(ctx, 40, tierY, 160, 26, 13, 'rgba(255, 107, 53, 0.15)');
  ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
  ctx.lineWidth = 1;
  roundRectStroke(ctx, 40, tierY, 160, 26, 13);
  ctx.fillStyle = '#FF9B6B';
  ctx.font = '700 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AMBASSADEUR', 120, tierY + 17);
  ctx.textAlign = 'left';

  // --- Holder name (larger, Space Grotesk) ---
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Lucas Berger', 40, 265);

  // --- Card number: 4 groups of 4 ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 26px "Space Mono", "Space Grotesk", monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText('0427  8891  2024  0001', 40, 335);

  // --- Balance block ---
  const balY = 440;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '700 11px Inter, sans-serif';
  ctx.fillText('SOLDE FIDÉLITÉ', 40, balY);

  // Animated points: 1240 -> 1240 + stampedCount (max +10)
  // pointsAnim here represents % of current stamped cups applied.
  const deltaPts = Math.round(state.pointsAnim * 10); // stampedCount * pointsAnim is already baked in
  const pts = 1240 + deltaPts;
  const ptsStr = pts.toLocaleString('fr-FR').replace(/,/g, ' ');
  // Points number — orange
  ctx.fillStyle = '#FF6B35';
  ctx.font = '800 78px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(ptsStr, 40, balY + 82);

  // "pts" suffix
  ctx.font = '800 78px "Space Grotesk", Inter, sans-serif';
  const ptsW = ctx.measureText(ptsStr).width;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '600 18px Inter, sans-serif';
  ctx.fillText('pts', 40 + ptsW + 14, balY + 82);

  // "+N" green chip on hover
  if (deltaPts > 0) {
    const chipX2 = 40 + ptsW + 60;
    const chipY2 = balY + 40;
    const cW2 = 70, cH2 = 28;
    const alpha = Math.min(1, state.pointsAnim * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    // soft green pill
    roundRect(ctx, chipX2, chipY2, cW2, cH2, cH2 / 2, '#22C55E');
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${deltaPts} pts`, chipX2 + cW2 / 2, chipY2 + 19);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // --- Progress bar (Gold tier progression) ---
  const pbY = 600;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '700 11px Inter, sans-serif';
  ctx.fillText('NIVEAU GOLD · 760 PTS AVANT DIAMANT', 40, pbY);
  const barX = 40, barY = pbY + 14, barW = W - 80, barH = 8;
  roundRect(ctx, barX, barY, barW, barH, 4, 'rgba(255,255,255,0.14)');
  // Filled portion
  const progress = Math.min(1, (pts - 0) / 2000);
  const fillW = barW * progress;
  const pgrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
  pgrad.addColorStop(0, '#FF6B35');
  pgrad.addColorStop(1, '#FFB84D');
  roundRect(ctx, barX, barY, fillW, barH, 4, pgrad);

  // --- Expiry + valid from ---
  const expY = 700;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '700 10px Inter, sans-serif';
  ctx.fillText('VALIDE DÈS', 40, expY);
  ctx.fillText('EXPIRE', W - 140, expY);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px "Space Mono", "Space Grotesk", monospace';
  ctx.fillText('01/24', 40, expY + 26);
  ctx.fillText('12/28', W - 140, expY + 26);

  // --- Name banner + signature strip bottom ---
  // Barcode pill
  const bcH = 90, bcY = H - bcH - 36, bcX = 40, bcW = W - 80;
  roundRect(ctx, bcX, bcY, bcW, bcH, 14, '#ffffff');
  ctx.fillStyle = '#121240';
  // Deterministic barcode
  let r = 12345;
  const rand = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const nLines = 56;
  const barArea = bcW - 44;
  for (let i = 0; i < nLines; i++) {
    const lw = 1.2 + rand() * 4.2;
    const lx = bcX + 22 + (barArea / nLines) * i;
    ctx.fillRect(lx, bcY + 14, lw, 48);
  }
  ctx.fillStyle = '#121240';
  ctx.font = '600 12px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('4 2 7 8 8 9 1 2 0 2 4 8', W / 2, bcY + 80);
  ctx.textAlign = 'left';

  // Hover rim light
  if (state.hovered || state.pointsAnim > 0.02) {
    const a = Math.min(0.35, state.pointsAnim * 0.5 + 0.1);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 107, 53, ${a})`;
    ctx.lineWidth = 6;
    roundRectStroke(ctx, 4, 4, W - 8, H - 8, 22);
    ctx.restore();
  }
}

function drawMemberCardBackCanvas(c) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1A1650');
  bg.addColorStop(1, '#25206B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Magnetic stripe
  ctx.fillStyle = '#080618';
  ctx.fillRect(0, 110, W, 70);

  // Signature panel
  roundRect(ctx, 40, 260, W - 80, 70, 10, '#f6f6fb');
  ctx.fillStyle = 'rgba(18,18,64,0.75)';
  ctx.font = 'italic 500 22px "Space Grotesk", sans-serif';
  ctx.fillText('Lucas Berger', 60, 303);

  // Card-issuer + CVV mock
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.fillText('CVV', W - 140, 365);
  roundRect(ctx, W - 150, 370, 110, 40, 8, '#ffffff');
  ctx.fillStyle = '#121240';
  ctx.font = '700 20px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('•••', W - 95, 397);
  ctx.textAlign = 'left';

  // Terms text
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '500 14px Inter, sans-serif';
  const lines = [
    'Carte nominative et non transmissible.',
    'Usage exclusif chez les commerces partenaires',
    'de Namqa Studio. Conditions sur namqa.ch.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, 40, 500 + i * 24));

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '500 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('namqastudio.ch · support@namqa.ch', W / 2, H - 50);
  ctx.textAlign = 'left';
}

/* ==========================================================
   PHONE WALLET CARD — Fromi with progressive cup stamping
   cups: array of 10 values 0..1 (animated externally)

   Carte Fromi dessinée 100% en canvas (positions déterministes,
   parfaitement alignées avec le raycaster UV).
   Cup UV positions (in canvas space):
     row1: y = 0.30,  row2: y = 0.52
     x: 0.14, 0.31, 0.48, 0.65, 0.82  (5 cols, inset 14%)
   ========================================================== */

function drawWalletCardOnCanvas(c, cups) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  // Wallet background (iOS Wallet dark)
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

  // Title + search
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 40px -apple-system, "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Cartes', 36, 130);
  roundRect(ctx, 30, 158, W - 60, 50, 14, '#1c1c28');
  ctx.fillStyle = '#6e6e82';
  ctx.font = '500 18px -apple-system, Inter, sans-serif';
  ctx.fillText('🔍  Rechercher', 50, 188);

  // --- Fromi card area ---
  const cardX = 30, cardY = 250, cardW = W - 60, cardH = 620;

  ctx.save();
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.clip();

  // Green radial background inspired by real Fromi card
  const bg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  bg.addColorStop(0, '#2E9E6B');
  bg.addColorStop(0.55, '#1F7A50');
  bg.addColorStop(1, '#15573A');
  ctx.fillStyle = bg;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Subtle diagonal highlight
  const sheen = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  sheen.addColorStop(0, 'rgba(255,255,255,0.00)');
  sheen.addColorStop(0.4, 'rgba(255,255,255,0.05)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(0.6, 'rgba(255,255,255,0.05)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // --- Card header: FROMI logo + partner name ---
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px "Space Grotesk", Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FROMI', cardX + 28, cardY + 62);
  // partner chip
  const chipX = cardX + cardW - 110;
  const chipY = cardY + 28;
  roundRect(ctx, chipX, chipY, 82, 30, 8, 'rgba(255,255,255,0.92)');
  ctx.fillStyle = '#1A1650';
  ctx.font = '800 14px "Space Grotesk", Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Namqa', chipX + 41, chipY + 20);
  ctx.textAlign = 'left';

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillText('10 cafés achetés = 1 offert', cardX + 28, cardY + 92);

  // --- Cups grid area ---
  // Drawing area: x spans cardX..cardX+cardW, y spans cardY+130..cardY+410
  const areaX = cardX;
  const areaY = cardY + 110;
  const areaW = cardW;
  const areaH = 320;

  // Subtle panel behind cups
  roundRect(ctx, areaX + 20, areaY + 10, areaW - 40, areaH - 20, 20, 'rgba(255,255,255,0.08)');

  // Draw the 10 cups
  const cupR = Math.min(cardW, cardH) * 0.055;
  FROMI_CUPS_UV.forEach(([xr, yr], i) => {
    // xr / yr are relative to entire card (cardX..cardX+cardW, cardY..cardY+cardH)
    const px = cardX + cardW * xr;
    const py = cardY + cardH * yr;
    const amt = cups[i];

    // Empty slot: white circle with thin border
    ctx.save();
    // Soft shadow
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#f5f1e4';
    ctx.beginPath();
    ctx.arc(px, py, cupR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Small coffee cup icon drawn inside (faint when empty)
    ctx.save();
    const iconA = 0.35;
    ctx.strokeStyle = `rgba(60,40,20,${iconA})`;
    ctx.fillStyle = `rgba(60,40,20,${iconA})`;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    // cup body (trapezoid)
    ctx.beginPath();
    const cw = cupR * 0.75;
    ctx.moveTo(px - cw * 0.6, py - cupR * 0.15);
    ctx.lineTo(px + cw * 0.6, py - cupR * 0.15);
    ctx.lineTo(px + cw * 0.5, py + cupR * 0.45);
    ctx.lineTo(px - cw * 0.5, py + cupR * 0.45);
    ctx.closePath();
    ctx.stroke();
    // handle
    ctx.beginPath();
    ctx.arc(px + cw * 0.7, py + cupR * 0.1, cupR * 0.22, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // steam (3 squiggles)
    ctx.beginPath();
    [-0.25, 0, 0.25].forEach(ox => {
      ctx.moveTo(px + cw * ox, py - cupR * 0.3);
      ctx.lineTo(px + cw * ox, py - cupR * 0.6);
    });
    ctx.stroke();
    ctx.restore();

    // --- Stamped overlay ---
    if (amt > 0.01) {
      ctx.save();
      // Dark circle grows with amt
      const gradStamp = ctx.createRadialGradient(px, py, 0, px, py, cupR);
      gradStamp.addColorStop(0, `rgba(16, 16, 24, ${amt})`);
      gradStamp.addColorStop(0.85, `rgba(16, 16, 24, ${amt * 0.98})`);
      gradStamp.addColorStop(1, `rgba(16, 16, 24, 0)`);
      ctx.fillStyle = gradStamp;
      ctx.beginPath();
      ctx.arc(px, py, cupR * (0.92 + 0.08 * amt), 0, Math.PI * 2);
      ctx.fill();

      // Orange ring
      ctx.globalAlpha = Math.min(1, amt * 1.5);
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, cupR + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Check mark
      if (amt > 0.15) {
        ctx.globalAlpha = Math.min(1, (amt - 0.15) * 1.6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2.2, cupR * 0.22);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(px - cupR * 0.38, py + cupR * 0.05);
        ctx.lineTo(px - cupR * 0.08, py + cupR * 0.35);
        ctx.lineTo(px + cupR * 0.45, py - cupR * 0.28);
        ctx.stroke();
      }
      ctx.restore();
    }
  });

  // --- Counter below cups ---
  const stamped = cups.reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '700 14px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TAMPONS ACQUIS', cardX + 28, cardY + 500);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(`${stamped}`, cardX + 28, cardY + 548);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '700 20px Inter, sans-serif';
  ctx.fillText(` / 10`, cardX + 28 + ctx.measureText(`${stamped}`).width + 4, cardY + 548);

  // Progress bar
  const pbx = cardX + 28, pby = cardY + 565, pbw = cardW - 56, pbh = 8;
  roundRect(ctx, pbx, pby, pbw, pbh, 4, 'rgba(255,255,255,0.18)');
  const frac = Math.min(1, stamped / 10);
  roundRect(ctx, pbx, pby, pbw * frac, pbh, 4, '#FF6B35');

  // --- Barcode pill bottom ---
  const bcY = cardY + cardH - 86;
  const bcX = cardX + 30;
  const bcW = cardW - 60;
  const bcH = 68;
  roundRect(ctx, bcX, bcY, bcW, bcH, 12, '#ffffff');
  ctx.fillStyle = '#121240';
  let r = 9876;
  const rand = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const nLines = 40;
  const barArea = bcW - 30;
  for (let i = 0; i < nLines; i++) {
    const lw = 1.2 + rand() * 3.5;
    const lx = bcX + 15 + (barArea / nLines) * i;
    ctx.fillRect(lx, bcY + 10, lw, 36);
  }
  ctx.fillStyle = '#121240';
  ctx.font = '600 11px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FR · NAMQA · 0427 8891', bcX + bcW / 2, bcY + 60);
  ctx.textAlign = 'left';

  ctx.restore();
  // --- End Fromi card area ---

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
