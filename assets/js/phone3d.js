/* ==========================================================
   NAMQA — Hero 3D scene (v3)
   - Un seul téléphone plus grand, centré
   - Écran = Apple Wallet avec DEUX cartes empilées :
       · Carte membre "Amjad Mohamed" (mini, style Apple Wallet sombre)
       · Carte Fromi (dominante) — fidèle au visuel réel (photo mouton)
   - Chaque tasse se tamponne individuellement au hover (UV raycast)
   - Points fidélité animés lors des tampons
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ===== Asset preloads =====
const fromiImg = new Image();
let fromiImgLoaded = false;
fromiImg.crossOrigin = 'anonymous';
fromiImg.src = 'assets/images/carte-fromi.jpg';
fromiImg.onload = () => { fromiImgLoaded = true; };

// ===== Cup positions =====
// Coordonnées relatives au cadre de la carte Fromi (image carte-fromi.jpg).
// Mesurées automatiquement via détection des cercles blancs.
// x: [0.148, 0.323, 0.497, 0.673, 0.847]
// y: row1 = 0.220, row2 = 0.340 (en UV de l'image 1080x1478)
// Mais la carte Fromi est rognée/cadrée dans notre écran (on n'affiche que
// la partie utile). Donc on recalcule ces coords relativement à la zone AFFICHÉE.
// → voir drawWalletScreen() pour les coords exactes utilisées.

// ===== Shared state =====
const fromiState = {
  cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  dirty: true,
};

const canvas = document.getElementById('phone-canvas');
if (canvas) initScene();

function initScene() {
  const scene = new THREE.Scene();
  scene.background = null;

  const container = canvas.parentElement;
  let width = container.clientWidth;
  let height = container.clientHeight;

  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
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
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xff8855, 0.7);
  rimLight.position.set(-6, 2, -3);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0x8c88ff, 0.5);
  fillLight.position.set(3, -4, 4);
  scene.add(fillLight);

  // ===== Build phone =====
  const { group: phone, screenMesh, screenTexture: phoneScreenTex, W: PW, H: PH } = buildPhone();
  phone.position.set(0.15, 0, 0);
  phone.rotation.y = -0.24;
  phone.rotation.x = 0.04;
  scene.add(phone);

  // ===== Ground shadow =====
  const shadowGeo = new THREE.PlaneGeometry(7, 2);
  const sC = document.createElement('canvas');
  sC.width = 512; sC.height = 128;
  const sCtx = sC.getContext('2d');
  const grd = sCtx.createRadialGradient(256, 64, 10, 256, 64, 220);
  grd.addColorStop(0, 'rgba(0,0,0,0.40)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grd;
  sCtx.fillRect(0, 0, 512, 128);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sC),
      transparent: true,
      opacity: 0.55,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -PH / 2 - 0.3;
  scene.add(shadow);

  // ===== Raycaster for cup hover detection =====
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Coordonnées UV des tasses DANS LE CANVAS DE L'ÉCRAN du téléphone.
  // (calculées une fois — doivent matcher drawWalletScreen)
  // Le canvas fait 540 x 1100. La carte Fromi occupe de y=FROMI_Y à y=FROMI_Y+FROMI_H.
  // Voir les constantes dans drawWalletScreen pour tenir synchronisé.
  const cupUVs = []; // rempli au 1er dessin

  function getPhoneScreenUV(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(screenMesh, false);
    if (!hits.length) return null;
    return hits[0].uv;
  }

  // Layout du screen canvas — MUST match drawWalletScreen()
  const SCREEN_W = 540, SCREEN_H = 1100;
  // Positions des tasses dans le canvas écran (en pixels)
  // Ces valeurs sont dupliquées dans drawWalletScreen — gardez synchronisé.
  const FROMI_AREA = { x: 30, y: 500, w: 480, h: 560 };
  const CUPS_ROW1_Y = FROMI_AREA.y + FROMI_AREA.h * 0.220; // ≈ 623
  const CUPS_ROW2_Y = FROMI_AREA.y + FROMI_AREA.h * 0.340; // ≈ 690
  const CUPS_X = [0.148, 0.323, 0.497, 0.673, 0.847].map(
    fx => FROMI_AREA.x + FROMI_AREA.w * fx
  );
  const CUP_R_PX = FROMI_AREA.w * 0.057;

  // cup UV (screen-texture UV in 0..1) — but texture Y is flipped vs canvas
  const cupCentersUV = [];
  for (const yPx of [CUPS_ROW1_Y, CUPS_ROW2_Y]) {
    for (const xPx of CUPS_X) {
      cupCentersUV.push([xPx / SCREEN_W, yPx / SCREEN_H]);
    }
  }
  const CUP_HIT_RADIUS_UV = CUP_R_PX / SCREEN_W; // tolerance

  // ===== Drag =====
  const drag = {
    active: false,
    startX: 0, startY: 0,
    startRotX: 0, startRotY: 0,
    idleAt: performance.now(),
  };

  const onDown = (x, y) => {
    const uv = getPhoneScreenUV(x, y);
    if (!uv) return;
    drag.active = true;
    drag.startX = x; drag.startY = y;
    drag.startRotY = phone.rotation.y;
    drag.startRotX = phone.rotation.x;
    canvas.style.cursor = 'grabbing';
  };

  const onMove = (x, y) => {
    const uv = getPhoneScreenUV(x, y);

    // Hover cups (detect which one is under the cursor, mark individually)
    if (uv && !drag.active) {
      // uv.x goes 0..1, uv.y 0..1 but texture Y flipped: texY = 1 - uv.y
      const tx = uv.x;
      const ty = 1 - uv.y;
      for (let i = 0; i < cupCentersUV.length; i++) {
        const [cx, cy] = cupCentersUV[i];
        const dx = tx - cx;
        const dy = ty - cy;
        if (dx * dx + dy * dy <= CUP_HIT_RADIUS_UV * CUP_HIT_RADIUS_UV) {
          if (fromiState.cups[i] < 1) {
            fromiState.cups[i] = 1;
            fromiState.dirty = true;
          }
        }
      }
    }

    if (!drag.active) {
      canvas.style.cursor = uv ? 'grab' : 'default';
      return;
    }
    const dxp = x - drag.startX;
    const dyp = y - drag.startY;
    phone.rotation.y = drag.startRotY + dxp * 0.007;
    phone.rotation.x = Math.max(-0.8, Math.min(0.8, drag.startRotX + dyp * 0.006));
  };

  const onUp = () => {
    if (drag.active) {
      drag.idleAt = performance.now();
    }
    drag.active = false;
    canvas.style.cursor = 'grab';
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    onDown(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', () => { if (drag.active) onUp(); });
  canvas.addEventListener('touchmove', (e) => { if (drag.active) e.preventDefault(); }, { passive: false });

  // Repaint when Fromi image late-loads
  fromiImg.addEventListener('load', () => { fromiState.dirty = true; }, { once: true });

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
  const entryRotStart = -0.9;
  const entryRotEnd = -0.24;
  phone.rotation.y = entryRotStart;
  const entryDuration = 1200;
  const cupDisplayed = new Array(10).fill(0);

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    // Entrée
    const entry = Math.min(1, (now - startTime) / entryDuration);
    if (entry < 1 && !drag.active) {
      const e = 1 - Math.pow(1 - entry, 3);
      phone.rotation.y = entryRotStart + (entryRotEnd - entryRotStart) * e;
      drag.idleAt = now;
    }

    // Oscillation idle très douce
    if (!drag.active && (now - drag.idleAt) > IDLE_AFTER) {
      const t = (now - drag.idleAt) / 1000;
      phone.rotation.y = entryRotEnd + Math.sin(t * 0.5) * 0.09;
      phone.rotation.x += (0.04 - phone.rotation.x) * 0.03;
    }

    // Bob vertical léger
    phone.position.y = Math.sin(now * 0.0008) * 0.06;

    // Animation tampons
    let cupsChanged = false;
    for (let i = 0; i < 10; i++) {
      const target = fromiState.cups[i];
      const prev = cupDisplayed[i];
      cupDisplayed[i] += (target - cupDisplayed[i]) * Math.min(1, dt * 8);
      if (Math.abs(cupDisplayed[i] - prev) > 0.002) cupsChanged = true;
    }

    if (cupsChanged || fromiState.dirty) {
      drawWalletScreen(phoneScreenTex.image, cupDisplayed);
      phoneScreenTex.needsUpdate = true;
      fromiState.dirty = false;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

/* ==========================================================
   PHONE BUILDER — realistic iPhone 15 Pro style
   ========================================================== */
function buildPhone() {
  const group = new THREE.Group();

  const W = 2.4, H = 4.9, D = 0.28;
  const BEZEL = 0.065, CORNER = 0.40;

  // Titanium frame
  group.add(new THREE.Mesh(
    new RoundedBoxGeometry(W, H, D, 8, CORNER),
    new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2e, metalness: 0.9, roughness: 0.3,
      clearcoat: 0.6, clearcoatRoughness: 0.25,
    })
  ));

  // Back plate
  const back = new THREE.Mesh(
    new RoundedBoxGeometry(W - 0.02, H - 0.02, D + 0.005, 8, CORNER - 0.005),
    new THREE.MeshPhysicalMaterial({ color: 0x26224a, metalness: 0.3, roughness: 0.65 })
  );
  back.position.z = -0.002;
  group.add(back);

  // Screen texture
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 540;
  screenCanvas.height = 1100;
  drawWalletScreen(screenCanvas, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
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
    new THREE.CapsuleGeometry(0.11, 0.38, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4 })
  );
  island.rotation.z = Math.PI / 2;
  island.position.set(0, H / 2 - 0.3, D / 2 + 0.003);
  group.add(island);

  // Camera bump
  const bump = new THREE.Group();
  bump.add(new THREE.Mesh(
    new RoundedBoxGeometry(0.95, 0.95, 0.08, 4, 0.18),
    new THREE.MeshPhysicalMaterial({ color: 0x201e3e, metalness: 0.5, roughness: 0.5 })
  ));
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x222244, metalness: 0.9, roughness: 0.1, clearcoat: 1 });
  [[-0.19, 0.19], [0.19, 0.19], [0, -0.19]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 24), lensMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, 0.06);
    bump.add(ring);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.13, 24), glassMat);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y, 0.07);
    bump.add(glass);
  });
  bump.position.set(-W / 2 + 0.72, H / 2 - 0.72, -D / 2 - 0.04);
  group.add(bump);

  // Side buttons
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 0.85, roughness: 0.4 });
  const addBtn = (x, y, h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.1), btnMat);
    b.position.set(x, y, 0);
    group.add(b);
  };
  addBtn(-W / 2 - 0.005, 0.9, 0.35);
  addBtn(-W / 2 - 0.005, 0.35, 0.35);
  addBtn(-W / 2 - 0.005, 1.5, 0.25);
  addBtn(W / 2 + 0.005, 0.8, 0.6);

  return { group, screenMesh, screenTexture: screenTex, W, H, D };
}

/* ==========================================================
   WALLET SCREEN — deux cartes empilées comme Apple Wallet
   Canvas 540 x 1100.
   ========================================================== */
function drawWalletScreen(c, cups) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  // Background iOS Wallet (noir pur)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Status bar
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = '600 26px -apple-system, SF Pro, Inter, sans-serif';
  ctx.fillText('9:41', 40, 56);
  ctx.textAlign = 'right';
  ctx.font = '600 20px -apple-system, SF Pro, Inter, sans-serif';
  // Icônes pseudo : signal / 5G / batterie
  // Signal (4 barres)
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(W - 170 + i * 7, 56 - (i + 1) * 3, 5, (i + 1) * 3);
  }
  ctx.fillText('5G', W - 120, 55);
  // Batterie
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 82, 42, 44, 22);
  ctx.fillRect(W - 37, 48, 3, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W - 79, 45, 38, 16);

  ctx.textAlign = 'left';

  // --- Titre "Cartes" ---
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px -apple-system, "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Cartes', 36, 130);

  // --- Search bar ---
  roundRect(ctx, 30, 158, W - 60, 48, 12, '#1c1c28');
  ctx.fillStyle = '#6e6e82';
  ctx.font = '500 17px -apple-system, Inter, sans-serif';
  ctx.fillText('🔍  Rechercher', 50, 188);

  /* ----------------------------------------------------------
     CARTE MEMBRE — mini, style Apple Wallet sombre
     Position: y=230, hauteur 240 (prend ~22% de l'écran)
  ---------------------------------------------------------- */
  const MC = { x: 30, y: 230, w: W - 60, h: 240 };
  ctx.save();
  roundRectPath(ctx, MC.x, MC.y, MC.w, MC.h, 22);
  // Fond indigo premium
  const mcg = ctx.createLinearGradient(MC.x, MC.y, MC.x + MC.w, MC.y + MC.h);
  mcg.addColorStop(0, '#2E2E80');
  mcg.addColorStop(0.55, '#1A1650');
  mcg.addColorStop(1, '#0F0C3A');
  ctx.fillStyle = mcg;
  ctx.fill();
  ctx.clip();

  // Reflet diagonal
  const sheen = ctx.createLinearGradient(MC.x, MC.y, MC.x + MC.w, MC.y);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.09)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(MC.x, MC.y, MC.w, MC.h);

  // Halo orange en coin
  const halo = ctx.createRadialGradient(MC.x + MC.w * 0.9, MC.y + MC.h * 0.15, 0, MC.x + MC.w * 0.9, MC.y + MC.h * 0.15, MC.w * 0.6);
  halo.addColorStop(0, 'rgba(255, 107, 53, 0.35)');
  halo.addColorStop(1, 'rgba(255, 107, 53, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(MC.x, MC.y, MC.w, MC.h);

  // Logo Namqa (mini ours)
  ctx.save();
  ctx.translate(MC.x + 22, MC.y + 18);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(6, 2, 34, 0, 46, 14);
  ctx.moveTo(5, 10);
  ctx.bezierCurveTo(7, 5, 13, 5, 14, 9);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 20px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Namqa', MC.x + 76, MC.y + 38);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillText('MEMBRE · AMBASSADEUR', MC.x + 22, MC.y + 62);

  // Nom titulaire
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Amjad Mohamed', MC.x + 22, MC.y + 105);

  // Solde points — gros, orange
  const stamped = cups.reduce((a, b) => a + b, 0);
  const bonusPts = Math.round(stamped * 10);
  const pts = 1240 + bonusPts;
  const ptsStr = pts.toLocaleString('fr-FR').replace(/,/g, ' ');
  ctx.fillStyle = '#FF6B35';
  ctx.font = '900 46px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(ptsStr, MC.x + 22, MC.y + 158);
  const ptsW = ctx.measureText(ptsStr).width;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '600 15px Inter, sans-serif';
  ctx.fillText('pts fidélité', MC.x + 22 + ptsW + 10, MC.y + 158);

  // +N pts chip si bonus
  if (bonusPts > 0) {
    const chipW = 78, chipH = 26;
    const chipX = MC.x + MC.w - chipW - 22;
    const chipY = MC.y + 130;
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2, '#22C55E');
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${bonusPts} pts`, chipX + chipW / 2, chipY + 18);
    ctx.textAlign = 'left';
  }

  // Numéro carte + barre progression
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 14px "Space Mono", monospace';
  ctx.fillText('N° 0427 8891 2024', MC.x + 22, MC.y + 198);

  // Barre progression gold→diamant
  const pbX = MC.x + 22, pbY = MC.y + 212, pbW = MC.w - 44, pbH = 5;
  roundRect(ctx, pbX, pbY, pbW, pbH, 3, 'rgba(255,255,255,0.18)');
  const frac = Math.min(1, pts / 2000);
  const pg = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
  pg.addColorStop(0, '#FF6B35');
  pg.addColorStop(1, '#FFD166');
  roundRect(ctx, pbX, pbY, pbW * frac, pbH, 3, pg);

  ctx.restore();

  /* ----------------------------------------------------------
     CARTE FROMI — dominante, fidèle au visuel réel
     Occupe le reste de l'écran
  ---------------------------------------------------------- */
  const FROMI = { x: 30, y: 500, w: W - 60, h: 560 };
  ctx.save();
  roundRectPath(ctx, FROMI.x, FROMI.y, FROMI.w, FROMI.h, 22);
  ctx.fillStyle = '#3A7B3A';
  ctx.fill();
  ctx.clip();

  if (fromiImgLoaded && fromiImg.naturalWidth > 0) {
    // Dessine la carte Fromi entière stretchée pour remplir la zone.
    // L'image est déjà 1080x1478, notre zone est 480x560 → ratio 0.857 vs image 0.731
    // → on stretch un peu en X (acceptable pour garder tout visible : logo, bande paysage, tasses, code barre).
    ctx.drawImage(fromiImg, FROMI.x, FROMI.y, FROMI.w, FROMI.h);
  } else {
    // Fallback uni vert
    ctx.fillStyle = '#3A7B3A';
    ctx.fillRect(FROMI.x, FROMI.y, FROMI.w, FROMI.h);
  }

  // --- Overlay tampons noirs sur les tasses ---
  const cupsRel = [
    [0.148, 0.220], [0.323, 0.220], [0.497, 0.220], [0.673, 0.220], [0.847, 0.220],
    [0.148, 0.340], [0.323, 0.340], [0.497, 0.340], [0.673, 0.340], [0.847, 0.340],
  ];
  const cupR = FROMI.w * 0.057;

  cupsRel.forEach(([xr, yr], i) => {
    const amt = cups[i];
    if (amt < 0.01) return;
    const px = FROMI.x + FROMI.w * xr;
    const py = FROMI.y + FROMI.h * yr;

    ctx.save();
    // Masque circulaire sur la tasse blanche
    ctx.beginPath();
    ctx.arc(px, py, cupR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fond noir progressif
    ctx.fillStyle = `rgba(18, 18, 24, ${amt})`;
    ctx.fillRect(px - cupR, py - cupR, cupR * 2, cupR * 2);

    // Icône tasse blanche (remplace la tasse grise quand on tamponne)
    if (amt > 0.3) {
      const iconA = Math.min(1, (amt - 0.3) * 2);
      ctx.globalAlpha = iconA;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = cupR * 0.14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Tasse (vue de face — similaire à icône de base)
      const cw = cupR * 0.80;
      ctx.beginPath();
      ctx.moveTo(px - cw * 0.5, py - cupR * 0.15);
      ctx.lineTo(px + cw * 0.4, py - cupR * 0.15);
      ctx.lineTo(px + cw * 0.32, py + cupR * 0.45);
      ctx.lineTo(px - cw * 0.42, py + cupR * 0.45);
      ctx.closePath();
      ctx.fill();
      // Anse
      ctx.beginPath();
      ctx.arc(px + cw * 0.55, py + cupR * 0.05, cupR * 0.22, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }

    ctx.restore();

    // Anneau orange autour (accent Namqa)
    if (amt > 0.15) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (amt - 0.15) * 1.5);
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(px, py, cupR + 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.restore();

  // Home indicator
  roundRect(ctx, W / 2 - 65, H - 22, 130, 5, 3, 'rgba(255,255,255,0.55)');
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
