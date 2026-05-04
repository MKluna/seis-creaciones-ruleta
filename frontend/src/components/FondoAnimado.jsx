import { useEffect, useRef } from 'react';

const COLORS     = ['#F0306A', '#FF6B9D', '#1A8CB5', '#C0155A', '#F0306A'];
const COLORS_HOT = ['#F0306A', '#FF6B9D', '#1A8CB5'];

function rand(a, b)      { return a + Math.random() * (b - a); }
function pick(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Canvas: partículas + sparkles + shooting stars ────────────────────────────
function useParticleCanvas(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W, H, raf;
    let particles = [];
    let sparkles  = [];
    let shooters  = [];
    let nextShoot = Date.now() + rand(3000, 6000);

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    /* Partícula flotante */
    function mkParticle() {
      return {
        x:   rand(0, W),   y:   rand(0, H),
        r:   rand(0.7, 2), vx:  rand(-0.15, 0.15),
        vy:  rand(-0.3, -0.07),
        a:   rand(0.1, 0.6), va: rand(0.003, 0.007) * (Math.random() < .5 ? 1 : -1),
        max: rand(0.3, 0.65),
        col: pick(COLORS),
      };
    }
    function initParticles() { particles = Array.from({ length: 34 }, mkParticle); }

    /* Sparkle en cruz */
    function mkSparkle() {
      return {
        x: rand(0, W), y: rand(0, H),
        sz: rand(4, 11), a: 0,
        dir: 1, spd: rand(0.025, 0.055),
        col: pick(COLORS),
      };
    }

    /* Estrella fugaz */
    function mkShooter() {
      const angle = rand(0.25, 0.45);
      const speed = rand(7, 13);
      return {
        x: rand(0, W * .65), y: rand(0, H * .35),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        trail: [], a: 0, dying: false,
        col: pick(COLORS_HOT),
      };
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      const now = Date.now();

      // ── Partículas (sin shadowBlur individual — batch con globalAlpha) ──
      for (const p of particles) {
        p.x = (p.x + p.vx + W) % W;
        p.y += p.vy;
        p.a += p.va;
        if (p.a >= p.max) p.va = -Math.abs(p.va);
        if (p.a <= 0.05)  p.va =  Math.abs(p.va);
        if (p.y < -4) Object.assign(p, mkParticle(), { y: H + 4 });

        ctx.globalAlpha = p.a;
        ctx.fillStyle   = p.col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Sparkles (shadowBlur solo aquí — pocos a la vez) ──
      ctx.shadowBlur = 8;
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.a += s.spd * s.dir;
        if (s.a >= 1)    { s.a = 1;  s.dir = -1; }
        if (s.a <= 0)    { sparkles.splice(i, 1); continue; }

        ctx.globalAlpha = s.a * 0.85;
        ctx.strokeStyle = s.col;
        ctx.shadowColor = s.col;
        ctx.lineWidth   = 1.3;
        for (let k = 0; k < 4; k++) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(k * Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(0, -s.sz);
          ctx.lineTo(0,  s.sz);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (Math.random() < 0.010 && sparkles.length < 4) sparkles.push(mkSparkle());

      // ── Shooting stars ──
      if (now >= nextShoot && shooters.length < 1) {
        shooters.push(mkShooter());
        nextShoot = now + rand(12000, 22000);
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.trail.unshift({ x: s.x, y: s.y });
        if (s.trail.length > 22) s.trail.pop();
        s.x += s.vx; s.y += s.vy;
        if (!s.dying) { s.a = Math.min(s.a + 0.07, 0.95); }
        if (s.x > W + 60 || s.y > H + 60) s.dying = true;
        if (s.dying) s.a -= 0.06;
        if (s.a <= 0) { shooters.splice(i, 1); continue; }

        if (s.trail.length >= 2) {
          const head = s.trail[s.trail.length - 1];
          const tail = s.trail[0];
          const g    = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
          g.addColorStop(0, 'transparent');
          g.addColorStop(1, s.col);
          ctx.globalAlpha = s.a;
          ctx.shadowColor = s.col;
          ctx.shadowBlur  = 10;
          ctx.strokeStyle = g;
          ctx.lineWidth   = 1.8;
          ctx.beginPath();
          ctx.moveTo(s.trail[0].x, s.trail[0].y);
          for (const p of s.trail) ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      raf = requestAnimationFrame(tick);
    }

    resize();
    initParticles();
    tick();

    const onResize = () => { resize(); initParticles(); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function FondoAnimado() {
  const canvasRef = useRef(null);
  useParticleCanvas(canvasRef);

  return (
    <>
      {/* Orbes suaves — transform animado = GPU smooth */}
      <div style={orbeStyle('#F0306A', 'orbe1', 0.18)} />
      <div style={orbeStyle('#7ECFE8', 'orbe2', 0.20)} />
      <div style={orbeStyle('#FF6B9D', 'orbe3', 0.14)} />

      {/* Keyframes inyectados una sola vez */}
      <style>{KEYFRAMES}</style>

      {/* Canvas de partículas */}
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100dvh',
        display: 'block',
        pointerEvents: 'none', zIndex: 0,
      }} />
    </>
  );
}

function orbeStyle(color, name, opacity) {
  return {
    position:     'fixed',
    width:        '55vmax',
    height:       '55vmax',
    borderRadius: '50%',
    background:   `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
    pointerEvents:'none',
    zIndex:        0,
    animation:    `${name} 20s ease-in-out infinite alternate`,
    willChange:   'transform',
  };
}

const KEYFRAMES = `
@keyframes orbe1 {
  0%   { transform: translate(-20%, 10%);  }
  33%  { transform: translate(5%,  -15%); }
  66%  { transform: translate(-30%, 40%); }
  100% { transform: translate(10%,  20%); }
}
@keyframes orbe2 {
  0%   { transform: translate(60%, -20%); }
  33%  { transform: translate(40%,  20%); }
  66%  { transform: translate(70%, -10%); }
  100% { transform: translate(50%,  30%); }
}
@keyframes orbe3 {
  0%   { transform: translate(30%, 60%);  }
  33%  { transform: translate(55%, 45%);  }
  66%  { transform: translate(20%, 70%);  }
  100% { transform: translate(45%, 50%);  }
}
`;
