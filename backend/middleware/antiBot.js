const { randomUUID } = require('crypto');

// Tokens CSRF en memoria (en prod podría ser Redis)
const tokens = new Map();
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
const TIEMPO_MINIMO_HUMANO_MS = 800;
const TIEMPO_SOSPECHOSO_MS = 2000;

setInterval(() => {
  const ahora = Date.now();
  for (const [token, ts] of tokens) {
    if (ahora - ts > TOKEN_TTL_MS) tokens.delete(token);
  }
}, 5 * 60 * 1000);

function generarToken() {
  const token = randomUUID();
  tokens.set(token, Date.now());
  return token;
}

function validarToken(req, res, next) {
  const token = req.headers['x-csrf-token'];
  if (!token || !tokens.has(token)) {
    return res.status(403).json({ error: 'Token de seguridad inválido. Recargá la página.' });
  }
  tokens.delete(token); // uso único
  next();
}

// Validaciones anti-bot sobre el body del formulario
function validarFormulario(req, res, next) {
  const { honeypot, tiempoFormulario } = req.body;

  // Campo trampa: un humano no lo completa. Si viene lleno, bloqueamos.
  if (honeypot && honeypot.length > 0) {
    return res.status(400).json({ error: 'Solicitud inválida. Recargá la página e intentá de nuevo.' });
  }

  // Menos de 800 ms es casi imposible para un humano desde apertura de modal hasta envío.
  // Entre 800 ms y 2 s se marca como sospechoso, pero se permite para evitar falsos positivos.
  const tiempo = parseInt(tiempoFormulario ?? '9999', 10);
  if (!isNaN(tiempo) && tiempo < TIEMPO_MINIMO_HUMANO_MS) {
    return res.status(400).json({ error: 'Solicitud demasiado rápida. Recargá la página e intentá de nuevo.' });
  }
  if (!isNaN(tiempo) && tiempo < TIEMPO_SOSPECHOSO_MS) {
    req.esBotSospechoso = true;
  }

  next();
}

const NOMBRE_RE = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'-]{2,50}$/;

function normalizarTelefono(raw) {
  // Quita todo salvo dígitos
  let tel = (raw ?? '').replace(/\D/g, '');
  // Quita prefijo internacional: 0054 / 54
  if (tel.startsWith('0054')) tel = tel.slice(4);
  else if (tel.startsWith('54') && (tel.length === 12 || tel.length === 13)) tel = tel.slice(2);
  // Quita '0' de discado nacional (011...)
  if (tel.startsWith('0')) tel = tel.slice(1);
  // Quita '9' de prefijo móvil interurbano (9 11 XXXX-XXXX → 11 XXXX-XXXX)
  if (tel.length === 11 && tel.startsWith('9')) tel = tel.slice(1);
  return tel;
}

function esTelefonoValido(tel) {
  // Exactamente 10 dígitos, primer dígito entre 1-9 (sin 0 de discado)
  if (!/^[1-9]\d{9}$/.test(tel)) return false;
  // Rechazar todos iguales (ej: 1111111111) o secuenciales obvios
  // Nota: '0123456789' es condición muerta — normalizarTelefono ya quitó el '0' inicial
  if (/^(\d)\1{9}$/.test(tel)) return false;
  if (tel === '1234567890') return false;
  return true;
}

function validarDatos(req, res, next) {
  const { nombre, telefono } = req.body;

  if (!nombre || !NOMBRE_RE.test(nombre.trim())) {
    return res.status(400).json({ error: 'Nombre inválido.' });
  }

  const telNorm = normalizarTelefono(telefono);
  if (!esTelefonoValido(telNorm)) {
    return res.status(400).json({ error: 'Teléfono inválido. Ingresá un número argentino real (10 dígitos).' });
  }

  req.body.nombre   = nombre.trim();
  req.body.telefono = telNorm;
  next();
}

module.exports = { generarToken, validarToken, validarFormulario, validarDatos };
