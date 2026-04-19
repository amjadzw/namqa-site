/* ==========================================================
   NAMQA — Hero 3D scene (v4)
   - iPhone style Apple (titane, Dynamic Island, bords fins)
   - Écran = Apple Wallet avec DEUX cartes empilées :
       · Carte membre "Bernard Arnault" (stylée, interactive)
       · Carte Fromi pleine largeur (plus de bord blanc)
   - Chaque tasse se tamponne individuellement au hover (UV raycast)
   - Notification push iOS "-30%" rendue en overlay HTML
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ===== Asset preloads =====
const fromiImg = new Image();
let fromiImgLoaded = false;
fromiImg.crossOrigin = 'anonymous';
fromiImg.src = 'assets/images/carte-fromi.jpg';
fromiImg.onload = () => { fromiImgLoaded = true; };

// ===== Shared state =====
const fromiState = {
  cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  dirty: true,
  hoverIdx: -1, // carte membre hover (pour effet interactif)
  shine: 0,     // reflet animé sur carte membre
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
  renderer.toneMappingExposure = 1.05;

  // ===== Lighting (style studio Apple) =====
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(4, 7, 8);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xffa477, 0.55);
  rimLight.position.set(-6, 3, -3);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0x9aa8ff, 0.45);
  fillLight.position.set(3, -4, 4);
  scene.add(fillLight);
  // Petit reflet top pour le châssis titane
  const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
  topLight.position.set(0, 10, 3);
  scene.add(topLight);

  // ===== Build phone =====
  const { group: phone, screenMesh, screenTexture: phoneScreenTex, W: PW, H: PH } = buildPhone();
  phone.position.set(0.1, 0, 0);
  phone.rotation.y = -0.22;
  phone.rotation.x = 0.03;
  scene.add(phone);

  // ===== Ground shadow =====
  const shadowGeo = new THREE.PlaneGeometry(7, 2);
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
      opacity: 0.55,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -PH / 2 - 0.28;
  scene.add(shadow);

  // ===== Raycaster for cup hover detection =====
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

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
  // Carte membre et Fromi (positions dans le canvas écran)
  const MEMBER_AREA = { x: 30, y: 230, w: SCREEN_W - 60, h: 260 };
  const FROMI_AREA = { x: 0, y: 520, w: SCREEN_W, h: SCREEN_H - 540 };

  // Tasses : maintenant FROMI occupe toute la largeur (plus de bord blanc)
  const CUPS_ROW1_Y = FROMI_AREA.y + FROMI_AREA.h * 0.220;
  const CUPS_ROW2_Y = FROMI_AREA.y + FROMI_AREA.h * 0.340;
  const CUPS_X = [0.148, 0.323, 0.497, 0.673, 0.847].map(
    fx => FROMI_AREA.x + FROMI_AREA.w * fx
  );
  const CUP_R_PX = FROMI_AREA.w * 0.057;

  const cupCentersUV = [];
  for (const yPx of [CUPS_ROW1_Y, CUPS_ROW2_Y]) {
    for (const xPx of CUPS_X) {
      cupCentersUV.push([xPx / SCREEN_W, yPx / SCREEN_H]);
    }
  }
  const CUP_HIT_RADIUS_UV = CUP_R_PX / SCREEN_W;

  // Carte membre UV pour hover interactif
  const MEMBER_UV = {
    x0: MEMBER_AREA.x / SCREEN_W,
    y0: MEMBER_AREA.y / SCREEN_H,
    x1: (MEMBER_AREA.x + MEMBER_AREA.w) / SCREEN_W,
    y1: (MEMBER_AREA.y + MEMBER_AREA.h) / SCREEN_H,
  };

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

    if (uv && !drag.active) {
      const tx = uv.x;
      const ty = 1 - uv.y;

      // Hover tasses
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

      // Hover carte membre
      if (tx >= MEMBER_UV.x0 && tx <= MEMBER_UV.x1 && ty >= MEMBER_UV.y0 && ty <= MEMBER_UV.y1) {
        const relX = (tx - MEMBER_UV.x0) / (MEMBER_UV.x1 - MEMBER_UV.x0);
        fromiState.hoverIdx = 1;
        fromiState.shine = relX; // position du reflet suit le curseur
        fromiState.dirty = true;
      } else if (fromiState.hoverIdx !== -1) {
        fromiState.hoverIdx = -1;
        fromiState.dirty = true;
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
  canvas.addEventListener('pointerleave', () => {
    if (drag.active) onUp();
    if (fromiState.hoverIdx !== -1) {
      fromiState.hoverIdx = -1;
      fromiState.dirty = true;
    }
  });
  canvas.addEventListener('touchmove', (e) => { if (drag.active) e.preventDefault(); }, { passive: false });

  fromiImg.addEventListener('load', () => { fromiState.dirty = true; }, { once: true });

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
  const entryRotEnd = -0.22;
  phone.rotation.y = entryRotStart;
  const entryDuration = 1200;
  const cupDisplayed = new Array(10).fill(0);
  let autoShine = 0;

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
      phone.rotation.y = entryRotEnd + Math.sin(t * 0.5) * 0.08;
      phone.rotation.x += (0.03 - phone.rotation.x) * 0.03;
    }

    // Bob vertical léger
    phone.position.y = Math.sin(now * 0.0008) * 0.05;

    // Animation tampons
    let cupsChanged = false;
    for (let i = 0; i < 10; i++) {
      const target = fromiState.cups[i];
      const prev = cupDisplayed[i];
      cupDisplayed[i] += (target - cupDisplayed[i]) * Math.min(1, dt * 8);
      if (Math.abs(cupDisplayed[i] - prev) > 0.002) cupsChanged = true;
    }

    // Reflet automatique lent sur carte membre (style Apple)
    autoShine += dt * 0.18;
    if (autoShine > 1.6) autoShine = -0.2;
    const shineVal = fromiState.hoverIdx === 1 ? fromiState.shine : autoShine;

    if (cupsChanged || fromiState.dirty || Math.abs(shineVal - fromiState._lastShine) > 0.01) {
      drawWalletScreen(phoneScreenTex.image, cupDisplayed, {
        shine: shineVal,
        hover: fromiState.hoverIdx === 1,
      });
      phoneScreenTex.needsUpdate = true;
      fromiState.dirty = false;
      fromiState._lastShine = shineVal;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

/* ==========================================================
   PHONE BUILDER — iPhone 15 Pro (titane naturel, bords fins)
   ========================================================== */
function buildPhone() {
  const group = new THREE.Group();

  // Proportions iPhone 15 Pro réel : ratio ~2.03 (H/W). W=2.4 → H=4.88
  const W = 2.4, H = 4.88, D = 0.26;
  const BEZEL = 0.055;      // bords plus fins style Apple
  const CORNER = 0.42;
  const INNER_RADIUS = 0.36; // écran à coins arrondis

  // ===== Titanium frame (gris titane naturel Apple) =====
  const titanium = new THREE.MeshPhysicalMaterial({
    color: 0x5a5f6a,           // titane naturel
    metalness: 1.0,
    roughness: 0.28,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
    reflectivity: 0.6,
  });
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(W, H, D, 10, CORNER),
    titanium
  );
  group.add(frame);

  // ===== Back glass (gris sombre Apple, légère translucidité) =====
  const backGlass = new THREE.MeshPhysicalMaterial({
    color: 0x2a2d35,
    metalness: 0.3,
    roughness: 0.55,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });
  const back = new THREE.Mesh(
    new RoundedBoxGeometry(W - 0.02, H - 0.02, D + 0.005, 10, CORNER - 0.005),
    backGlass
  );
  back.position.z = -0.003;
  group.add(back);

  // ===== Screen bezel noir (ligne fine autour de l'écran) =====
  const bezelMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bezelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W - BEZEL * 1.5, H - BEZEL * 1.5),
    bezelMat
  );
  bezelMesh.position.z = D / 2 + 0.0005;
  group.add(bezelMesh);

  // ===== Screen texture =====
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 540;
  screenCanvas.height = 1100;
  drawWalletScreen(screenCanvas, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { shine: 0, hover: false });
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 8;
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W - BEZEL * 2, H - BEZEL * 2),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screenMesh.position.z = D / 2 + 0.0015;
  group.add(screenMesh);

  // ===== Dynamic Island (proportions iPhone 15 Pro réelles) =====
  const island = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.095, 0.38, 4, 16),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3, metalness: 0.1 })
  );
  island.rotation.z = Math.PI / 2;
  island.position.set(0, H / 2 - 0.26, D / 2 + 0.004);
  group.add(island);

  // Petit reflet sur Dynamic Island (caméra)
  const islandLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.04, 20),
    new THREE.MeshPhysicalMaterial({ color: 0x0a1022, metalness: 0.9, roughness: 0.1, clearcoat: 1 })
  );
  islandLens.position.set(0.15, H / 2 - 0.26, D / 2 + 0.008);
  group.add(islandLens);

  // ===== Camera bump (3 objectifs iPhone 15 Pro) =====
  const bump = new THREE.Group();

  // Plateau caméra carré avec coins arrondis (style Apple)
  bump.add(new THREE.Mesh(
    new RoundedBoxGeometry(0.98, 0.98, 0.085, 4, 0.20),
    new THREE.MeshPhysicalMaterial({
      color: 0x3a3d45,
      metalness: 0.85,
      roughness: 0.35,
      clearcoat: 0.5,
    })
  ));

  const lensRing = new THREE.MeshPhysicalMaterial({
    color: 0x1a1c22,
    metalness: 0.9,
    roughness: 0.25,
    clearcoat: 0.6,
  });
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0a0e18,
    metalness: 0.95,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  // 3 lentilles : top-left, top-right, bottom
  [[-0.20, 0.20], [0.20, 0.20], [-0.20, -0.20]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.11, 28), lensRing);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, 0.06);
    bump.add(ring);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 28), lensGlass);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y, 0.075);
    bump.add(glass);
    // Reflet central
    const reflect = new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 16),
      new THREE.MeshBasicMaterial({ color: 0x8fa8d4, transparent: true, opacity: 0.4 })
    );
    reflect.position.set(x - 0.05, y + 0.05, 0.14);
    bump.add(reflect);
  });
  // Flash LED (coin bas-droit)
  const flash = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 20),
    new THREE.MeshBasicMaterial({ color: 0xf3f4ef })
  );
  flash.position.set(0.22, -0.20, 0.14);
  bump.add(flash);
  // Micro (petit point)
  const lidar = new THREE.Mesh(
    new THREE.CircleGeometry(0.035, 16),
    new THREE.MeshBasicMaterial({ color: 0x222533 })
  );
  lidar.position.set(0.22, 0.00, 0.14);
  bump.add(lidar);

  bump.position.set(-W / 2 + 0.72, H / 2 - 0.72, -D / 2 - 0.035);
  group.add(bump);

  // ===== Side buttons (Action button, volume, power) =====
  const btnMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a5f6a,
    metalness: 1.0,
    roughness: 0.28,
    clearcoat: 0.4,
  });
  const addBtn = (x, y, h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.025, h, 0.11), btnMat);
    b.position.set(x, y, 0);
    group.add(b);
  };
  // Gauche : Action button (tall/unique), volume up, volume down
  addBtn(-W / 2 - 0.003, 1.50, 0.28);  // Action button
  addBtn(-W / 2 - 0.003, 0.95, 0.40);  // Volume +
  addBtn(-W / 2 - 0.003, 0.35, 0.40);  // Volume -
  // Droite : Power
  addBtn(W / 2 + 0.003, 0.80, 0.65);   // Power

  return { group, screenMesh, screenTexture: screenTex, W, H, D };
}

/* ==========================================================
   WALLET SCREEN — deux cartes empilées comme Apple Wallet
   Canvas 540 x 1100.
   ========================================================== */
function drawWalletScreen(c, cups, opts = {}) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const { shine = 0, hover = false } = opts;
  ctx.clearRect(0, 0, W, H);

  // Background iOS Wallet — dégradé subtil noir→gris foncé
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#000000');
  bg.addColorStop(1, '#0a0a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // === Status bar iOS ===
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = '600 26px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('9:41', 40, 56);
  // Icônes droite
  // Signal (4 barres)
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(W - 170 + i * 7, 56 - (i + 1) * 3, 5, (i + 1) * 3);
  }
  ctx.textAlign = 'right';
  ctx.font = '600 20px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('5G', W - 120, 55);
  // Batterie
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 82, 42, 44, 22);
  ctx.fillRect(W - 37, 48, 3, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W - 79, 45, 38, 16);

  ctx.textAlign = 'left';

  // === Titre "Cartes" ===
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px -apple-system, "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Cartes', 36, 130);

  // === Search bar ===
  roundRect(ctx, 30, 158, W - 60, 48, 12, '#1c1c28');
  ctx.fillStyle = '#6e6e82';
  ctx.font = '500 17px -apple-system, Inter, sans-serif';
  ctx.fillText('🔍  Rechercher', 50, 188);

  /* ----------------------------------------------------------
     CARTE MEMBRE — Bernard Arnault, premium interactive
  ---------------------------------------------------------- */
  const MC = { x: 30, y: 230, w: W - 60, h: 260 };

  // Hover : légère élévation visuelle (ombre plus marquée)
  if (hover) {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 107, 53, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    roundRectPath(ctx, MC.x, MC.y, MC.w, MC.h, 24);
    ctx.fillStyle = 'rgba(0,0,0,0.01)';
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRectPath(ctx, MC.x, MC.y, MC.w, MC.h, 24);

  // Fond indigo ultra premium avec nuances
  const mcg = ctx.createLinearGradient(MC.x, MC.y, MC.x + MC.w, MC.y + MC.h);
  mcg.addColorStop(0, '#2E2E80');
  mcg.addColorStop(0.45, '#1A1650');
  mcg.addColorStop(1, '#0A0830');
  ctx.fillStyle = mcg;
  ctx.fill();
  ctx.clip();

  // Halo orange diffus en coin
  const halo = ctx.createRadialGradient(
    MC.x + MC.w * 0.92, MC.y + MC.h * 0.15, 0,
    MC.x + MC.w * 0.92, MC.y + MC.h * 0.15, MC.w * 0.65
  );
  halo.addColorStop(0, 'rgba(255, 107, 53, 0.40)');
  halo.addColorStop(0.5, 'rgba(255, 107, 53, 0.12)');
  halo.addColorStop(1, 'rgba(255, 107, 53, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(MC.x, MC.y, MC.w, MC.h);

  // Pattern subtil : lignes diagonales (style luxe)
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let i = -MC.h; i < MC.w; i += 22) {
    ctx.beginPath();
    ctx.moveTo(MC.x + i, MC.y);
    ctx.lineTo(MC.x + i + MC.h, MC.y + MC.h);
    ctx.stroke();
  }
  ctx.restore();

  // === Reflet mobile (shine qui suit le curseur OU animé lentement) ===
  if (shine >= 0 && shine <= 1) {
    const shineX = MC.x + MC.w * shine;
    const shineW = MC.w * 0.35;
    const sheen = ctx.createLinearGradient(shineX - shineW / 2, MC.y, shineX + shineW / 2, MC.y);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, hover ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(MC.x, MC.y, MC.w, MC.h);
  }

  // === Logo Namqa (mouton stylisé) en haut à gauche ===
  ctx.save();
  ctx.translate(MC.x + 24, MC.y + 22);
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
  ctx.fillText('Namqa', MC.x + 78, MC.y + 42);

  // === Badge AMBASSADEUR (droite haut) ===
  const badgeW = 120, badgeH = 22;
  const badgeX = MC.x + MC.w - badgeW - 22;
  const badgeY = MC.y + 24;
  // Fond transparent avec bordure orange
  ctx.save();
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = 'rgba(255, 107, 53, 0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 107, 53, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  // Étoile + texte
  drawStar(ctx, badgeX + 14, badgeY + badgeH / 2, 5, 5, 2, '#FFD166');
  ctx.fillStyle = '#FFB156';
  ctx.font = '800 10px Inter, sans-serif';
  ctx.letterSpacing = '0.05em';
  ctx.fillText('AMBASSADEUR', badgeX + 26, badgeY + 15);

  // === Chip/puce (style carte bancaire premium) en 2ème ligne ===
  const chipX = MC.x + 24, chipY = MC.y + 62, chipW = 42, chipH = 30;
  const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
  chipGrad.addColorStop(0, '#d4a85a');
  chipGrad.addColorStop(0.5, '#f4d890');
  chipGrad.addColorStop(1, '#b8903a');
  roundRect(ctx, chipX, chipY, chipW, chipH, 5, chipGrad);
  // Stries sur la puce
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

  // === Sans contact (wifi sideways) à droite du chip ===
  ctx.save();
  ctx.translate(chipX + chipW + 14, chipY + chipH / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const r = 3 + i * 4;
    ctx.arc(0, 0, r, -Math.PI * 0.32, Math.PI * 0.32);
    ctx.stroke();
  }
  ctx.restore();

  // === Nom titulaire (Bernard Arnault) — style premium ===
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '600 9px Inter, sans-serif';
  ctx.fillText('TITULAIRE', MC.x + 24, MC.y + 118);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 26px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Bernard Arnault', MC.x + 24, MC.y + 140);

  // Petite ligne dorée décorative sous le nom
  const nameLineGrad = ctx.createLinearGradient(MC.x + 24, 0, MC.x + 200, 0);
  nameLineGrad.addColorStop(0, '#FFD166');
  nameLineGrad.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = nameLineGrad;
  ctx.fillRect(MC.x + 24, MC.y + 148, 180, 1.5);

  // === Solde points — gros, orange vibrant ===
  const stamped = cups.reduce((a, b) => a + b, 0);
  const bonusPts = Math.round(stamped * 10);
  const pts = 1240 + bonusPts;
  const ptsStr = pts.toLocaleString('fr-FR').replace(/,/g, ' ');
  ctx.fillStyle = '#FF6B35';
  ctx.font = '900 44px "Space Grotesk", Inter, sans-serif';
  ctx.fillText(ptsStr, MC.x + 24, MC.y + 194);
  const ptsW = ctx.measureText(ptsStr).width;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.fillText('pts fidélité', MC.x + 24 + ptsW + 10, MC.y + 194);

  // === Chip +N pts si bonus (animé) ===
  if (bonusPts > 0) {
    const chipBW = 82, chipBH = 28;
    const chipBX = MC.x + MC.w - chipBW - 22;
    const chipBY = MC.y + 168;
    // Ombre verte
    ctx.save();
    ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
    ctx.shadowBlur = 12;
    const chipGradG = ctx.createLinearGradient(chipBX, chipBY, chipBX + chipBW, chipBY + chipBH);
    chipGradG.addColorStop(0, '#22C55E');
    chipGradG.addColorStop(1, '#16A34A');
    roundRect(ctx, chipBX, chipBY, chipBW, chipBH, chipBH / 2, chipGradG);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${bonusPts} pts`, chipBX + chipBW / 2, chipBY + 19);
    ctx.textAlign = 'left';
  }

  // === Numéro carte (espacé style carte bancaire) ===
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 13px "Space Mono", monospace';
  ctx.fillText('N°  0427  8891  2024', MC.x + 24, MC.y + 222);

  // === Barre progression gold→diamant avec pourcentage ===
  const pbX = MC.x + 24, pbY = MC.y + 236, pbW = MC.w - 48, pbH = 4;
  roundRect(ctx, pbX, pbY, pbW, pbH, 2, 'rgba(255,255,255,0.15)');
  const frac = Math.min(1, pts / 2000);
  const pg = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
  pg.addColorStop(0, '#FF6B35');
  pg.addColorStop(0.5, '#FFB156');
  pg.addColorStop(1, '#FFD166');
  roundRect(ctx, pbX, pbY, pbW * frac, pbH, 2, pg);

  // Niveau suivant : "Diamant · 2000 pts"
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 9px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('NIVEAU SUIVANT · DIAMANT', MC.x + MC.w - 24, MC.y + 222);
  ctx.textAlign = 'left';

  ctx.restore();

  /* ----------------------------------------------------------
     CARTE FROMI — SANS bord blanc, pleine largeur
  ---------------------------------------------------------- */
  const FROMI = { x: 0, y: 520, w: W, h: H - 540 };
  ctx.save();

  // Pas d'arrondi (bord-à-bord avec le téléphone comme une vraie carte wallet)
  ctx.fillStyle = '#3A7B3A';
  ctx.fillRect(FROMI.x, FROMI.y, FROMI.w, FROMI.h);

  if (fromiImgLoaded && fromiImg.naturalWidth > 0) {
    // On "crop" le bord blanc de l'image source. Ratio source ~0.731 (1080/1478).
    // Notre zone a un ratio W/H = 540/580 ≈ 0.93 → on doit cover sans déformer les tasses.
    // Stratégie : crop "cover" qui remplit la largeur et centre verticalement.
    const srcCropPad = 0.035; // bord blanc à supprimer
    const srcX0 = fromiImg.naturalWidth * srcCropPad;
    const srcY0 = fromiImg.naturalHeight * srcCropPad;
    const srcFullW = fromiImg.naturalWidth * (1 - srcCropPad * 2);
    const srcFullH = fromiImg.naturalHeight * (1 - srcCropPad * 2);
    const srcRatio = srcFullW / srcFullH;
    const dstRatio = FROMI.w / FROMI.h;
    let sx, sy, sw, sh;
    if (srcRatio > dstRatio) {
      // source plus large → on crop les côtés
      sh = srcFullH;
      sw = srcFullH * dstRatio;
      sx = srcX0 + (srcFullW - sw) / 2;
      sy = srcY0;
    } else {
      // source plus haute → on crop haut/bas (garder centre = tasses + mouton + code-barre)
      sw = srcFullW;
      sh = srcFullW / dstRatio;
      sx = srcX0;
      sy = srcY0 + (srcFullH - sh) * 0.05; // légèrement vers le haut pour garder logo + tasses
    }
    ctx.drawImage(
      fromiImg,
      sx, sy, sw, sh,
      FROMI.x, FROMI.y, FROMI.w, FROMI.h
    );
  }

  // --- Overlay tampons individuels ---
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
    ctx.beginPath();
    ctx.arc(px, py, cupR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = `rgba(18, 18, 24, ${amt})`;
    ctx.fillRect(px - cupR, py - cupR, cupR * 2, cupR * 2);

    if (amt > 0.3) {
      const iconA = Math.min(1, (amt - 0.3) * 2);
      ctx.globalAlpha = iconA;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = cupR * 0.14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const cw = cupR * 0.80;
      ctx.beginPath();
      ctx.moveTo(px - cw * 0.5, py - cupR * 0.15);
      ctx.lineTo(px + cw * 0.4, py - cupR * 0.15);
      ctx.lineTo(px + cw * 0.32, py + cupR * 0.45);
      ctx.lineTo(px - cw * 0.42, py + cupR * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + cw * 0.55, py + cupR * 0.05, cupR * 0.22, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }

    ctx.restore();

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

  // Home indicator iOS
  roundRect(ctx, W / 2 - 65, H - 22, 130, 5, 3, 'rgba(255,255,255,0.6)');
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
