const rateLimit = require('express-rate-limit');

const PARTICIPACION_RATE_WINDOW_MS = Number(process.env.PARTICIPACION_RATE_WINDOW_MS ?? 60 * 60 * 1000);
const PARTICIPACION_RATE_MAX = Number(process.env.PARTICIPACION_RATE_MAX ?? 20);
const PARTICIPACION_BURST_WINDOW_MS = Number(process.env.PARTICIPACION_BURST_WINDOW_MS ?? 10 * 60 * 1000);
const PARTICIPACION_BURST_MAX = Number(process.env.PARTICIPACION_BURST_MAX ?? 10);

// Participación: límite por IP configurable.
// La restricción fuerte del negocio es un teléfono por mes; este límite solo frena abuso masivo
// sin castigar demasiado a clientes reales que compartan WiFi/datos móviles.
const limiterParticipacion = rateLimit({
  windowMs: PARTICIPACION_RATE_WINDOW_MS,
  max: PARTICIPACION_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde tu conexión. Intentá más tarde.' },
});

// Freno corto para ráfagas automatizadas. Es más permisivo que un captcha:
// un grupo real puede participar, pero un script no puede disparar decenas en minutos.
const limiterParticipacionBurst = rateLimit({
  windowMs: PARTICIPACION_BURST_WINDOW_MS,
  max: PARTICIPACION_BURST_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde tu conexión. Intentá más tarde.' },
});

// General: máx 100 requests por IP cada 15 minutos
const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
});

// CSRF token: máx 20 tokens por IP cada 10 minutos
// Un usuario legítimo solo necesita 1 por sesión; esto bloquea generadores de tokens masivos
const limiterCsrf = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
});

// Admin: máx 10 requests por IP cada 15 minutos — dificulta fuerza bruta de ADMIN_KEY
const limiterAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intentá de nuevo en unos minutos.' },
});

module.exports = { limiterParticipacion, limiterParticipacionBurst, limiterGeneral, limiterCsrf, limiterAdmin };
