import { useId, useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const TEL_AR = /^(\+?54)?[\s\-.(]*(9|11|[2-9]\d)[\s\-.]?\d{4}[\s\-.]?\d{4}$/;
const NOMBRE_RE = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'-]{2,50}$/;

export default function FormularioModal({ onSubmit, onClose, cargando }) {
  const [campos, setCampos]   = useState({ nombre: '', telefono: '' });
  const [errores, setErrores] = useState({});
  const [honeypot, setHoneypot] = useState('');
  const inicioRef = useRef(Date.now());
  const modalRef  = useRef(null);
  const gruposRef = useRef([]);
  const tituloId = useId();
  const descripcionId = useId();

  useEffect(() => {
    // Timeline coordinado: campos empiezan cuando el modal ya es parcialmente visible
    const tl = gsap.timeline();
    tl.fromTo(
      modalRef.current,
      { opacity: 0, scale: 0.85, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
    ).to(
      gruposRef.current,
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: 'power2.out' },
      0.15  // empieza a los 0.15s (solapado con la entrada del modal)
    );
    modalRef.current?.focus();

    return () => tl.kill();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !cargando) onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cargando, onClose]);

  function validar() {
    const e = {};
    if (!NOMBRE_RE.test(campos.nombre.trim())) e.nombre = 'Ingresá tu nombre.';
    const telLimpio = campos.telefono.replace(/[\s\-().]/g, '');
    if (!TEL_AR.test(telLimpio)) e.telefono = 'Teléfono argentino inválido. Ej: 11 1234 5678';
    return e;
  }

  function sacudirCampo(campo) {
    const el = gruposRef.current.find(g => g?.dataset?.campo === campo);
    if (!el) return;
    gsap.fromTo(el, { x: -8 }, {
      x: 0, duration: 0.4,
      ease: 'elastic.out(1, 0.3)',
      keyframes: [{ x: -8 }, { x: 8 }, { x: -5 }, { x: 5 }, { x: 0 }],
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const e2 = validar();
    setErrores(e2);
    if (Object.keys(e2).length > 0) {
      Object.keys(e2).forEach(sacudirCampo);
      return;
    }
    const tiempoFormulario = Date.now() - inicioRef.current;
    onSubmit({ ...campos, honeypot, tiempoFormulario });
  }

  function setRef(i) {
    return el => { gruposRef.current[i] = el; };
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !cargando && onClose()}>
      <div
        className="modal modal--form"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        tabIndex={-1}
      >
        <div className="form-modal__shine" />
        <div className="form-modal__badge">Participá</div>
        <h2 id={tituloId} className="modal__titulo form-modal__title">¡Casi listo!</h2>
        <p id={descripcionId} className="modal__sub form-modal__sub">Ingresá tus datos para girar la ruleta 🎡</p>

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          {/* Honeypot invisible */}
          <input
            className="honeypot"
            type="text"
            name="empresa"
            tabIndex={-1}
            aria-hidden="true"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
          />

          {[
            { campo: 'nombre',   label: 'Nombre',   type: 'text', placeholder: 'Juan' },
            { campo: 'telefono', label: 'Teléfono', type: 'tel',  placeholder: '11 2345 6789' },
          ].map(({ campo, label, type, placeholder }, i) => (
            <div
              key={campo}
              className="form-group"
              ref={setRef(i)}
              data-campo={campo}
            >
              <label htmlFor={campo}>{label}</label>
              <input
                id={campo}
                type={type}
                placeholder={placeholder}
                value={campos[campo]}
                className={errores[campo] ? 'error' : ''}
                onChange={e => {
                  setCampos(c => ({ ...c, [campo]: e.target.value }));
                  if (errores[campo]) setErrores(er => ({ ...er, [campo]: '' }));
                }}
                disabled={cargando}
                autoComplete="off"
              />
              <span className="form-error">{errores[campo] ?? ''}</span>
            </div>
          ))}

          <button type="submit" className="btn-participar" disabled={cargando}>
            {cargando ? '¡Girando…!' : '🎰 ¡GIRAR AHORA!'}
          </button>
        </form>
      </div>
    </div>
  );
}
