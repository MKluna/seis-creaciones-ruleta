const TIME_ZONE = process.env.RULETA_TIME_ZONE || 'America/Argentina/Buenos_Aires';
const REGLA_ACTIVA = String(process.env.RULETA_SOLO_VIERNES_MAYO ?? 'true') === 'true';
const ANIO_HABILITADO = Number(process.env.RULETA_ANIO_HABILITADO ?? 2026);
const MES_HABILITADO = Number(process.env.RULETA_MES_HABILITADO ?? 5);
const VIERNES = 5;
const MENSAJE_CERRADA = 'La ruleta estara disponible solo los viernes de mayo.';

function partesFecha(fecha) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(fecha);

  const valor = tipo => partes.find(parte => parte.type === tipo)?.value;
  const weekday = valor('weekday');
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(valor('year')),
    month: Number(valor('month')),
    day: Number(valor('day')),
    weekday: weekdayMap[weekday],
  };
}

function estadoRuleta(fecha = new Date()) {
  if (!REGLA_ACTIVA) {
    return { habilitada: true, mensaje: null };
  }

  const partes = partesFecha(fecha);
  const habilitada =
    partes.year === ANIO_HABILITADO &&
    partes.month === MES_HABILITADO &&
    partes.weekday === VIERNES;

  return {
    habilitada,
    mensaje: habilitada ? null : MENSAJE_CERRADA,
    regla: {
      soloViernesMayo: true,
      anio: ANIO_HABILITADO,
      mes: MES_HABILITADO,
      timeZone: TIME_ZONE,
    },
  };
}

function obtenerRangoViernesPasado(fecha = new Date()) {
  const partes = partesFecha(fecha);
  const diasDesdeViernes = ((partes.weekday - VIERNES + 7) % 7) || 7;
  const fechaLocalUtc = Date.UTC(partes.year, partes.month - 1, partes.day);
  const viernesLocalUtc = new Date(fechaLocalUtc - diasDesdeViernes * 24 * 60 * 60 * 1000);
  const year = viernesLocalUtc.getUTCFullYear();
  const month = viernesLocalUtc.getUTCMonth();
  const day = viernesLocalUtc.getUTCDate();

  // Argentina no usa DST actualmente: 00:00 America/Argentina/Buenos_Aires = 03:00 UTC.
  const inicio = new Date(Date.UTC(year, month, day, 3, 0, 0, 0));
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  return {
    fecha: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    inicioIso: inicio.toISOString(),
    finIso: fin.toISOString(),
    timeZone: TIME_ZONE,
  };
}

function validarVentanaRuleta(req, res, next) {
  const estado = estadoRuleta();
  if (!estado.habilitada) {
    return res.status(403).json({ error: estado.mensaje });
  }
  next();
}

module.exports = { estadoRuleta, obtenerRangoViernesPasado, validarVentanaRuleta };
