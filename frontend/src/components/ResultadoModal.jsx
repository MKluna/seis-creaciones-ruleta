import { Fragment, Suspense, lazy, useEffect, useId, useRef } from 'react';
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';
import { audio } from '../utils/sonidos';

const RevealTresJS = lazy(() => import('./RevealTresJS'));

const NIVELES = {
  sin_premio: {
    nivel: 0,
    emoji: '😔',
    color: '#5ab8e0',
    colorAlt: '#87d4f2',
    titulo: 'Sin premio',
    mensaje: 'No ganaste, pero quedate atento a las promos del mes. 💪',
  },
  off_5: {
    nivel: 1,
    emoji: '⭐',
    color: '#fa3563',
    colorAlt: '#ff87a3',
    titulo: '¡Felicitaciones!',
    mensaje: 'Descuento válido solo por mayo para compras superiores a $10.000.\nNo acumulable con otros descuentos.\n📸 No olvides tomar captura de esta pantalla.',
  },
  off_10: {
    nivel: 2,
    emoji: '🌟',
    color: '#87d4f2',
    colorAlt: '#bae7fa',
    titulo: '¡Muy bien!',
    mensaje: 'Descuento válido solo por mayo para compras superiores a $20.000.\nNo acumulable con otros descuentos.\n📸 No olvides tomar captura de esta pantalla.',
  },
  envio_gratis: {
    nivel: 2,
    emoji: '📦',
    color: '#fa3563',
    colorAlt: '#ff87a3',
    titulo: '¡Felicitaciones!',
    mensaje: 'Envío gratis válido para compras superiores a $20.000 dentro de Capital.\nVálido durante mayo de 2026.\n📸 No olvides tomar captura de esta pantalla.',
  },
  premio_especial: {
    nivel: 4,
    emoji: '❓',
    color: '#1a6fa8',
    colorAlt: '#87d4f2',
    titulo: '¡Felicitaciones!',
    mensaje: 'Tenés un regalo sorpresa con tu compra superior a $15.000.\nVálido durante mayo de 2026.\n📸 No olvides tomar captura de esta pantalla.',
  },
};

export default function ResultadoModal({ resultado, onClose }) {
  const modalRef = useRef(null);
  const luzRef = useRef(null);
  const premioRef = useRef(null);
  const tituloId = useId();
  const descripcionId = useId();
  const { premioId, premioLabel, yaParticipo, fecha } = resultado;
  const info = NIVELES[premioId] ?? NIVELES.sin_premio;

  useEffect(() => {
    const tweens = [];
    const timers = [];
    const schedule = (fn, delay) => {
      const id = window.setTimeout(fn, delay);
      timers.push(id);
      return id;
    };

    modalRef.current?.focus();

    if (!yaParticipo) audio.winFanfare(info.nivel);

    if (yaParticipo) {
      tweens.push(gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.88, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.5)' },
      ));
      return () => {
        timers.forEach(clearTimeout);
        tweens.forEach(t => t.kill());
      };
    }

    const tl = gsap.timeline();
    tweens.push(tl);

    if (info.nivel === 0) {
      tl.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' },
      ).to(modalRef.current, {
        x: -6,
        duration: 0.07,
        yoyo: true,
        repeat: 5,
        ease: 'none',
      }, '<');
    } else if (info.nivel <= 2) {
      tl.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.7, rotate: -4 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' },
      );
      schedule(() => {
        confetti({ particleCount: info.nivel === 1 ? 60 : 120, spread: 80, origin: { y: 0.5 } });
      }, 300);
    } else if (info.nivel === 3) {
      tl.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.6)' },
      );
      if (luzRef.current) {
        tweens.push(gsap.fromTo(
          luzRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, yoyo: true, repeat: 3 },
        ));
      }
      tweens.push(gsap.fromTo(
        modalRef.current,
        { x: 0 },
        { x: 8, duration: 0.05, yoyo: true, repeat: 9, ease: 'none' },
      ));
      schedule(() => {
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ['#f5c842', '#ec4899', '#4cc9f0'] });
      }, 200);
    } else {
      if (luzRef.current) gsap.set(luzRef.current, { opacity: 0 });

      tweens.push(gsap.fromTo(
        modalRef.current,
        { x: 0, y: 0 },
        { x: 14, duration: 0.04, yoyo: true, repeat: 17, ease: 'none', delay: 0.9 },
      ));

      tl.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.2, rotate: 15 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.75, delay: 0.9, ease: 'elastic.out(1.1, 0.5)' },
      );

      tweens.push(gsap.fromTo(
        modalRef.current,
        { boxShadow: '0 0 0px #f5c84200' },
        {
          boxShadow: '0 0 50px #f5c842cc, 0 0 100px #f5c84266',
          duration: 0.4,
          delay: 1.8,
          yoyo: true,
          repeat: 5,
          ease: 'power2.inOut',
          onComplete() {
            if (modalRef.current) {
              gsap.to(modalRef.current, { boxShadow: 'none', duration: 0.3 });
            }
          },
        },
      ));

      schedule(() => {
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.1, y: 0.5 }, colors: ['#f5c842', '#ec4899', '#4cc9f0', '#fff'] });
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.9, y: 0.5 }, colors: ['#f5c842', '#ec4899', '#4cc9f0', '#fff'] });
      }, 950);
      schedule(() => {
        confetti({ particleCount: 55, spread: 80, origin: { x: 0.5, y: 0.2 }, colors: ['#f5c842', '#ffffff'] });
      }, 1400);

      schedule(() => {
        if (!premioRef.current) return;
        const texto = premioRef.current.textContent;
        premioRef.current.innerHTML = '';
        let animIdx = 0;
        [...texto].forEach((ch) => {
          if (ch === ' ') {
            premioRef.current.appendChild(document.createTextNode(' '));
            return;
          }
          const span = document.createElement('span');
          span.textContent = ch;
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          gsap.to(span, { opacity: 1, y: [20, 0], duration: 0.3, delay: animIdx * 0.07, ease: 'back.out(2)' });
          animIdx++;
          premioRef.current.appendChild(span);
        });
      }, 1000);

      const fire = (px, py) => confetti({
        particleCount: 50,
        spread: 120,
        origin: { x: px, y: py },
        colors: ['#f5c842', '#ec4899', '#4cc9f0', '#7b2fff', '#fff'],
      });
      schedule(() => { fire(0.2, 0.4); fire(0.8, 0.4); fire(0.5, 0.3); }, 1050);
      schedule(() => { fire(0.1, 0.6); fire(0.9, 0.6); fire(0.5, 0.5); }, 1350);
    }

    return () => {
      timers.forEach(clearTimeout);
      tweens.forEach(t => t.kill());
      gsap.set(document.body, { x: 0, y: 0 });
      if (modalRef.current) gsap.set(modalRef.current, { x: 0, y: 0, boxShadow: 'none' });
    };
  }, [info, yaParticipo]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      {!yaParticipo && info.nivel >= 1 && (
        <Suspense fallback={null}>
          <RevealTresJS nivel={info.nivel} color={info.color} />
        </Suspense>
      )}

      <div
        ref={luzRef}
        className="luz-rayos"
        style={{ background: `radial-gradient(ellipse at center, ${info.color}55 0%, transparent 70%)` }}
      />

      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div
          className={`modal modal--ticket-result modal--premio-${premioId} ${yaParticipo ? 'modal--ticket-used' : 'modal--ticket-new'}`}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          aria-describedby={descripcionId}
          tabIndex={-1}
        >
          {yaParticipo && (
            <>
              <svg className="ticket-used-shape ticket-used-shape--top" viewBox="0 0 340 110" aria-hidden="true">
                <defs>
                  <linearGradient id="ticketUsedTop" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="62%" stopColor="#fff7fb" />
                    <stop offset="100%" stopColor="#eaf8fd" />
                  </linearGradient>
                </defs>
                <path d="M24 8 H146 C146 26 178 26 178 8 H316 C323 8 328 13 329 20 L335 84 C336 91 331 96 324 96 H308 Q299 80 290 96 Q281 80 272 96 Q263 80 254 96 Q245 80 236 96 Q227 80 218 96 Q209 80 200 96 Q191 80 182 96 Q173 80 164 96 Q155 80 146 96 Q137 80 128 96 Q119 80 110 96 Q101 80 92 96 Q83 80 74 96 Q65 80 56 96 Q47 80 38 96 Q29 80 20 96 H12 C6 96 2 91 3 85 L15 18 C16 12 19 8 24 8 Z" fill="url(#ticketUsedTop)" />
              </svg>
              <svg className="ticket-used-shape ticket-used-shape--body" viewBox="0 0 340 410" aria-hidden="true">
                <defs>
                  <linearGradient id="ticketUsedBody" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="55%" stopColor="#fffafe" />
                    <stop offset="100%" stopColor="#edf9fd" />
                  </linearGradient>
                </defs>
                <path d="M20 34 Q29 50 38 34 Q47 50 56 34 Q65 50 74 34 Q83 50 92 34 Q101 50 110 34 Q119 50 128 34 Q137 50 146 34 Q155 50 164 34 Q173 50 182 34 Q191 50 200 34 Q209 50 218 34 Q227 50 236 34 Q245 50 254 34 Q263 50 272 34 Q281 50 290 34 Q299 50 308 34 H320 C328 34 334 40 334 48 V382 C334 392 326 400 316 400 H194 C194 378 146 378 146 400 H24 C14 400 6 392 6 382 V48 C6 40 12 34 20 34 Z" fill="url(#ticketUsedBody)" />
              </svg>
            </>
          )}

          {!yaParticipo && (
            <svg className="ticket-new-shape" viewBox="0 0 340 520" aria-hidden="true">
              <defs>
                <linearGradient id="ticketNewBody" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="56%" stopColor="#fff8fc" />
                  <stop offset="100%" stopColor="#edf9fd" />
                </linearGradient>
                <mask id="ticketNewJoinedMask">
                  <rect width="340" height="520" fill="black" />
                  <path d="M24 8 H154 C154 26 186 26 186 8 H316 C326 8 334 16 334 26 V494 C334 504 326 512 316 512 H186 C186 494 154 494 154 512 H24 C14 512 6 504 6 494 V26 C6 16 14 8 24 8 Z" fill="white" />
                  <path d="M6 124 Q15 140 24 124 Q33 140 42 124 Q51 140 60 124 Q69 140 78 124 Q87 140 96 124 Q105 140 114 124 Q123 140 132 124 Q141 140 150 124 Q159 140 168 124 Q177 140 186 124 Q195 140 204 124 Q213 140 222 124 Q231 140 240 124 Q249 140 258 124 Q267 140 276 124 Q285 140 294 124 Q303 140 312 124 Q321 140 334 124 L334 146 Q321 130 312 146 Q303 130 294 146 Q285 130 276 146 Q267 130 258 146 Q249 130 240 146 Q231 130 222 146 Q213 130 204 146 Q195 130 186 146 Q177 130 168 146 Q159 130 150 146 Q141 130 132 146 Q123 130 114 146 Q105 130 96 146 Q87 130 78 146 Q69 130 60 146 Q51 130 42 146 Q33 130 24 146 Q15 130 6 146 Z" fill="black" />
                </mask>
              </defs>
              <rect width="340" height="520" fill="url(#ticketNewBody)" mask="url(#ticketNewJoinedMask)" />
              <path className="ticket-new-shape__seam-edge ticket-new-shape__seam-edge--top" d="M6 124 Q15 140 24 124 Q33 140 42 124 Q51 140 60 124 Q69 140 78 124 Q87 140 96 124 Q105 140 114 124 Q123 140 132 124 Q141 140 150 124 Q159 140 168 124 Q177 140 186 124 Q195 140 204 124 Q213 140 222 124 Q231 140 240 124 Q249 140 258 124 Q267 140 276 124 Q285 140 294 124 Q303 140 312 124 Q321 140 334 124" />
              <path className="ticket-new-shape__seam-edge ticket-new-shape__seam-edge--bottom" d="M6 146 Q15 130 24 146 Q33 130 42 146 Q51 130 60 146 Q69 130 78 146 Q87 130 96 146 Q105 130 114 146 Q123 130 132 146 Q141 130 150 146 Q159 130 168 146 Q177 130 186 146 Q195 130 204 146 Q213 130 222 146 Q231 130 240 146 Q249 130 258 146 Q267 130 276 146 Q285 130 294 146 Q303 130 312 146 Q321 130 334 146" />
            </svg>
          )}

          {yaParticipo ? (
            <>
              <div className="resultado-emoji">🎟️</div>
              <h2 id={tituloId} className="modal__titulo" style={{ backgroundImage: 'linear-gradient(135deg, #1A8CB5, #F0306A)' }}>
                ¡Ya jugaste este mes!
              </h2>
              <p id={descripcionId} className="resultado-mensaje">
                Tu tirada ya fue registrada el <strong className="ya-participo__fecha">{formatFecha(fecha)}</strong>.
              </p>
              <div className="resultado-ya-participo">
                <span className="ya-participo__label">Tu resultado de ese día</span>
                <span
                  className="ya-participo__premio"
                  style={{ color: NIVELES[premioId]?.color ?? '#9989cc' }}
                >
                  {premioLabel}
                </span>
              </div>
              <p className="resultado-mensaje">
                Quedate atento a las promos del mes. 🗓️
              </p>
              <button className="btn-cerrar" onClick={onClose}>Entendido</button>
            </>
          ) : (
            <>
              <div className="resultado-emoji">{info.emoji}</div>
              <h2
                id={tituloId}
                className="modal__titulo"
                style={{ backgroundImage: `linear-gradient(135deg, ${info.color}, ${info.colorAlt})` }}
              >
                {info.titulo}
              </h2>

              {info.nivel > 0 && (
                <p
                  className={`resultado-premio resultado-premio--${premioId}`}
                  ref={premioRef}
                  style={{ color: info.color, textShadow: `0 0 16px ${info.color}55` }}
                >
                  {premioLabel}
                </p>
              )}

              <p id={descripcionId} className="resultado-mensaje">{renderMensaje(info.mensaje)}</p>

              <button className="btn-cerrar" onClick={onClose}>
                {info.nivel === 0 ? 'Cerrar' : '¡Genial, cerrar!'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function renderMensaje(mensaje) {
  return mensaje.split('\n').map((linea, index, lineas) => (
    <Fragment key={`${linea}-${index}`}>
      {linea}
      {index < lineas.length - 1 && <br />}
    </Fragment>
  ));
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '';
  try {
    return new Date(fechaStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fechaStr;
  }
}
