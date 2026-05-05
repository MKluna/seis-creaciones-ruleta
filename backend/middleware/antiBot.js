const { randomUUID } = require('crypto');

// Tokens CSRF en memoria (en prod podria ser Redis).
const tokens = new Map();
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
const TIEMPO_MINIMO_HUMANO_MS = 800;
const TIEMPO_SOSPECHOSO_MS = 2000;

const limpiezaTokens = setInterval(() => {
  const ahora = Date.now();
  for (const [token, ts] of tokens) {
    if (ahora - ts > TOKEN_TTL_MS) tokens.delete(token);
  }
}, 5 * 60 * 1000);
limpiezaTokens.unref?.();

function generarToken() {
  const token = randomUUID();
  tokens.set(token, Date.now());
  return token;
}

function validarToken(req, res, next) {
  const token = req.headers['x-csrf-token'];
  if (!token || !tokens.has(token)) {
    return res.status(403).json({ error: 'Token de seguridad invalido. Recarga la pagina.' });
  }
  tokens.delete(token); // uso unico
  next();
}

function validarFormulario(req, res, next) {
  const { honeypot, tiempoFormulario } = req.body;

  if (honeypot && honeypot.length > 0) {
    return res.status(400).json({ error: 'Solicitud invalida. Recarga la pagina e intenta de nuevo.' });
  }

  const tiempo = parseInt(tiempoFormulario ?? '9999', 10);
  if (!Number.isNaN(tiempo) && tiempo < TIEMPO_MINIMO_HUMANO_MS) {
    return res.status(400).json({ error: 'Solicitud demasiado rapida. Recarga la pagina e intenta de nuevo.' });
  }
  if (!Number.isNaN(tiempo) && tiempo < TIEMPO_SOSPECHOSO_MS) {
    req.esBotSospechoso = true;
  }

  next();
}

const NOMBRE_RE = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'-]{2,35}$/;
const PALABRAS_PROHIBIDAS_NOMBRE = new Set([
  'admin',
  'bot',
  'fake',
  'falso',
  'mamenimomu',
  'pepe',
  'prueba',
  'sapo',
  'test',
  'tramposo',
]);

function normalizarNombre(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

function quitarTildes(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function esNombreValido(nombre) {
  if (!NOMBRE_RE.test(nombre)) return false;

  const palabras = nombre.split(' ');
  if (palabras.length > 3) return false;

  for (const palabra of palabras) {
    const limpia = quitarTildes(palabra.toLowerCase().replace(/['-]/g, ''));
    if (limpia.length < 2 || limpia.length > 18) return false;
    if (PALABRAS_PROHIBIDAS_NOMBRE.has(limpia)) return false;
    if (/([a-záéíóúüñ])\1{3,}/i.test(limpia)) return false;
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(limpia)) return false;

    const vocales = (limpia.match(/[aeiou]/g) ?? []).length;
    if (limpia.length >= 5 && vocales === 0) return false;
  }

  return true;
}

function normalizarTelefono(raw) {
  let tel = (raw ?? '').replace(/\D/g, '');

  if (tel.startsWith('0054')) tel = tel.slice(4);
  else if (tel.startsWith('54') && (tel.length === 12 || tel.length === 13)) tel = tel.slice(2);

  if (tel.startsWith('0')) tel = tel.slice(1);
  if (tel.length === 11 && tel.startsWith('9')) tel = tel.slice(1);

  return tel;
}

function esTelefonoValido(tel) {
  if (!/^[1-9]\d{9}$/.test(tel)) return false;
  if (/^(\d)\1{9}$/.test(tel)) return false;
  if (tel === '1234567890') return false;
  return true;
}

function validarDatos(req, res, next) {
  const { nombre, telefono } = req.body;

  const nombreNorm = normalizarNombre(nombre);
  if (!esNombreValido(nombreNorm)) {
    return res.status(400).json({ error: 'Ingresa un nombre valido para participar.' });
  }

  const telNorm = normalizarTelefono(telefono);
  if (!esTelefonoValido(telNorm)) {
    return res.status(400).json({ error: 'Telefono invalido. Ingresa un numero argentino real (10 digitos).' });
  }

  req.body.nombre = nombreNorm;
  req.body.telefono = telNorm;
  next();
}

module.exports = { generarToken, validarToken, validarFormulario, validarDatos };
