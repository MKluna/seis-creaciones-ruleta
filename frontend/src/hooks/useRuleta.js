import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const API = import.meta.env.VITE_API_URL || '/api';

export function useRuleta() {
  const [premios, setPremios]           = useState([]);
  const [csrfToken, setCsrfToken]       = useState(null);
  const [fingerprint, setFingerprint]   = useState(null);
  const [girando, setGirando]           = useState(false);
  const [resultado, setResultado]       = useState(null);
  const [error, setError]               = useState(null);

  useEffect(() => {
    // Carga premios públicos (sin probabilidades) y token CSRF en paralelo
    Promise.all([
      fetch(`${API}/premios`).then(r => r.json()),
      fetch(`${API}/csrf-token`).then(r => r.json()),
    ]).then(([p, { token }]) => {
      setPremios(p);
      setCsrfToken(token);
    }).catch(() => setError('No se pudo conectar al servidor.'));

    // Fingerprint del dispositivo
    FingerprintJS.load()
      .then(fp => fp.get())
      .then(({ visitorId }) => setFingerprint(visitorId))
      .catch(() => {});
  }, []);

  async function participar({ nombre, telefono, tiempoFormulario, honeypot }) {
    if (girando) return;
    setGirando(true);
    setError(null);

    try {
      const res = await fetch(`${API}/participar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken ?? '',
        },
        body: JSON.stringify({
          nombre,
          telefono,
          tiempoFormulario,
          honeypot,
          deviceFingerprint: fingerprint,
        }),
      });

      // Renueva el CSRF token para la próxima llamada
      fetch(`${API}/csrf-token`)
        .then(r => r.json())
        .then(({ token }) => setCsrfToken(token))
        .catch(() => {});

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Error inesperado.' }));
        throw new Error(msg ?? 'Error inesperado.');
      }

      const data = await res.json();
      setResultado(data);
      return data;
    } catch (e) {
      setError(e.message);
      setGirando(false);
      return null;
    }
  }

  function resetear() {
    setResultado(null);
    setGirando(false);
  }

  return { premios, girando, setGirando, resultado, error, participar, resetear };
}
