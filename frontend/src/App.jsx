import { useState, useRef } from 'react';
import Ruleta from './components/Ruleta';
import FormularioModal from './components/FormularioModal';
import ResultadoModal from './components/ResultadoModal';
import FondoAnimado from './components/FondoAnimado';
import BtnGirarParticulas from './components/BtnGirarParticulas';
import { useRuleta } from './hooks/useRuleta';
import { audio } from './utils/sonidos';

export default function App() {
  const ruletaRef  = useRef(null);
  const bgStarted  = useRef(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarResultado, setMostrarResultado]   = useState(false);
  const [muted, setMuted] = useState(true); // arranca sin sonido, usuario activa

  const { premios, girando, setGirando, resultado, error, participar, resetear } = useRuleta();

  // Arranca la música en el primer click en GIRAR (no en el botón mute)
  function iniciarAudio() {
    if (bgStarted.current) return;
    bgStarted.current = true;
    audio.init();
    if (!audio.muted) audio.startBg();
  }

  function handleMute() {
    // Solo inicializa el contexto (gesto de usuario), no arranca la música todavía
    audio.init();
    const m = audio.toggle();
    setMuted(m);
  }

  async function handleGirar() {
    if (girando || !premios.length) return;
    iniciarAudio(); // aquí sí arranca la música si no está muteado
    setMostrarFormulario(true);
  }

  async function handleSubmitFormulario(datos) {
    setMostrarFormulario(false);

    const res = await participar(datos);
    if (!res) return;

    // Ya participó este mes → mostrar resultado directo, sin girar
    if (res.yaParticipo) {
      setGirando(false);
      setMostrarResultado(true);
      return;
    }

    const premioIndex = premios.findIndex(p => p.id === res.premioId);
    const idx = premioIndex >= 0 ? premioIndex : 0;

    // Guard: si el ref no está montado evitamos que el botón quede bloqueado para siempre
    if (!ruletaRef.current) {
      setGirando(false);
      setMostrarResultado(true);
      return;
    }
    ruletaRef.current.girarHasta(idx, () => {
      setGirando(false);
      setMostrarResultado(true);
    });
  }

  function handleCerrarResultado() {
    setMostrarResultado(false);
    resetear();
  }

  return (
    <div className="app">
      <FondoAnimado />

      {/* Botón mute — esquina superior derecha */}
      <button
        className="btn-mute"
        onClick={handleMute}
        title={muted ? 'Activar sonido' : 'Silenciar'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <header className="header">
        <h1 className="header__marca">Seis Creaciones</h1>
        <p className="header__sub">¡Girá la ruleta y probá tu suerte!</p>
      </header>

      <div className="ruleta-wrapper">
        <Ruleta ref={ruletaRef} premios={premios} girando={girando} />

        <BtnGirarParticulas
          className="btn-girar"
          onClick={handleGirar}
          disabled={girando || !premios.length}
        >
          {girando ? '¡Girando…!' : '🎰 ¡GIRAR!'}
        </BtnGirarParticulas>

        {error && (
          <div className="error-box">
            <p className="error-box__icon">⚠️</p>
            <p className="error-box__text">{error}</p>
          </div>
        )}
      </div>

      {mostrarFormulario && (
        <FormularioModal
          onSubmit={handleSubmitFormulario}
          onClose={() => setMostrarFormulario(false)}
          cargando={girando}
        />
      )}

      {mostrarResultado && resultado && (
        <ResultadoModal
          resultado={resultado}
          onClose={handleCerrarResultado}
        />
      )}

    </div>
  );
}
