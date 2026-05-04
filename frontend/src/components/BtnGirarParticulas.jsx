// Botón GIRAR con partículas orbitantes — Canvas 2D
// Idle: órbita lenta | Hover: acelera + brilla | Click: burst

import { useEffect, useRef } from 'react';
import { BTN_PARTICLE_COUNT, BTN_BURST_FRAMES } from '../utils/constants';

const COLORS = ['#F0306A', '#FF6B9D', '#1A8CB5', '#C0155A', '#F0306A', '#FF6B9D'];
const W = 380, H = 120;

export default function BtnGirarParticulas({ children, onClick, disabled, className }) {
  const stateRef = useRef({ hover: false, burst: 0 });
  const wrapRef  = useRef(null); // ref directo — evita getElementById que rompe con múltiples instancias

  // Sincroniza disabled en el ref para no necesitar re-render en el loop
  const disRef = useRef(disabled);
  useEffect(() => { disRef.current = disabled; }, [disabled]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = `
      position:absolute; left:50%; top:50%;
      transform:translate(-50%,-50%);
      pointer-events:none; z-index:0;
    `;

    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const cx  = W / 2;
    const cy  = H / 2;

    // Partículas: elipse alrededor del botón
    const particles = Array.from({ length: BTN_PARTICLE_COUNT }, (_, i) => ({
      angle:  (i / BTN_PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5,
      baseRX: 55 + Math.random() * 35,
      speed:  (0.011 + Math.random() * 0.009) * (i % 2 === 0 ? 1 : -1),
      phase:  Math.random() * Math.PI * 2,
      color:  COLORS[i % COLORS.length],
      size:   1.8 + Math.random() * 1.8,
    }));

    let frame  = 0;
    let animId;

    function tick() {
      animId = requestAnimationFrame(tick);
      frame++;

      ctx.clearRect(0, 0, W, H);

      const { hover, burst } = stateRef.current;
      if (stateRef.current.burst > 0) stateRef.current.burst--;
      const dis = disRef.current;

      const speedMult   = burst > 0 ? 3.5 : hover ? 2.3 : 1;
      const burstExpand = burst > 0 ? (30 - burst) * 2.2 : 0;

      particles.forEach(p => {
        p.angle += p.speed * speedMult;

        const rx = (p.baseRX + burstExpand) * (hover ? 1.12 : 1);
        const ry = rx * 0.30;
        const x  = cx + Math.cos(p.angle) * rx;
        const y  = cy + Math.sin(p.angle) * ry + Math.sin(frame * 0.03 + p.phase) * 2.5;

        const pulse = 0.55 + Math.sin(frame * 0.04 + p.phase) * 0.15;
      const alpha = dis ? 0.08 : (hover || burst > 0 ? 0.95 : pulse * 0.28);
      const size  = p.size * (hover || burst > 0 ? 1.45 : 0.72) * (dis ? 0.5 : 1);

        // Halo de brillo
        const grd = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
        grd.addColorStop(0, p.color + 'cc');
        grd.addColorStop(1, p.color + '00');
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle   = grd;
        ctx.beginPath();
        ctx.arc(x, y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo sólido
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
    }

    tick();

    return () => {
      cancelAnimationFrame(animId);
      try { wrap.removeChild(canvas); } catch {}
    };
  }, []);

  function handleDown() {
    if (!disabled) stateRef.current.burst = BTN_BURST_FRAMES;
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => { stateRef.current.hover = true;  }}
      onMouseLeave={() => { stateRef.current.hover = false; }}
      onMouseDown={handleDown}
      onTouchStart={handleDown}
    >
      <button
        className={className}
        onClick={onClick}
        disabled={disabled}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {children}
      </button>
    </div>
  );
}
