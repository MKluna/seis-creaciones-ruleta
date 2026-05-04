import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { gsap } from 'gsap';
import { audio } from '../utils/sonidos';
import {
  SPIN_DURATION_S, SPIN_LAPS_MIN, SPIN_LAPS_MAX,
  SPIN_BOUNCE_OUT, SPIN_BOUNCE_BACK,
  IDLE_DURATION_S,
  ICON_CANVAS_DIV, ICON_MIN_PX, ICON_MAX_PX,
} from '../utils/constants';

const TAU = Math.PI * 2;
const GOLD_DARK = '#a86a07';
const GOLD_MID = '#d18a07';
const GOLD_HOT = '#f6c437';
const GOLD_LIGHT = '#fff4a8';

function drawCircle(ctx, x, y, r, fillStyle) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawRing(ctx, cx, cy, outerR, innerR, fillStyle) {
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, TAU);
  ctx.arc(cx, cy, innerR, 0, TAU, true);
  ctx.fillStyle = fillStyle;
  ctx.fill('evenodd');
}

// Iconos locales de sistema: evitamos depender de CDNs visuales en runtime.
const PREMIO_ICONS = {
  sin_premio:      { fallback: '😔' },
  off_5:           { fallback: '💸' },
  off_10:          { fallback: '💸' },
  envio_gratis:    { fallback: '📦' },
  premio_especial: { fallback: '❓' },
};

// ── Dibuja la ruleta — 100% fiel al boceto del cliente ───────────────────────
function drawBulb(ctx, x, y, r) {
  const bloom = ctx.createRadialGradient(x, y, 0, x, y, r * 4.6);
  bloom.addColorStop(0, 'rgba(255,255,235,0.95)');
  bloom.addColorStop(0.16, 'rgba(255,238,95,0.70)');
  bloom.addColorStop(0.42, 'rgba(255,194,35,0.28)');
  bloom.addColorStop(1, 'rgba(255,194,35,0)');
  drawCircle(ctx, x, y, r * 4.6, bloom);

  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.35, 'rgba(255,250,185,0.70)');
  halo.addColorStop(0.74, 'rgba(255,214,80,0.28)');
  halo.addColorStop(1, 'rgba(255,220,100,0)');
  drawCircle(ctx, x, y, r * 2.4, halo);

  const bulb = ctx.createRadialGradient(x - r * 0.22, y - r * 0.28, 0, x, y, r);
  bulb.addColorStop(0, '#ffffff');
  bulb.addColorStop(0.26, '#fffff6');
  bulb.addColorStop(0.52, '#ffe873');
  bulb.addColorStop(0.82, '#f0b42c');
  bulb.addColorStop(1, '#a96800');
  drawCircle(ctx, x, y, r, bulb);
  drawCircle(ctx, x - r * 0.22, y - r * 0.24, r * 0.28, 'rgba(255,255,255,0.96)');

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 1.05, y);
  ctx.lineTo(x + r * 1.05, y);
  ctx.moveTo(x, y - r * 1.05);
  ctx.lineTo(x, y + r * 1.05);
  ctx.stroke();
  ctx.restore();
}

function dibujarRuletaBoceto(ctx, premios, rotacion, icons = {}) {
  const W = ctx.logicalSize ?? ctx.canvas.width;
  const cx = W / 2;
  const cy = W / 2;
  const slice = TAU / premios.length;
  const ringThick = Math.round(W * 0.046);
  const ringOuterR = Math.round(W / 2 - W * 0.020);
  const ringInnerR = ringOuterR - ringThick;
  const ringMidR = (ringInnerR + ringOuterR) / 2;
  const sectorR = ringInnerR - Math.round(W * 0.012);
  const centerR = Math.round(sectorR * 0.315);
  const centerOuterR = centerR + Math.round(W * 0.018);

  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.shadowColor = 'rgba(121,77,0,0.42)';
  ctx.shadowBlur = W * 0.032;
  ctx.shadowOffsetY = W * 0.016;
  drawCircle(ctx, cx, cy, ringOuterR - W * 0.010, 'rgba(0,0,0,0.01)');
  ctx.restore();

  premios.forEach((p, i) => {
    const start = rotacion + i * slice;
    const end = start + slice;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, sectorR, start, end);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = p.color;
    ctx.fillRect(0, 0, W, W);

    const radial = ctx.createRadialGradient(cx - sectorR * 0.18, cy - sectorR * 0.24, centerR * 0.15, cx, cy, sectorR);
    radial.addColorStop(0, 'rgba(255,255,255,0.60)');
    radial.addColorStop(0.23, 'rgba(255,255,255,0.22)');
    radial.addColorStop(0.58, 'rgba(255,255,255,0.035)');
    radial.addColorStop(0.82, 'rgba(0,0,0,0.05)');
    radial.addColorStop(1, 'rgba(0,0,0,0.14)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, W);
    ctx.restore();
  });

  ctx.lineCap = 'round';
  premios.forEach((_, i) => {
    const angle = rotacion + i * slice;
    const x1 = cx + Math.cos(angle) * centerOuterR;
    const y1 = cy + Math.sin(angle) * centerOuterR;
    const x2 = cx + Math.cos(angle) * sectorR;
    const y2 = cy + Math.sin(angle) * sectorR;
    ctx.strokeStyle = 'rgba(139, 86, 0, 0.78)';
    ctx.lineWidth = Math.max(2, W * 0.0065);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 244, 168, 0.82)';
    ctx.lineWidth = Math.max(1, W * 0.0022);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  const overLin = ctx.createLinearGradient(cx, cy - sectorR, cx, cy + sectorR);
  overLin.addColorStop(0, 'rgba(255,255,255,0.16)');
  overLin.addColorStop(0.30, 'rgba(255,255,255,0.04)');
  overLin.addColorStop(0.62, 'rgba(0,0,0,0)');
  overLin.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.beginPath();
  ctx.arc(cx, cy, sectorR, 0, TAU);
  ctx.fillStyle = overLin;
  ctx.fill();

  ctx.shadowColor = 'rgba(100,60,0,0.52)';
  ctx.shadowBlur = W * 0.026;
  drawRing(ctx, cx, cy, ringOuterR, ringInnerR, '#704600');
  ctx.shadowBlur = 0;
  const goldGrd = ctx.createLinearGradient(cx, cy - ringOuterR, cx, cy + ringOuterR);
  goldGrd.addColorStop(0, GOLD_LIGHT);
  goldGrd.addColorStop(0.14, GOLD_HOT);
  goldGrd.addColorStop(0.34, GOLD_MID);
  goldGrd.addColorStop(0.50, '#ffe078');
  goldGrd.addColorStop(0.66, GOLD_MID);
  goldGrd.addColorStop(0.88, GOLD_HOT);
  goldGrd.addColorStop(1, GOLD_LIGHT);
  drawRing(ctx, cx, cy, ringOuterR, ringInnerR, goldGrd);

  ctx.beginPath();
  ctx.arc(cx, cy, ringOuterR, 0, TAU);
  ctx.strokeStyle = '#fff3a0';
  ctx.lineWidth = Math.max(1, W * 0.0025);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, ringInnerR, 0, TAU);
  ctx.strokeStyle = '#9c6000';
  ctx.lineWidth = Math.max(1.5, W * 0.0038);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, ringOuterR - ringThick * 0.30, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = Math.max(1.5, W * 0.0048);
  ctx.stroke();

  const lightR = Math.max(4.2, ringThick * 0.38);
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * TAU - Math.PI / 2;
    drawBulb(ctx, cx + Math.cos(angle) * ringMidR, cy + Math.sin(angle) * ringMidR, lightR);
  }

  premios.forEach((p, i) => {
    const midAngle = rotacion + i * slice + slice / 2;
    const iconEntry = icons[p.id];
    const badgeR = Math.max(21, W * 0.052);
    const iconSize = Math.max(ICON_MIN_PX, Math.min(ICON_MAX_PX, W / (ICON_CANVAS_DIV * 1.06)));
    const ix = cx + Math.cos(midAngle) * sectorR * 0.64;
    const iy = cy + Math.sin(midAngle) * sectorR * 0.64;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = W * 0.010;
    ctx.shadowOffsetY = W * 0.004;
    const badge = ctx.createRadialGradient(ix - badgeR * 0.25, iy - badgeR * 0.35, 0, ix, iy, badgeR);
    badge.addColorStop(0, 'rgba(255,255,255,0.96)');
    badge.addColorStop(0.68, 'rgba(255,255,255,0.92)');
    badge.addColorStop(1, 'rgba(236,239,242,0.86)');
    drawCircle(ctx, ix, iy, badgeR, badge);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, W * 0.002);
    ctx.strokeStyle = p.id === 'sin_premio' ? 'rgba(26,140,181,0.22)' : 'rgba(240,48,106,0.18)';
    ctx.beginPath();
    ctx.arc(ix, iy, badgeR - 0.5, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(ix, iy);
    if (iconEntry?.img?.complete && iconEntry.img.naturalWidth > 0) {
      try {
        ctx.drawImage(iconEntry.img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      } catch {
        _drawEmoji(ctx, iconEntry.fallback ?? '?', iconSize);
      }
    } else {
      _drawEmoji(ctx, iconEntry?.fallback ?? '?', iconSize);
    }
    ctx.restore();
  });

  const centerGold = ctx.createLinearGradient(cx - centerOuterR, cy - centerOuterR, cx + centerOuterR, cy + centerOuterR);
  centerGold.addColorStop(0, '#fff8bd');
  centerGold.addColorStop(0.20, '#eab62c');
  centerGold.addColorStop(0.50, '#ffd95d');
  centerGold.addColorStop(0.80, '#c98208');
  centerGold.addColorStop(1, '#fff2a4');
  ctx.shadowColor = 'rgba(0,0,0,0.34)';
  ctx.shadowBlur = W * 0.018;
  drawRing(ctx, cx, cy, centerOuterR, centerR, centerGold);
  ctx.shadowBlur = 0;
  const hubGlow = ctx.createRadialGradient(cx - centerR * 0.18, cy - centerR * 0.28, 0, cx, cy, centerR);
  hubGlow.addColorStop(0, 'rgba(255,255,255,1)');
  hubGlow.addColorStop(0.45, 'rgba(255,250,252,0.82)');
  hubGlow.addColorStop(0.82, 'rgba(248,235,242,0.46)');
  hubGlow.addColorStop(1, 'rgba(238,215,228,0.24)');
  drawCircle(ctx, cx, cy, centerR - 1, '#ffffff');
  drawCircle(ctx, cx, cy, centerR - 1, hubGlow);

  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.86)';
  ctx.lineWidth = Math.max(1, W * 0.004);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const szSeis = Math.max(12, Math.round(centerR * 0.63));
  ctx.font = `900 ${szSeis}px "Fredoka One", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
  ctx.shadowColor = 'rgba(200,0,60,0.38)';
  ctx.shadowBlur = W * 0.007;
  ctx.shadowOffsetY = W * 0.0025;
  ctx.fillStyle = '#F0306A';
  ctx.fillText('Seis', cx, cy - centerR * 0.24);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const szCre = Math.max(8, Math.round(centerR * 0.32));
  ctx.font = `800 ${szCre}px "Fredoka One", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
  ctx.shadowColor = 'rgba(200,0,60,0.28)';
  ctx.shadowBlur = W * 0.005;
  ctx.shadowOffsetY = W * 0.002;
  ctx.fillStyle = '#F0306A';
  ctx.fillText('creaciones', cx, cy + centerR * 0.38);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function _drawEmoji(ctx, emoji, size) {
  ctx.font         = `${Math.round(size * 0.82)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 0, 0);
}

// ── Componente ────────────────────────────────────────────────────────────────
const Ruleta = forwardRef(function Ruleta({ premios, girando }, ref) {
  const canvasRef      = useRef(null);
  const rotRef         = useRef(0);
  const idleAnimRef    = useRef(null);
  const rafRef         = useRef(null);
  const iconsRef       = useRef(PREMIO_ICONS);
  const lastIdleDrawTs = useRef(0);         // throttle idle a ~30fps

  // Expone girarHasta() al padre (App.jsx)
  useImperativeHandle(ref, () => ({
    girarHasta(premioIndex, onFinish) {
      if (!premios.length) return;
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');

      // Cancela idle
      idleAnimRef.current?.kill();
      idleAnimRef.current = null;
      cancelAnimationFrame(rafRef.current);

      const slice       = TAU / premios.length;
      const targetSlice = -(premioIndex * slice + slice / 2) - Math.PI / 2;
      const vueltas     = (SPIN_LAPS_MIN + Math.floor(Math.random() * (SPIN_LAPS_MAX - SPIN_LAPS_MIN + 1))) * TAU;
      const targetRot   = targetSlice + vueltas;

      const obj = { rot: rotRef.current };
      let lastSector = -1;
      let prevRot    = rotRef.current;

      audio.spinStart();

      const tl = gsap.timeline({
        onComplete() {
          obj.rot        = obj.rot % TAU;
          rotRef.current = obj.rot;
          dibujarRuletaBoceto(ctx, premios, obj.rot, iconsRef.current);
          audio.spinStop();
          iniciarIdle(ctx);
          onFinish?.();
        },
      });

      tl.to(obj, {
        rot:      targetRot,
        duration: SPIN_DURATION_S,
        ease:     'power4.out',
        onUpdate() {
          rotRef.current = obj.rot;
          dibujarRuletaBoceto(ctx, premios, obj.rot, iconsRef.current);

          // Tick por sector cruzado
          const sectorAngle  = TAU / premios.length;
          const normalized   = ((-obj.rot % TAU) + TAU) % TAU;
          const currentSector = Math.floor(normalized / sectorAngle) % premios.length;
          if (lastSector !== -1 && currentSector !== lastSector) {
            const delta = Math.abs(obj.rot - prevRot);
            const speed = Math.min(1, delta / (sectorAngle * 0.5));
            audio.tick(speed);
          }
          lastSector = currentSector;
          prevRot    = obj.rot;
        },
      });

      // Bounce
      tl.to(obj, { rot: targetRot + SPIN_BOUNCE_OUT,  duration: 0.15, ease: 'power1.out',
        onUpdate() { dibujarRuletaBoceto(ctx, premios, obj.rot, iconsRef.current); } });
      tl.to(obj, { rot: targetRot - SPIN_BOUNCE_BACK, duration: 0.12, ease: 'power1.inOut',
        onUpdate() { dibujarRuletaBoceto(ctx, premios, obj.rot, iconsRef.current); } });
      tl.to(obj, { rot: targetRot,                    duration: 0.10, ease: 'power1.inOut',
        onUpdate() { dibujarRuletaBoceto(ctx, premios, obj.rot, iconsRef.current); } });
    },
  }));

  function iniciarIdle(ctx) {
    const obj = { rot: rotRef.current };
    lastIdleDrawTs.current = 0;
    idleAnimRef.current = gsap.to(obj, {
      rot:      rotRef.current + TAU,
      duration: IDLE_DURATION_S,
      ease:     'none',
      repeat:   -1,
      onUpdate() {
        rotRef.current = obj.rot % TAU;
        // Throttle idle a ~30fps (evitar quema de GPU en móviles lentos)
        const now = performance.now();
        if (now - lastIdleDrawTs.current < 32) return; // 32ms ≈ 31fps
        lastIdleDrawTs.current = now;
        dibujarRuletaBoceto(ctx, premios, obj.rot, iconsRef.current);
      },
    });
  }

  useEffect(() => {
    if (!premios.length) return;
    const canvas = canvasRef.current;

    function setupCanvas() {
      const dpr  = window.devicePixelRatio || 1;
      const size = canvas.offsetWidth;
      canvas.width  = size * dpr;
      canvas.height = size * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.logicalSize = size;
      return ctx;
    }

    const ctx = setupCanvas();
    dibujarRuletaBoceto(ctx, premios, rotRef.current, iconsRef.current);
    iniciarIdle(ctx);

    // Reajustar canvas al rotar el dispositivo o cambiar tamaño de ventana (#6 fix)
    const ro = new ResizeObserver(() => {
      idleAnimRef.current?.kill();
      idleAnimRef.current = null;
      const newCtx = setupCanvas();
      dibujarRuletaBoceto(newCtx, premios, rotRef.current, iconsRef.current);
      iniciarIdle(newCtx);
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      idleAnimRef.current?.kill();
      cancelAnimationFrame(rafRef.current);
    };
  }, [premios]);

  return (
    <div className="ruleta-container">
      <div className="ruleta-ring" />

      {/* Puntero SVG — triángulo negro apuntando ABAJO con montura dorada arriba */}
      <svg className="ruleta-puntero" viewBox="0 0 42 58" xmlns="http://www.w3.org/2000/svg" overflow="visible">
        <defs>
          <linearGradient id="goldBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#f9f0a8"/>
            <stop offset="35%"  stopColor="#e8c028"/>
            <stop offset="65%"  stopColor="#c8900a"/>
            <stop offset="100%" stopColor="#8a5500"/>
          </linearGradient>
          <linearGradient id="pointerBlack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2c2d36"/>
            <stop offset="62%" stopColor="#11121a"/>
            <stop offset="100%" stopColor="#05060a"/>
          </linearGradient>
          <filter id="punteroShadow" x="-40%" y="-20%" width="180%" height="170%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="rgba(0,0,0,0.42)"/>
          </filter>
        </defs>
        {/* Montura dorada — arriba, se asienta sobre el aro */}
        <path
          d="M12 3 H30 Q33 3 34 6 L35 10 Q35.8 13 32.6 13 H9.4 Q6.2 13 7 10 L8 6 Q9 3 12 3Z"
          fill="url(#goldBase)"
          filter="url(#punteroShadow)"
        />
        {/* Línea de brillo en la montura dorada */}
        <path d="M12 5.2 H30 Q31.5 5.2 31.9 6.6 L32.4 8.2 H9.6 L10.1 6.6 Q10.5 5.2 12 5.2Z" fill="rgba(255,255,255,0.46)"/>
        {/* Triángulo negro — punta hacia ABAJO señalando el sector */}
        <polygon
          points="8,12 34,12 21,51"
          fill="url(#pointerBlack)"
          stroke="url(#goldBase)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          filter="url(#punteroShadow)"
        />
        <path d="M21 16 L21 42" stroke="rgba(255,255,255,0.10)" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>

      <canvas ref={canvasRef} className="ruleta-canvas" />
      <div className="ruleta-centro" />
    </div>
  );
});

export default Ruleta;
