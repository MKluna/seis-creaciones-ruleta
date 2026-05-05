require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');

const {
  limiterParticipacion,
  limiterParticipacionBurst,
  limiterGeneral,
  limiterCsrf,
  limiterAdmin,
} = require('./middleware/rateLimit');
const { generarToken, validarToken, validarFormulario, validarDatos } = require('./middleware/antiBot');
const { girar, getPremiosPublicos } = require('./ruleta');
const db       = require('./db');
const telegram = require('./telegram');

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Seguridad HTTP ─────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'x-admin-key'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(limiterGeneral);

// ── Rutas ──────────────────────────────────────────────────────────────────────

// Token CSRF para el formulario (máx 20 por IP cada 10 min)
app.get('/api/csrf-token', limiterCsrf, (req, res) => {
  res.json({ token: generarToken() });
});

// Info pública de la ruleta (labels y colores, sin probabilidades)
app.get('/api/premios', (req, res) => {
  res.json(getPremiosPublicos());
});

// Middleware: devuelve el premio anterior sin consumir el rate limit
function checkYaParticipo(req, res, next) {
  const anterior = db.participacionReciente(req.body.telefono);
  if (anterior) {
    return res.json({
      yaParticipo: true,
      premioId:    anterior.premio_id,
      premioLabel: anterior.premio_label,
      fecha:       anterior.fecha_giro,
    });
  }
  next();
}

// Participación
app.post(
  '/api/participar',
  validarToken,
  validarFormulario,
  validarDatos,
  checkYaParticipo,      // ← antes del rate limiter: usuarios reales nunca lo tocan
  limiterParticipacionBurst,
  limiterParticipacion,
  async (req, res) => {
    const { nombre, telefono, deviceFingerprint } = req.body;
    const ip = req.ip;

    const esBotSospechoso = req.esBotSospechoso || db.deviceSospechoso(deviceFingerprint);

    // Calcula resultado server-side (nunca en el frontend)
    const premio = girar();

    const participante = db.registrar({
      nombre,
      telefono,
      premio,
      ip,
      device_fingerprint: deviceFingerprint,
      es_bot_sospechoso: esBotSospechoso,
    });

    // Notificación Telegram en background (no bloquea la respuesta)
    telegram.notificar(participante).catch(() => {});

    res.json({
      yaParticipo: false,
      premioId:    premio.id,
      premioLabel: premio.label,
    });
  }
);

function validarAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
}

// Lista de participantes (protegida con rate limit anti fuerza bruta)
app.get('/api/participantes', limiterAdmin, validarAdmin, (req, res) => {
  res.json(db.listarTodos());
});

app.delete('/api/participantes', limiterAdmin, validarAdmin, (req, res) => {
  if (req.query.confirm !== 'limpiar') {
    return res.status(400).json({ error: 'Confirmacion requerida.' });
  }

  const eliminados = db.eliminarTodos();
  res.json({ ok: true, eliminados });
});

app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
