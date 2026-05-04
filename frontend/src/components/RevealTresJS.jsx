import { useEffect, useRef } from 'react';

const COUNTS  = { 1: 90, 2: 160, 3: 260 };
const PALETTE = ['#f5c842', '#ffffff', '#4cc9f0', '#f72585'];

// ── Sonido Web Audio (sin archivos externos) ──────────────────────────────────
function tocarFanfare(delay = 0) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();

    // Dos golpes de "corazón" antes de la explosión
    [[0.0, 90, 0.18], [0.22, 80, 0.15]].forEach(([t, freq, dur]) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const s = ctx.currentTime + delay + t;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.5, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      osc.start(s); osc.stop(s + dur + 0.05);
    });

    // Fanfare ascendente en la explosión (t = delay + 0.9s)
    const fanfareStart = ctx.currentTime + delay + 0.9;
    [[0, 261.63], [0.16, 329.63], [0.30, 392.00], [0.44, 523.25], [0.58, 659.25]]
      .forEach(([t, freq]) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'triangle'; osc.frequency.value = freq;
        const s = fanfareStart + t;
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.25, s + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
        osc.start(s); osc.stop(s + 0.55);
      });
  } catch (_) {}
}

// ── Nivel 4 — Épico Casino ────────────────────────────────────────────────────
// renderer se pasa como parámetro para evitar el doble RAF externo (#8 fix)
function setupEpico(THREE, scene, camera, mountRef, renderer) {
  const TOTAL  = 310;
  const BOOM   = 54;   // frame en que explota
  let   frame  = 0;
  let   animId;
  const disposables = [];

  // Colores
  const GOLD  = new THREE.Color('#f5c842');
  const WHITE = new THREE.Color('#ffffff');
  const PINK  = new THREE.Color('#f72585');
  const CYAN  = new THREE.Color('#4cc9f0');

  // ── Corazón: única partícula dorada pulsante ────────────────────────────────
  const hGeo = new THREE.BufferGeometry();
  hGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0]), 3));
  const hMat = new THREE.PointsMaterial({ color: GOLD, size: 0.4, transparent: true, opacity: 0, sizeAttenuation: true });
  const heart = new THREE.Points(hGeo, hMat);
  scene.add(heart);
  disposables.push(() => { hGeo.dispose(); hMat.dispose(); });

  // ── Vórtex espiral: 380 partículas ──────────────────────────────────────────
  const VC = 380;
  const vPos = new Float32Array(VC * 3);
  const vCol = new Float32Array(VC * 3);
  const vVel = [];
  const palette = [GOLD, WHITE, PINK, CYAN];

  for (let i = 0; i < VC; i++) {
    vPos[i*3] = vPos[i*3+1] = vPos[i*3+2] = 0;
    const c = palette[i % palette.length];
    vCol[i*3] = c.r; vCol[i*3+1] = c.g; vCol[i*3+2] = c.b;
    vVel.push({
      angle:      Math.random() * Math.PI * 2,
      radius:     Math.random() * 0.15,
      angularVel: (Math.random() * 0.12 + 0.05) * (Math.random() < .5 ? 1 : -1),
      radialVel:  0.035 + Math.random() * 0.065,
      zVel:       -0.01 + Math.random() * 0.055,
      gy:         -(0.0006 + Math.random() * 0.001),
      yOff:       0,
    });
  }
  const vGeo = new THREE.BufferGeometry();
  vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  vGeo.setAttribute('color',    new THREE.BufferAttribute(vCol, 3));
  const vMat = new THREE.PointsMaterial({
    size: 0.10, vertexColors: true, transparent: true, opacity: 0, sizeAttenuation: true, depthWrite: false,
  });
  const vortex = new THREE.Points(vGeo, vMat);
  scene.add(vortex);
  disposables.push(() => { vGeo.dispose(); vMat.dispose(); });

  // ── Cámara: partículas que vuelan directo hacia el viewer ────────────────────
  const CC = 100;
  const cPos = new Float32Array(CC * 3);
  const cCol = new Float32Array(CC * 3);
  const cVel = [];
  for (let i = 0; i < CC; i++) {
    cPos[i*3] = cPos[i*3+1] = cPos[i*3+2] = 0;
    const c = i % 2 === 0 ? GOLD : WHITE;
    cCol[i*3] = c.r; cCol[i*3+1] = c.g; cCol[i*3+2] = c.b;
    cVel.push({
      x: (Math.random()-.5)*0.06,
      y: (Math.random()-.5)*0.06,
      z: 0.10 + Math.random()*0.12,
    });
  }
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
  cGeo.setAttribute('color',    new THREE.BufferAttribute(cCol, 3));
  const cMat = new THREE.PointsMaterial({
    size: 0.18, vertexColors: true, transparent: true, opacity: 0, sizeAttenuation: true, depthWrite: false,
  });
  const camParts = new THREE.Points(cGeo, cMat);
  scene.add(camParts);
  disposables.push(() => { cGeo.dispose(); cMat.dispose(); });

  // ── Anillos de choque (3 ondas expansivas) ───────────────────────────────────
  const ringData = [];
  [[0, GOLD, BOOM], [8, WHITE, BOOM+8], [16, PINK, BOOM+16]].forEach(([idx, col, startF]) => {
    const geo = new THREE.TorusGeometry(1, 0.035, 8, 80);
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.set(0.01, 0.01, 0.01);
    scene.add(mesh);
    ringData.push({ mesh, mat, startF, maxScale: 4 + idx });
    disposables.push(() => { geo.dispose(); mat.dispose(); });
  });

  // ── Monedas girando (CylinderGeometry) ──────────────────────────────────────
  const coins = [];
  for (let i = 0; i < 28; i++) {
    const geo = new THREE.CylinderGeometry(0.09, 0.09, 0.015, 10);
    const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? GOLD : (i % 3 === 1 ? WHITE : PINK) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((Math.random()-.5)*0.3, (Math.random()-.5)*0.3, (Math.random()-.5)*0.3);
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    mesh.visible = false;
    scene.add(mesh);
    coins.push({
      mesh,
      vx: (Math.random()-.5)*0.07,
      vy: 0.04 + Math.random()*0.06,
      vz: (Math.random()-.5)*0.04,
      gy: -(0.0015 + Math.random()*0.001),
      spinX: (Math.random()-.5)*0.15,
      spinZ: (Math.random()-.5)*0.15,
      yOff: 0,
    });
    disposables.push(() => { geo.dispose(); mat.dispose(); });
  }

  // ── Flash div ────────────────────────────────────────────────────────────────
  function hacerFlash() {
    if (!mountRef.current) return;
    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:202;
      background:#f5c842;opacity:0.6;transition:opacity 0.3s ease-out;
    `;
    mountRef.current.appendChild(div);
    requestAnimationFrame(() => { div.style.opacity = '0'; });
    setTimeout(() => { try { mountRef.current?.removeChild(div); } catch {} }, 350);
  }

  // ── Loop ─────────────────────────────────────────────────────────────────────
  const fadeAt  = TOTAL * 0.62;

  function tick() {
    animId = requestAnimationFrame(tick);
    frame++;

    // ── ACTO 1: Latido (0 → BOOM) ───────────────────────────────────────────
    if (frame < BOOM) {
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.28);
      hMat.opacity = 0.4 + pulse * 0.6;
      hMat.size    = 0.25 + pulse * 0.55;
    }

    // ── ACTO 2: Explosión (frame === BOOM) ──────────────────────────────────
    if (frame === BOOM) {
      hMat.opacity = 0;
      vMat.opacity = 1;
      cMat.opacity = 1;
      hacerFlash();
    }

    // ── ACTO 2/3: Animación de sistemas ─────────────────────────────────────
    if (frame >= BOOM) {
      const t = frame - BOOM;

      // Vórtex
      for (let i = 0; i < VC; i++) {
        const v = vVel[i];
        v.angle  += v.angularVel;
        v.radius += v.radialVel;
        v.yOff   += v.gy * t;
        vPos[i*3]   = Math.cos(v.angle) * v.radius;
        vPos[i*3+1] = Math.sin(v.angle) * v.radius * 0.5 + v.yOff;
        vPos[i*3+2] = v.zVel * t;
      }
      vGeo.attributes.position.needsUpdate = true;

      // Hacia cámara
      for (let i = 0; i < CC; i++) {
        const v = cVel[i];
        cPos[i*3]   += v.x;
        cPos[i*3+1] += v.y;
        cPos[i*3+2] += v.z;
      }
      cGeo.attributes.position.needsUpdate = true;

      // Anillos de choque
      ringData.forEach(({ mesh, mat, startF, maxScale }) => {
        if (frame < startF) return;
        const progress = Math.min(1, (frame - startF) / 60);
        const s = 0.01 + progress * maxScale;
        mesh.scale.set(s, s, s);
        mat.opacity = Math.max(0, (1 - progress) * 0.7);
        mesh.rotation.z += 0.02;
      });

      // Monedas — física lineal: acumular velocidad cada frame (antes era cuadrática con gy*t)
      coins.forEach((coin) => {
        if (frame < BOOM + 4) { coin.mesh.visible = false; return; }
        coin.mesh.visible = true;
        coin.vy += coin.gy;           // gravedad acumula velocidad linealmente
        coin.mesh.position.x += coin.vx;
        coin.mesh.position.y += coin.vy;
        coin.mesh.position.z += coin.vz;
        coin.mesh.rotation.x += coin.spinX;
        coin.mesh.rotation.z += coin.spinZ;
      });
    }

    // ── Fade out ──────────────────────────────────────────────────────────────
    if (frame > fadeAt) {
      const t = (frame - fadeAt) / (TOTAL - fadeAt);
      const e = Math.max(0, 1 - t * t);
      vMat.opacity  = e;
      cMat.opacity  = e;
      coins.forEach(({ mesh }) => { if (mesh.material) mesh.material.opacity = e; });
      ringData.forEach(({ mat }) => { mat.opacity = Math.min(mat.opacity, e); });
    }

    if (frame >= TOTAL) {
      cancelAnimationFrame(animId);
      disposables.forEach(fn => fn());
      // Igual que niveles 1-3: limpiar el canvas y quitarlo del DOM
      // para que no quede el "brillo dorado residual" en el fondo (#bug-canvas-residual)
      try {
        renderer.clear();
        renderer.dispose();
        if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      } catch (_) {}
      return;
    }

    // Render aquí adentro — elimina el loop4() externo que causaba doble RAF (#8 fix)
    renderer.render(scene, camera);
  }

  tocarFanfare();
  tick();
  // El cleanup cancela el tick interno y libera los recursos Three.js
  return () => {
    cancelAnimationFrame(animId);
    disposables.forEach(fn => fn());
    try { renderer?.clear(); renderer?.dispose(); } catch (_) {}
    try { if (mountRef.current) mountRef.current.removeChild(renderer.domElement); } catch (_) {}
  };
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RevealTresJS({ nivel, color }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!nivel || nivel === 0) return;
    let renderer, animId, cleanupFn;
    let cancelled = false; // flag para cleanup antes de que resuelva el import (#7 fix)

    import('three').then((THREE) => {
      if (cancelled || !mountRef.current) return; // componente desmontado antes del import

      const W = window.innerWidth;
      const H = window.innerHeight;

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 100);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      mountRef.current.appendChild(renderer.domElement);

      // ── Nivel 4: épico ──────────────────────────────────────────────────────
      if (nivel === 4) {
        // setupEpico maneja su propio tick interno — le pasamos renderer para
        // que lo llame él mismo, eliminando el doble RAF externo (#8 fix)
        cleanupFn = setupEpico(THREE, scene, camera, mountRef, renderer);
        return;
      }

      // ── Niveles 1-3: explosión normal ───────────────────────────────────────
      const count     = COUNTS[nivel] ?? 90;
      const positions = new Float32Array(count * 3);
      const colors    = new Float32Array(count * 3);
      const velocities = [];
      const mainC  = new THREE.Color(color);
      const extras = PALETTE.map(h => new THREE.Color(h));

      for (let i = 0; i < count; i++) {
        positions[i*3] = (Math.random()-.5)*0.3;
        positions[i*3+1] = (Math.random()-.5)*0.3;
        positions[i*3+2] = (Math.random()-.5)*0.3;
        const phi = Math.acos(2*Math.random()-1);
        const theta = Math.random()*Math.PI*2;
        const spd = 0.04 + Math.random()*0.10;
        velocities.push({
          x: Math.sin(phi)*Math.cos(theta)*spd,
          y: Math.sin(phi)*Math.sin(theta)*spd*0.75,
          z: Math.cos(phi)*spd + 0.025,
          g: -(0.0008 + Math.random()*0.001),
        });
        const c = Math.random() < 0.55 ? mainC : extras[Math.floor(Math.random()*extras.length)];
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.13, vertexColors: true, transparent: true, opacity: 1, sizeAttenuation: true, depthWrite: false,
      });
      scene.add(new THREE.Points(geo, mat));

      let ring2Points;
      if (nivel >= 2) {
        const c2 = 60; const rPos = new Float32Array(c2*3); const rCol = new Float32Array(c2*3); const rVel = [];
        for (let i = 0; i < c2; i++) {
          const a = (i/c2)*Math.PI*2;
          rPos[i*3] = Math.cos(a)*0.1; rPos[i*3+1] = Math.sin(a)*0.1; rPos[i*3+2] = 0;
          rVel.push({ x: Math.cos(a)*(0.07+Math.random()*0.05), y: Math.sin(a)*(0.07+Math.random()*0.05), z: 0.01+Math.random()*0.04, g: -0.0005 });
          const c = extras[i%extras.length];
          rCol[i*3] = c.r; rCol[i*3+1] = c.g; rCol[i*3+2] = c.b;
        }
        const rGeo = new THREE.BufferGeometry();
        rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
        rGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 3));
        const rMat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 1, sizeAttenuation: true, depthWrite: false });
        ring2Points = new THREE.Points(rGeo, rMat);
        ring2Points.__vel = rVel; ring2Points.__c = c2;
        scene.add(ring2Points);
      }

      let torus, torus2;
      if (nivel >= 3) {
        const tGeo = new THREE.TorusGeometry(1.8, 0.04, 8, 80);
        const tMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.7 });
        torus = new THREE.Mesh(tGeo, tMat); torus.scale.set(0.01,0.01,0.01); scene.add(torus);
      }

      if (nivel >= 3 && mountRef.current) {
        const flash = document.createElement('div');
        flash.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:201;background:${color};opacity:0.35;transition:opacity 0.35s ease-out;`;
        mountRef.current.appendChild(flash);
        requestAnimationFrame(() => { flash.style.opacity = '0'; });
        setTimeout(() => { try { mountRef.current?.removeChild(flash); } catch {} }, 400);
      }

      let frame = 0;
      const totalF = nivel >= 3 ? 110 : 85;
      const fadeAt = totalF * 0.6;

      function tick() {
        animId = requestAnimationFrame(tick);
        frame++;
        const pos = geo.attributes.position.array;
        for (let i = 0; i < count; i++) {
          const v = velocities[i];
          pos[i*3] += v.x; pos[i*3+1] += v.y + v.g*frame; pos[i*3+2] += v.z;
        }
        geo.attributes.position.needsUpdate = true;
        if (ring2Points) {
          const rp = ring2Points.geometry.attributes.position.array;
          const rv = ring2Points.__vel; const rc = ring2Points.__c;
          for (let i = 0; i < rc; i++) { rp[i*3] += rv[i].x; rp[i*3+1] += rv[i].y + rv[i].g*frame; rp[i*3+2] += rv[i].z; }
          ring2Points.geometry.attributes.position.needsUpdate = true;
        }
        if (torus) { const s = Math.min(1, frame*0.06); torus.scale.set(s,s,s); torus.rotation.z += 0.05; torus.rotation.x += 0.02; }
        if (frame > fadeAt) {
          const e = Math.max(0, 1 - ((frame-fadeAt)/(totalF-fadeAt))**2);
          mat.opacity = e;
          if (ring2Points) ring2Points.material.opacity = e;
          if (torus) torus.material.opacity = e*0.7;
        }
        if (frame >= totalF) { cancelAnimationFrame(animId); geo.dispose(); mat.dispose(); renderer.dispose(); try { mountRef.current?.removeChild(renderer.domElement); } catch {} return; }
        renderer.render(scene, camera);
      }
      tick();

    }).catch(() => {});

    return () => {
      cancelled = true; // cancela si el import todavía no resolvió (#7 fix)
      cancelAnimationFrame(animId);
      try { cleanupFn?.(); renderer?.dispose(); } catch {}
    };
  }, []);

  // z-index 106: por encima del modal-overlay (100) para que las partículas
  // aparezcan SOBRE el overlay — sin el blur gris que las aplastaba antes.
  return <div ref={mountRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:106, overflow:'hidden' }} />;
}
