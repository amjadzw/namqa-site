/* ==========================================================
   NAMQA — Hero 3D scene (v6)
   UN SEUL téléphone centré, 3 sections empilées dans l'écran :
     1. Header « Cartes » + search
     2. Carte membre premium Bernard Arnault (style v5)
     3. Code-barres blanc
     4. Carte Fromi photo réelle avec hover « glow » doux sur tasses
   Châssis iPhone style v2/v3 (titane sombre, Dynamic Island, camera bump)
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ===== Assets =====
const fromiImg = new Image();
let fromiImgLoaded = false;
fromiImg.crossOrigin = 'anonymous';
fromiImg.src = 'assets/images/carte-fromi.jpg';
fromiImg.onload = () => { fromiImgLoaded = true; };

// État global
const state = {
  screen: {
    dirty: true,
    shine: 0,                    // reflet animé sur la carte membre
    hoverIdx: -1,                // index de la tasse survolée, -1 sinon
    glow: new Array(10).fill(0), // intensité du glow par tasse, 0..1
  },
};

const canvas = document.getElementById('phone-canvas');
if (canvas) initScene();

function initScene() {
  const scene = new THREE.Scene();
  scene.background = null;

  const container = canvas.parentElement;
  let width = container.clientWidth;
  let height = container.clientHeight;

  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
  camera.position.set(0, 0, 13);

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

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(4, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8855, 0.6);
  rim.position.set(-5, 2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x8c88ff, 0.45);
  fill.position.set(3, -4, 4);
  scene.add(fill);

  // --- Téléphone unique ---
  const SCREEN_W = 540;
  const SCREEN_H = 1100;

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = SCREEN_W;
  screenCanvas.height = SCREEN_H;
  drawScreen(screenCanvas, { shine: 0, hover: false, glow: state.screen.glow });

  const { group: phone, screenMesh, screenTexture: tex, W: PW, H: PH } =
    buildPhone(screenCanvas);
  phone.position.set(0, 0, 0);
  phone.rotation.y = 0.12;
  phone.rotation.x = 0.03;
  scene.add(phone);

  // Ombre sol
  const sC = document.createElement('canvas');
  sC.width = 512; sC.height = 128;
  const sCtx = sC.getContext('2d');
  const grd = sCtx.createRadialGradient(256, 64, 10, 256, 64, 220);
  grd.addColorStop(0, 'rgba(0,0,0,0.45)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grd;
  sCtx.fillRect(0, 0, 512, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.2),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sC),
      transparent: true,
      opacity: 0.55,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -PH / 2 - 0.22, 0);
  scene.add(shadow);

  // ===== Raycasting =====
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Zone de la carte Fromi dans l'écran (photo)
  const FROMI_CARD = { x: 24, y: 694, w: SCREEN_W - 48, h: 360 };
  const CUP_CENTERS_UV = [];
  const CUP_FRAC_X = [0.148, 0.323, 0.497, 0.673, 0.847];
  const CUP_FRAC_Y = [0.220, 0.340];
  for (const fy of CUP_FRAC_Y) {
    for (const fx of CUP_FRAC_X) {
      const px = FROMI_CARD.x + FROMI_CARD.w * fx;
      const py = FROMI_CARD.y + FROMI_CARD.h * fy;
      CUP_CENTERS_UV.push([px / SCREEN_W, py / SCREEN_H]);
    }
  }
  const CUP_HIT_R = (FROMI_CARD.w * 0.057) / SCREEN_W;

  // Carte membre — UV pour le reflet hover
  const MC_AREA = { x: 24, y: 200, w: SCREEN_W - 48, h: 300 };
  const MC_UV = {
    x0: MC_AREA.x / SCREEN_W,
    y0: MC_AREA.y / SCREEN_H,
    x1: (MC_AREA.x + MC_AREA.w) / SCREEN_W,
    y1: (MC_AREA.y + MC_AREA.h) / SCREEN_H,
  };

  function pickScreenUV(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(screenMesh, false);
    if (!hits.length) return null;
    return hits[0].uv;
  }

  // Drag
  const drag = {
    active: false,
    startX: 0, startY: 0,
    startRotX: 0, startRotY: 0,
    idleAt: performance.now(),
  };

  function onDown(x, y) {
    const uv = pickScreenUV(x, y);
    if (!uv) return;
    drag.active = true;
    drag.startX = x; drag.startY = y;
    drag.startRotY = phone.rotation.y;
    drag.startRotX = phone.rotation.x;
    canvas.style.cursor = 'grabbing';
  }

  function onMove(x, y) {
    const uv = pickScreenUV(x, y);

    if (uv && !drag.active) {
      const tx = uv.x;
      const ty = 1 - uv.y;

      // Reflet dynamique sur la carte membre
      if (tx >= MC_UV.x0 && tx <= MC_UV.x1 && ty >= MC_UV.y0 && ty <= MC_UV.y1) {
        state.screen.shine = (tx - MC_UV.x0) / (MC_UV.x1 - MC_UV.x0);
        state.screen.dirty = true;
      }

      // Détection tasse Fromi
      let hit = -1;
      for (let i = 0; i < CUP_CENTERS_UV.length; i++) {
        const [cx, cy] = CUP_CENTERS_UV[i];
        const dx = tx - cx;
        const dy = ty - cy;
        if (dx * dx + dy * dy <= CUP_HIT_R * CUP_HIT_R) {
          hit = i;
          break;
        }
      }
      if (hit !== state.screen.hoverIdx) {
        state.screen.hoverIdx = hit;
        state.screen.dirty = true;
      }
    } else if (!uv && !drag.active) {
      if (state.screen.hoverIdx !== -1) {
        state.screen.hoverIdx = -1;
        state.screen.dirty = true;
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
  }

  function onUp() {
    if (drag.active) drag.idleAt = performance.now();
    drag.active = false;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    onDown(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', () => {
    if (drag.active) onUp();
    if (state.screen.hoverIdx !== -1) {
      state.screen.hoverIdx = -1;
      state.screen.dirty = true;
    }
  });
  canvas.addEventListener('touchmove', (e) => { if (drag.active) e.preventDefault(); }, { passive: false });

  fromiImg.addEventListener('load', () => { state.screen.dirty = true; }, { once: true });

  // Resize
  const onResize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', onResize);

  // Animation loop
  const IDLE_AFTER = 2000;
  let last = performance.now();
  const start = performance.now();
  const rotStart = 0.9, rotEnd = 0.12;
  phone.rotation.y = rotStart;
  const entryDur = 1200;
  let autoShine = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Entrée
    const entry = Math.min(1, (now - start) / entryDur);
    if (entry < 1 && !drag.active) {
      const e = 1 - Math.pow(1 - entry, 3);
      phone.rotation.y = rotStart + (rotEnd - rotStart) * e;
      drag.idleAt = now;
    }

    // Oscillation idle douce
    if (!drag.active && (now - drag.idleAt) > IDLE_AFTER) {
      const t = (now - drag.idleAt) / 1000;
      phone.rotation.y = rotEnd + Math.sin(t * 0.45) * 0.08;
      phone.rotation.x += (0.03 - phone.rotation.x) * 0.03;
    }

    // Bob vertical
    phone.position.y = Math.sin(now * 0.0008) * 0.05;

    // Auto shine si pas de drag ni hover
    autoShine += dt * 0.18;
    if (autoShine > 1.6) autoShine = -0.2;
    const shineVal = drag.active ? state.screen.shine : autoShine;

    // Glow tasses : interpolation
    let glowChanged = false;
    for (let i = 0; i < 10; i++) {
      const target = i === state.screen.hoverIdx ? 1 : 0;
      const prev = state.screen.glow[i];
      state.screen.glow[i] += (target - prev) * Math.min(1, dt * 8);
      if (Math.abs(state.screen.glow[i] - prev) > 0.003) glowChanged = true;
    }

    // Redraw écran
    if (state.screen.dirty || glowChanged || Math.abs(shineVal - (state.screen._lastShine || -2)) > 0.01) {
      drawScreen(tex.image, { shine: shineVal, hover: drag.active, glow: state.screen.glow });
      tex.needsUpdate = true;
      state.screen.dirty = false;
      state.screen._lastShine = shineVal;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

/* ==========================================================
   PHONE BUILDER — style iPhone simple (v2/v3)
   ========================================================== */
function buildPhone(screenCanvas) {
  const group = new THREE.Group();

  const W = 2.3, H = 4.7, D = 0.26;
  const BEZEL = 0.07, CORNER = 0.38;

  // Châssis titane sombre
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

  // Screen
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 8;
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W - BEZEL * 2, H - BEZEL * 2),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screenMesh.position.z = D / 2 + 0.001;
  group.add(screenMesh);

  // Dynamic Island
  const island = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.105, 0.36, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4 })
  );
  island.rotation.z = Math.PI / 2;
  island.position.set(0, H / 2 - 0.30, D / 2 + 0.003);
  group.add(island);

  // Camera bump dos
  const bump = new THREE.Group();
  bump.add(new THREE.Mesh(
    new RoundedBoxGeometry(0.92, 0.92, 0.09, 4, 0.18),
    new THREE.MeshPhysicalMaterial({ color: 0x201e3e, metalness: 0.5, roughness: 0.5 })
  ));
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x222244, metalness: 0.9, roughness: 0.1, clearcoat: 1 });
  [[-0.19, 0.19], [0.19, 0.19], [0, -0.19]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 22), lensMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, 0.07);
    bump.add(ring);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.13, 22), glassMat);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y, 0.08);
    bump.add(glass);
  });
  bump.position.set(-W / 2 + 0.70, H / 2 - 0.70, -D / 2 - 0.045);
  group.add(bump);

  // Side buttons
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 0.85, roughness: 0.4 });
  const addBtn = (x, y, h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.1), btnMat);
    b.position.set(x, y, 0);
    group.add(b);
  };
  addBtn(-W / 2 - 0.005, 0.85, 0.34);
  addBtn(-W / 2 - 0.005, 0.35, 0.34);
  addBtn(-W / 2 - 0.005, 1.42, 0.24);
  addBtn(W / 2 + 0.005, 0.72, 0.55);

  return { group, screenMesh, screenTexture: screenTex, W, H, D };
}

/* ==========================================================
   SCREEN — structure empilée : header + carte Bernard Arnault
   + code-barres + carte Fromi photo
   Canvas 540 x 1100
   ========================================================== */
function drawScreen(c, opts = {}) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const { shine = 0, hover = false, glow = [] } = opts;

  // Fond Wallet sombre
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#000000');
  bg.addColorStop(1, '#0a0a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Status bar
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = '600 26px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('9:41', 34, 56);
  ctx.textAlign = 'right';
  // Signal
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(W - 170 + i * 6, 56 - (i + 1) * 2.8, 4, (i + 1) * 2.8);
  }
  ctx.font = '600 20px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('5G', W - 118, 55);
  // Battery
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 82, 44, 44, 22);
  ctx.fillRect(W - 36, 50, 3, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W - 79, 47, 38, 16);

  // ========= HEADER =========
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 40px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Cartes', 30, 124);

  // Search
  roundRect(ctx, 24, 148, W - 48, 46, 12, '#1c1c28');
  ctx.fillStyle = '#6e6e82';
  ctx.font = '500 16px Inter, sans-serif';
  ctx.fillText('🔍  Rechercher', 42, 178);

  // ========= CARTE MEMBRE BERNARD ARNAULT =========
  const MC = { x: 24, y: 210, w: W - 48, h: 300 };

  ctx.save();
  roundRectPath(ctx, MC.x, MC.y, MC.w, MC.h, 24);
  const g = ctx.createLinearGradient(MC.x, MC.y, MC.x + MC.w, MC.y + MC.h);
  g.addColorStop(0, '#2E2E80');
  g.addColorStop(0.5, '#1A1650');
  g.addColorStop(1, '#0A0830');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();

  // Halo orange
  const halo = ctx.createRadialGradient(
    MC.x + MC.w * 0.92, MC.y + MC.h * 0.15, 0,
    MC.x + MC.w * 0.92, MC.y + MC.h * 0.15, MC.w * 0.7
  );
  halo.addColorStop(0, 'rgba(255, 107, 53, 0.40)');
  halo.addColorStop(1, 'rgba(255, 107, 53, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(MC.x, MC.y, MC.w, MC.h);

  // Pattern diagonales
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let i = -MC.h; i < MC.w; i += 24) {
    ctx.beginPath();
    ctx.moveTo(MC.x + i, MC.y);
    ctx.lineTo(MC.x + i + MC.h, MC.y + MC.h);
    ctx.stroke();
  }
  ctx.restore();

  // Reflet mobile
  if (shine >= 0 && shine <= 1) {
    const sx = MC.x + MC.w * shine;
    const sw = MC.w * 0.4;
    const sheen = ctx.createLinearGradient(sx - sw / 2, MC.y, sx + sw / 2, MC.y);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, hover ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(MC.x, MC.y, MC.w, MC.h);
  }

  // Logo Namqa
  ctx.save();
  ctx.translate(MC.x + 24, MC.y + 24);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.bezierCurveTo(7, 2, 38, 0, 50, 16);
  ctx.moveTo(5, 11);
  ctx.bezierCurveTo(8, 5, 15, 5, 16, 10);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Namqa', MC.x + 84, MC.y + 46);

  // Badge AMBASSADEUR
  const bgW = 132, bgH = 24;
  const bgX = MC.x + MC.w - bgW - 22;
  const bgY = MC.y + 26;
  ctx.save();
  roundRectPath(ctx, bgX, bgY, bgW, bgH, bgH / 2);
  ctx.fillStyle = 'rgba(255, 107, 53, 0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 107, 53, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  drawStar(ctx, bgX + 14, bgY + bgH / 2, 5, 5, 2, '#FFD166');
  ctx.fillStyle = '#FFB156';
  ctx.font = '800 10px Inter, sans-serif';
  ctx.fillText('AMBASSADEUR', bgX + 28, bgY + 16);

  // Chip + sans contact
  const chipX = MC.x + 24, chipY = MC.y + 70, chipW = 48, chipH = 36;
  const chipG = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
  chipG.addColorStop(0, '#d4a85a');
  chipG.addColorStop(0.5, '#f4d890');
  chipG.addColorStop(1, '#b8903a');
  roundRect(ctx, chipX, chipY, chipW, chipH, 6, chipG);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.8;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(chipX + (chipW / 4) * i, chipY + 4);
    ctx.lineTo(chipX + (chipW / 4) * i, chipY + chipH - 4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(chipX + 4, chipY + chipH / 2);
  ctx.lineTo(chipX + chipW - 4, chipY + chipH / 2);
  ctx.stroke();

  // Sans contact
  ctx.save();
  ctx.translate(chipX + chipW + 16, chipY + chipH / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, 3 + i * 4.5, -Math.PI * 0.32, Math.PI * 0.32);
    ctx.stroke();
  }
  ctx.restore();

  // TITULAIRE
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.font = '700 10px Inter, sans-serif';
  ctx.fillText('TITULAIRE', MC.x + 24, MC.y + 134);
  // Nom
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Bernard Arnault', MC.x + 24, MC.y + 162);
  // Ligne or
  const nl = ctx.createLinearGradient(MC.x + 24, 0, MC.x + 230, 0);
  nl.addColorStop(0, '#FFD166');
  nl.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = nl;
  ctx.fillRect(MC.x + 24, MC.y + 170, 206, 1.5);

  // Points
  ctx.fillStyle = '#FF6B35';
  ctx.font = '900 48px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('1340', MC.x + 24, MC.y + 222);
  const ptsW = ctx.measureText('1340').width;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillText('pts fidélité', MC.x + 24 + ptsW + 12, MC.y + 222);

  // Chip +100
  const cbW = 86, cbH = 28;
  const cbX = MC.x + MC.w - cbW - 24;
  const cbY = MC.y + 198;
  ctx.save();
  ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
  ctx.shadowBlur = 10;
  const cg = ctx.createLinearGradient(cbX, cbY, cbX + cbW, cbY + cbH);
  cg.addColorStop(0, '#22C55E');
  cg.addColorStop(1, '#16A34A');
  roundRect(ctx, cbX, cbY, cbW, cbH, cbH / 2, cg);
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 13px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('+100 pts', cbX + cbW / 2, cbY + 19);
  ctx.textAlign = 'left';

  // N° carte
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 14px "Space Mono", monospace';
  ctx.fillText('N°  0427  8891  2024', MC.x + 24, MC.y + 252);

  // Barre progression
  const pbX = MC.x + 24, pbY = MC.y + 268, pbW = MC.w - 48, pbH = 4;
  roundRect(ctx, pbX, pbY, pbW, pbH, 2, 'rgba(255,255,255,0.15)');
  const pg = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
  pg.addColorStop(0, '#FF6B35');
  pg.addColorStop(1, '#FFD166');
  roundRect(ctx, pbX, pbY, pbW * 0.67, pbH, 2, pg);
  // Niveau
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '700 9px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('NIVEAU SUIVANT · DIAMANT', MC.x + MC.w - 24, MC.y + 252);
  ctx.textAlign = 'left';

  ctx.restore();

  // ========= CODE-BARRES =========
  const BC = { x: 24, y: 528, w: W - 48, h: 132 };
  roundRect(ctx, BC.x, BC.y, BC.w, BC.h, 16, '#ffffff');
  // Barres
  ctx.fillStyle = '#0d0d1a';
  let bx = BC.x + 28;
  let remain = BC.w - 56;
  const seed = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2];
  let si = 0;
  while (remain > 2) {
    const wBar = seed[si % seed.length];
    const gap = 2 + (si % 3);
    if (si % 2 === 0) ctx.fillRect(bx, BC.y + 20, wBar, 58);
    bx += wBar + gap;
    remain -= wBar + gap;
    si++;
  }
  // Numéro
  ctx.fillStyle = '#0d0d1a';
  ctx.font = '500 14px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('4 278 8912 0248', BC.x + BC.w / 2, BC.y + BC.h - 16);
  ctx.textAlign = 'left';

  // ========= CARTE FROMI photo réelle =========
  const FROMI = { x: 24, y: 694, w: W - 48, h: 360 };
  ctx.save();
  roundRectPath(ctx, FROMI.x, FROMI.y, FROMI.w, FROMI.h, 20);
  ctx.clip();
  ctx.fillStyle = '#3A7B3A';
  ctx.fillRect(FROMI.x, FROMI.y, FROMI.w, FROMI.h);

  if (fromiImgLoaded && fromiImg.naturalWidth > 0) {
    // Crop bord blanc + cover
    const srcPad = 0.035;
    const srcX0 = fromiImg.naturalWidth * srcPad;
    const srcY0 = fromiImg.naturalHeight * srcPad;
    const srcFullW = fromiImg.naturalWidth * (1 - srcPad * 2);
    const srcFullH = fromiImg.naturalHeight * (1 - srcPad * 2);
    const srcR = srcFullW / srcFullH;
    const dstR = FROMI.w / FROMI.h;
    let sx, sy, sw, sh;
    if (srcR > dstR) {
      sh = srcFullH;
      sw = srcFullH * dstR;
      sx = srcX0 + (srcFullW - sw) / 2;
      sy = srcY0;
    } else {
      sw = srcFullW;
      sh = srcFullW / dstR;
      sx = srcX0;
      sy = srcY0 + (srcFullH - sh) * 0.05;
    }
    ctx.drawImage(fromiImg, sx, sy, sw, sh, FROMI.x, FROMI.y, FROMI.w, FROMI.h);
  }

  // Hover glow doux sur tasses
  const cupsRel = [
    [0.148, 0.220], [0.323, 0.220], [0.497, 0.220], [0.673, 0.220], [0.847, 0.220],
    [0.148, 0.340], [0.323, 0.340], [0.497, 0.340], [0.673, 0.340], [0.847, 0.340],
  ];
  const cupR = FROMI.w * 0.057;

  cupsRel.forEach(([xr, yr], i) => {
    const amt = glow[i] || 0;
    if (amt < 0.02) return;
    const px = FROMI.x + FROMI.w * xr;
    const py = FROMI.y + FROMI.h * yr;

    // Halo radial orange
    ctx.save();
    const glowG = ctx.createRadialGradient(px, py, cupR * 0.4, px, py, cupR * 2.2);
    glowG.addColorStop(0, `rgba(255, 180, 90, ${amt * 0.55})`);
    glowG.addColorStop(0.5, `rgba(255, 107, 53, ${amt * 0.25})`);
    glowG.addColorStop(1, 'rgba(255, 107, 53, 0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(px - cupR * 2.5, py - cupR * 2.5, cupR * 5, cupR * 5);
    ctx.restore();

    // Anneau fin orange
    ctx.save();
    ctx.globalAlpha = amt * 0.8;
    ctx.strokeStyle = '#FFB156';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, cupR + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Brillance blanche centrale
    ctx.save();
    ctx.globalAlpha = amt * 0.35;
    const sh = ctx.createRadialGradient(px - cupR * 0.3, py - cupR * 0.3, 0, px - cupR * 0.3, py - cupR * 0.3, cupR * 0.7);
    sh.addColorStop(0, 'rgba(255,255,255,0.9)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(px, py, cupR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();

  // Home indicator
  roundRect(ctx, W / 2 - 66, H - 22, 132, 4, 2, 'rgba(255,255,255,0.55)');
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
function drawStar(ctx, cx, cy, spikes, outerR, innerR, color) {
  let rot = Math.PI / 2 * 3;
  let x = cx, y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
