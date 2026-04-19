/* ==========================================================
   NAMQA — Hero 3D scene (v5)
   DEUX téléphones parallèles dans le même canvas :
     · Gauche  → carte membre Bernard Arnault uniquement
     · Droite  → carte Fromi photo réelle + hover "glow" doux sur tasses
   Châssis iPhone style v2/v3 (simple, cream/dark, Dynamic Island)
   ========================================================== */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ===== Assets =====
const fromiImg = new Image();
let fromiImgLoaded = false;
fromiImg.crossOrigin = 'anonymous';
fromiImg.src = 'assets/images/carte-fromi.jpg';
fromiImg.onload = () => { fromiImgLoaded = true; };

// État global partagé
const state = {
  member: {
    dirty: true,
    shine: 0, // reflet anime sur la carte membre
  },
  fromi: {
    dirty: true,
    hoverIdx: -1,      // index de la tasse survolee, -1 si aucune
    glow: new Array(10).fill(0), // intensite du glow par tasse, 0-1
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

  // Camera un peu plus large pour tenir 2 telephones
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
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

  // --- Construire 2 telephones ---
  const SCREEN_W = 480;  // canvas texture width
  const SCREEN_H = 1000; // canvas texture height

  // Phone MEMBER (gauche)
  const memberScreenCanvas = document.createElement('canvas');
  memberScreenCanvas.width = SCREEN_W;
  memberScreenCanvas.height = SCREEN_H;
  drawMemberScreen(memberScreenCanvas, { shine: 0, hover: false });
  const { group: memberPhone, screenMesh: memberScreen, screenTexture: memberTex, W: PW, H: PH } =
    buildPhone(memberScreenCanvas);
  memberPhone.position.set(-1.80, 0.15, 0);
  memberPhone.rotation.y = 0.24;   // tourne vers l'interieur (droite)
  memberPhone.rotation.x = 0.04;
  scene.add(memberPhone);

  // Phone FROMI (droite)
  const fromiScreenCanvas = document.createElement('canvas');
  fromiScreenCanvas.width = SCREEN_W;
  fromiScreenCanvas.height = SCREEN_H;
  drawFromiScreen(fromiScreenCanvas, state.fromi.glow);
  const { group: fromiPhone, screenMesh: fromiScreen, screenTexture: fromiTex } =
    buildPhone(fromiScreenCanvas);
  fromiPhone.position.set(1.80, -0.15, 0);
  fromiPhone.rotation.y = -0.24;   // tourne vers l'interieur (gauche)
  fromiPhone.rotation.x = 0.04;
  scene.add(fromiPhone);

  // Ombres individuelles
  [memberPhone, fromiPhone].forEach((p) => {
    const sC = document.createElement('canvas');
    sC.width = 512; sC.height = 128;
    const sCtx = sC.getContext('2d');
    const grd = sCtx.createRadialGradient(256, 64, 10, 256, 64, 220);
    grd.addColorStop(0, 'rgba(0,0,0,0.40)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grd;
    sCtx.fillRect(0, 0, 512, 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.0),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(sC),
        transparent: true,
        opacity: 0.5,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(p.position.x, -PH / 2 - 0.25, 0);
    scene.add(shadow);
  });

  // ===== Raycasting =====
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Cup positions dans la texture écran Fromi
  // Carte Fromi = zone pleine largeur de l'écran (sans bord blanc)
  // y row1 ~ 0.22, row2 ~ 0.34 en fraction de l'écran Fromi occupé (y=120 à 780)
  const FROMI_CARD = { x: 0, y: 120, w: SCREEN_W, h: 660 };
  const CUP_CENTERS_UV = []; // UV (0..1) dans la texture du phone Fromi
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

  function pickScreenUV(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([memberScreen, fromiScreen], false);
    if (!hits.length) return { phone: null, uv: null };
    return {
      phone: hits[0].object === memberScreen ? 'member' : 'fromi',
      uv: hits[0].uv,
    };
  }

  // Member card area UV (hover pour reflet)
  const MC_AREA = { x: 30, y: 200, w: SCREEN_W - 60, h: 260 };
  const MC_UV = {
    x0: MC_AREA.x / SCREEN_W,
    y0: MC_AREA.y / SCREEN_H,
    x1: (MC_AREA.x + MC_AREA.w) / SCREEN_W,
    y1: (MC_AREA.y + MC_AREA.h) / SCREEN_H,
  };

  // Drag
  const drag = {
    active: false,
    which: null, // 'member' | 'fromi'
    startX: 0, startY: 0,
    startRotX: 0, startRotY: 0,
    idleAt: performance.now(),
  };

  function onDown(x, y) {
    const { phone, uv } = pickScreenUV(x, y);
    if (!uv) return;
    drag.active = true;
    drag.which = phone;
    drag.startX = x; drag.startY = y;
    const target = phone === 'member' ? memberPhone : fromiPhone;
    drag.startRotY = target.rotation.y;
    drag.startRotX = target.rotation.x;
    canvas.style.cursor = 'grabbing';
  }

  function onMove(x, y) {
    const { phone, uv } = pickScreenUV(x, y);

    if (uv && !drag.active) {
      const tx = uv.x;
      const ty = 1 - uv.y;

      if (phone === 'member') {
        // Hover reflet sur la carte membre
        if (tx >= MC_UV.x0 && tx <= MC_UV.x1 && ty >= MC_UV.y0 && ty <= MC_UV.y1) {
          state.member.shine = (tx - MC_UV.x0) / (MC_UV.x1 - MC_UV.x0);
          state.member.dirty = true;
        }
        // reset hover fromi
        if (state.fromi.hoverIdx !== -1) {
          state.fromi.hoverIdx = -1;
          state.fromi.dirty = true;
        }
      } else if (phone === 'fromi') {
        // Detecte tasse sous le curseur
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
        if (hit !== state.fromi.hoverIdx) {
          state.fromi.hoverIdx = hit;
          state.fromi.dirty = true;
        }
      }
    } else if (!uv && !drag.active) {
      if (state.fromi.hoverIdx !== -1) {
        state.fromi.hoverIdx = -1;
        state.fromi.dirty = true;
      }
    }

    if (!drag.active) {
      canvas.style.cursor = uv ? 'grab' : 'default';
      return;
    }
    const target = drag.which === 'member' ? memberPhone : fromiPhone;
    const dxp = x - drag.startX;
    const dyp = y - drag.startY;
    target.rotation.y = drag.startRotY + dxp * 0.007;
    target.rotation.x = Math.max(-0.8, Math.min(0.8, drag.startRotX + dyp * 0.006));
  }

  function onUp() {
    if (drag.active) drag.idleAt = performance.now();
    drag.active = false;
    drag.which = null;
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
    if (state.fromi.hoverIdx !== -1) {
      state.fromi.hoverIdx = -1;
      state.fromi.dirty = true;
    }
  });
  canvas.addEventListener('touchmove', (e) => { if (drag.active) e.preventDefault(); }, { passive: false });

  fromiImg.addEventListener('load', () => { state.fromi.dirty = true; }, { once: true });

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
  const memberRotStart = 0.9, fromiRotStart = -0.9;
  const memberRotEnd = 0.24, fromiRotEnd = -0.24;
  memberPhone.rotation.y = memberRotStart;
  fromiPhone.rotation.y = fromiRotStart;
  const entryDur = 1200;
  let autoShine = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Entree
    const entry = Math.min(1, (now - start) / entryDur);
    if (entry < 1 && !drag.active) {
      const e = 1 - Math.pow(1 - entry, 3);
      memberPhone.rotation.y = memberRotStart + (memberRotEnd - memberRotStart) * e;
      fromiPhone.rotation.y = fromiRotStart + (fromiRotEnd - fromiRotStart) * e;
      drag.idleAt = now;
    }

    // Oscillation idle douce (dephased)
    if (!drag.active && (now - drag.idleAt) > IDLE_AFTER) {
      const t = (now - drag.idleAt) / 1000;
      memberPhone.rotation.y = memberRotEnd + Math.sin(t * 0.5) * 0.07;
      fromiPhone.rotation.y = fromiRotEnd + Math.sin(t * 0.5 + Math.PI) * 0.07;
      memberPhone.rotation.x += (0.04 - memberPhone.rotation.x) * 0.03;
      fromiPhone.rotation.x += (0.04 - fromiPhone.rotation.x) * 0.03;
    }

    // Bob vertical leger, dephases
    memberPhone.position.y = 0.15 + Math.sin(now * 0.0008) * 0.05;
    fromiPhone.position.y = -0.15 + Math.sin(now * 0.0008 + Math.PI) * 0.05;

    // Auto shine carte membre
    autoShine += dt * 0.18;
    if (autoShine > 1.6) autoShine = -0.2;
    const memberShineVal = drag.which === null ? state.member.shine : autoShine;

    // Glow tasses Fromi : interpolation vers target
    let fromiGlowChanged = false;
    for (let i = 0; i < 10; i++) {
      const target = i === state.fromi.hoverIdx ? 1 : 0;
      const prev = state.fromi.glow[i];
      state.fromi.glow[i] += (target - prev) * Math.min(1, dt * 8);
      if (Math.abs(state.fromi.glow[i] - prev) > 0.003) fromiGlowChanged = true;
    }

    // Redraw member
    if (state.member.dirty || Math.abs(memberShineVal - (state.member._lastShine || -2)) > 0.01) {
      drawMemberScreen(memberTex.image, { shine: memberShineVal, hover: drag.which === 'member' });
      memberTex.needsUpdate = true;
      state.member.dirty = false;
      state.member._lastShine = memberShineVal;
    }
    // Redraw fromi
    if (state.fromi.dirty || fromiGlowChanged) {
      drawFromiScreen(fromiTex.image, state.fromi.glow);
      fromiTex.needsUpdate = true;
      state.fromi.dirty = false;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

/* ==========================================================
   PHONE BUILDER — style iPhone simple (v2/v3 style retenu)
   ========================================================== */
function buildPhone(screenCanvas) {
  const group = new THREE.Group();

  const W = 2.0, H = 4.1, D = 0.24;
  const BEZEL = 0.06, CORNER = 0.34;

  // Châssis (titane sombre type v2/v3)
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
    new THREE.CapsuleGeometry(0.095, 0.32, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4 })
  );
  island.rotation.z = Math.PI / 2;
  island.position.set(0, H / 2 - 0.26, D / 2 + 0.003);
  group.add(island);

  // Camera bump dos
  const bump = new THREE.Group();
  bump.add(new THREE.Mesh(
    new RoundedBoxGeometry(0.82, 0.82, 0.08, 4, 0.16),
    new THREE.MeshPhysicalMaterial({ color: 0x201e3e, metalness: 0.5, roughness: 0.5 })
  ));
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a14, metalness: 0.9, roughness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x222244, metalness: 0.9, roughness: 0.1, clearcoat: 1 });
  [[-0.17, 0.17], [0.17, 0.17], [0, -0.17]].forEach(([x, y]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 22), lensMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, 0.06);
    bump.add(ring);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.12, 22), glassMat);
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
  addBtn(-W / 2 - 0.005, 0.75, 0.30);
  addBtn(-W / 2 - 0.005, 0.3, 0.30);
  addBtn(-W / 2 - 0.005, 1.25, 0.22);
  addBtn(W / 2 + 0.005, 0.65, 0.5);

  return { group, screenMesh, screenTexture: screenTex, W, H, D };
}

/* ==========================================================
   MEMBER SCREEN — Bernard Arnault, carte bancaire Apple Wallet
   Canvas 480 x 1000
   ========================================================== */
function drawMemberScreen(c, opts = {}) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const { shine = 0, hover = false } = opts;

  // Fond Wallet
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#000000');
  bg.addColorStop(1, '#0a0a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Status bar
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = '600 24px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('9:41', 32, 52);
  ctx.textAlign = 'right';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(W - 155 + i * 6, 52 - (i + 1) * 2.5, 4, (i + 1) * 2.5);
  }
  ctx.font = '600 18px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('5G', W - 110, 51);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 76, 40, 40, 20);
  ctx.fillRect(W - 34, 46, 3, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W - 73, 43, 34, 14);

  ctx.textAlign = 'left';
  // Titre
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Cartes', 30, 118);

  // Search
  roundRect(ctx, 24, 142, W - 48, 44, 12, '#1c1c28');
  ctx.fillStyle = '#6e6e82';
  ctx.font = '500 16px Inter, sans-serif';
  ctx.fillText('🔍  Rechercher', 42, 170);

  // ========= CARTE MEMBRE =========
  const MC = { x: 24, y: 206, w: W - 48, h: 260 };

  // Fond indigo premium
  ctx.save();
  roundRectPath(ctx, MC.x, MC.y, MC.w, MC.h, 22);
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
  for (let i = -MC.h; i < MC.w; i += 22) {
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
  ctx.translate(MC.x + 22, MC.y + 22);
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
  ctx.fillText('Namqa', MC.x + 76, MC.y + 42);

  // Badge AMBASSADEUR (droite haut)
  const bgW = 120, bgH = 22;
  const bgX = MC.x + MC.w - bgW - 20;
  const bgY = MC.y + 24;
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
  ctx.fillText('AMBASSADEUR', bgX + 26, bgY + 15);

  // Chip + sans contact
  const chipX = MC.x + 22, chipY = MC.y + 62, chipW = 44, chipH = 32;
  const chipG = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
  chipG.addColorStop(0, '#d4a85a');
  chipG.addColorStop(0.5, '#f4d890');
  chipG.addColorStop(1, '#b8903a');
  roundRect(ctx, chipX, chipY, chipW, chipH, 5, chipG);
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
  ctx.translate(chipX + chipW + 14, chipY + chipH / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, 3 + i * 4, -Math.PI * 0.32, Math.PI * 0.32);
    ctx.stroke();
  }
  ctx.restore();

  // TITULAIRE
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.font = '700 9px Inter, sans-serif';
  ctx.fillText('TITULAIRE', MC.x + 22, MC.y + 120);
  // Nom
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 26px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('Bernard Arnault', MC.x + 22, MC.y + 144);
  // Ligne or
  const nl = ctx.createLinearGradient(MC.x + 22, 0, MC.x + 210, 0);
  nl.addColorStop(0, '#FFD166');
  nl.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = nl;
  ctx.fillRect(MC.x + 22, MC.y + 152, 188, 1.5);

  // Points
  ctx.fillStyle = '#FF6B35';
  ctx.font = '900 44px "Space Grotesk", Inter, sans-serif';
  ctx.fillText('1340', MC.x + 22, MC.y + 198);
  const ptsW = ctx.measureText('1340').width;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.fillText('pts fidélité', MC.x + 22 + ptsW + 10, MC.y + 198);

  // Chip +100
  const cbW = 78, cbH = 26;
  const cbX = MC.x + MC.w - cbW - 22;
  const cbY = MC.y + 176;
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
  ctx.fillText('+100 pts', cbX + cbW / 2, cbY + 18);
  ctx.textAlign = 'left';

  // N° carte
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 13px "Space Mono", monospace';
  ctx.fillText('N°  0427  8891  2024', MC.x + 22, MC.y + 226);

  // Barre progression
  const pbX = MC.x + 22, pbY = MC.y + 240, pbW = MC.w - 44, pbH = 4;
  roundRect(ctx, pbX, pbY, pbW, pbH, 2, 'rgba(255,255,255,0.15)');
  const pg = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
  pg.addColorStop(0, '#FF6B35');
  pg.addColorStop(1, '#FFD166');
  roundRect(ctx, pbX, pbY, pbW * 0.67, pbH, 2, pg);
  // Niveau
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '700 9px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('NIVEAU SUIVANT · DIAMANT', MC.x + MC.w - 22, MC.y + 226);
  ctx.textAlign = 'left';

  ctx.restore();

  // Encart info en bas (détails)
  const INFO = { x: 24, y: 500, w: W - 48, h: 160 };
  roundRect(ctx, INFO.x, INFO.y, INFO.w, INFO.h, 18, '#1c1c28');
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '700 10px Inter, sans-serif';
  ctx.fillText('DÉTAILS DE LA CARTE', INFO.x + 18, INFO.y + 26);

  // 3 lignes info
  const lines = [
    ['Membre depuis', 'Mars 2024'],
    ['Points cumulés', '3 480 pts'],
    ['Récompenses', '5 utilisées'],
  ];
  lines.forEach(([k, v], i) => {
    const yy = INFO.y + 56 + i * 30;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(k, INFO.x + 18, yy);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v, INFO.x + INFO.w - 18, yy);
    ctx.textAlign = 'left';
  });

  // Home indicator
  roundRect(ctx, W / 2 - 60, H - 20, 120, 4, 2, 'rgba(255,255,255,0.55)');
}

/* ==========================================================
   FROMI SCREEN — photo réelle, hover "glow" doux
   Canvas 480 x 1000
   ========================================================== */
function drawFromiScreen(c, cupGlow) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;

  // Fond Wallet noir
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#000000');
  bg.addColorStop(1, '#0a0a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Status bar
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = '600 24px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('9:41', 32, 52);
  ctx.textAlign = 'right';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(W - 155 + i * 6, 52 - (i + 1) * 2.5, 4, (i + 1) * 2.5);
  }
  ctx.font = '600 18px -apple-system, "SF Pro Display", Inter, sans-serif';
  ctx.fillText('5G', W - 110, 51);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 76, 40, 40, 20);
  ctx.fillRect(W - 34, 46, 3, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W - 73, 43, 34, 14);

  // ========= CARTE FROMI photo pleine largeur =========
  const FROMI = { x: 0, y: 120, w: W, h: 660 };
  ctx.save();
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

  // --- Hover glow DOUX sur tasses (pas d'overlay qui masque la photo) ---
  const cupsRel = [
    [0.148, 0.220], [0.323, 0.220], [0.497, 0.220], [0.673, 0.220], [0.847, 0.220],
    [0.148, 0.340], [0.323, 0.340], [0.497, 0.340], [0.673, 0.340], [0.847, 0.340],
  ];
  const cupR = FROMI.w * 0.057;

  cupsRel.forEach(([xr, yr], i) => {
    const amt = cupGlow[i];
    if (amt < 0.02) return;
    const px = FROMI.x + FROMI.w * xr;
    const py = FROMI.y + FROMI.h * yr;

    // Glow radial autour de la tasse (halo orange)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const glowG = ctx.createRadialGradient(px, py, cupR * 0.4, px, py, cupR * 2.2);
    glowG.addColorStop(0, `rgba(255, 180, 90, ${amt * 0.55})`);
    glowG.addColorStop(0.5, `rgba(255, 107, 53, ${amt * 0.25})`);
    glowG.addColorStop(1, 'rgba(255, 107, 53, 0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(px - cupR * 2.5, py - cupR * 2.5, cupR * 5, cupR * 5);
    ctx.restore();

    // Pulse: anneau fin orange autour (subtil)
    ctx.save();
    ctx.globalAlpha = amt * 0.8;
    ctx.strokeStyle = '#FFB156';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, cupR + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Légère brillance blanche au centre (reflet "tapoté")
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
  roundRect(ctx, W / 2 - 60, H - 20, 120, 4, 2, 'rgba(255,255,255,0.55)');
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
