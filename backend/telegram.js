function escapeHtml(value) {
  return String(value ?? 'No disponible')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatearFecha(fechaIso) {
  if (!fechaIso) return 'No disponible';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return fechaIso;

  const partes = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(fecha);

  const valor = tipo => partes.find(parte => parte.type === tipo)?.value ?? '';
  return `${valor('day')}/${valor('month')}/${valor('year')} ${valor('hour')}:${valor('minute')}`;
}

function formatearSiNo(value) {
  return Number(value) === 1 || value === true ? 'Sí' : 'No';
}

function armarMensaje(participante) {
  return [
    '🎡 <b>Nueva participación - Seis Creaciones</b>',
    '',
    `<b>ID:</b> ${escapeHtml(participante.id)}`,
    `<b>Nombre:</b> ${escapeHtml(participante.nombre)}`,
    `<b>Teléfono:</b> ${escapeHtml(participante.telefono)}`,
    `<b>Premio ID:</b> ${escapeHtml(participante.premio_id)}`,
    `<b>Premio:</b> ${escapeHtml(participante.premio_label)}`,
    `<b>Fecha:</b> ${escapeHtml(formatearFecha(participante.fecha_giro))}`,
    `<b>IP:</b> ${escapeHtml(participante.ip)}`,
    `<b>Dispositivo:</b> <code>${escapeHtml(participante.device_fingerprint)}</code>`,
    `<b>Bot sospechoso:</b> ${formatearSiNo(participante.es_bot_sospechoso)}`,
  ].join('\n');
}

async function notificar(participante) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. Notificación omitida.');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: armarMensaje(participante),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram] Error al enviar:', err);
    }
  } catch (err) {
    console.error('[Telegram] Excepción:', err.message);
  }
}

module.exports = { notificar, armarMensaje };
