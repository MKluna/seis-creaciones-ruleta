const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const JSON_FILE = path.join(DATA_DIR, 'participantes.json');
const configuredDbFile = process.env.SQLITE_DB_FILE || process.env.SQLITE_DB_PATH;
const DB_FILE = configuredDbFile
  ? path.resolve(__dirname, '..', configuredDbFile)
  : path.join(DATA_DIR, 'participantes.db');

if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS participantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    premio_id TEXT NOT NULL,
    premio_label TEXT NOT NULL,
    fecha_giro TEXT NOT NULL,
    ip TEXT,
    device_fingerprint TEXT,
    es_bot_sospechoso INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_participantes_telefono_fecha
    ON participantes (telefono, fecha_giro);

  CREATE INDEX IF NOT EXISTS idx_participantes_device_fecha
    ON participantes (device_fingerprint, fecha_giro);

  CREATE INDEX IF NOT EXISTS idx_participantes_fecha
    ON participantes (fecha_giro);
`);

const SELECT_FIELDS = `
  id,
  nombre,
  telefono,
  premio_id,
  premio_label,
  fecha_giro,
  ip,
  device_fingerprint,
  es_bot_sospechoso
`;

function normalizarParticipanteJson(participante) {
  if (!participante || typeof participante !== 'object') return null;
  if (!participante.nombre || !participante.telefono || !participante.premio_id || !participante.premio_label || !participante.fecha_giro) {
    return null;
  }

  return {
    id: Number.isInteger(participante.id) ? participante.id : null,
    nombre: String(participante.nombre),
    telefono: String(participante.telefono),
    premio_id: String(participante.premio_id),
    premio_label: String(participante.premio_label),
    fecha_giro: String(participante.fecha_giro),
    ip: participante.ip ? String(participante.ip) : null,
    device_fingerprint: participante.device_fingerprint ? String(participante.device_fingerprint) : null,
    es_bot_sospechoso: participante.es_bot_sospechoso ? 1 : 0,
  };
}

function migrarDesdeJsonSiNecesario() {
  const total = db.prepare('SELECT COUNT(*) AS total FROM participantes').get().total;
  if (total > 0 || !fs.existsSync(JSON_FILE)) return;

  const contenido = fs.readFileSync(JSON_FILE, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(contenido);
  } catch (error) {
    console.warn(`No se pudo migrar ${JSON_FILE}: JSON invalido.`);
    return;
  }

  const participantes = Array.isArray(parsed?.participantes) ? parsed.participantes : [];
  if (participantes.length === 0) return;

  const insertarConId = db.prepare(`
    INSERT OR IGNORE INTO participantes (
      id,
      nombre,
      telefono,
      premio_id,
      premio_label,
      fecha_giro,
      ip,
      device_fingerprint,
      es_bot_sospechoso
    ) VALUES (
      @id,
      @nombre,
      @telefono,
      @premio_id,
      @premio_label,
      @fecha_giro,
      @ip,
      @device_fingerprint,
      @es_bot_sospechoso
    )
  `);

  const insertarSinId = db.prepare(`
    INSERT INTO participantes (
      nombre,
      telefono,
      premio_id,
      premio_label,
      fecha_giro,
      ip,
      device_fingerprint,
      es_bot_sospechoso
    ) VALUES (
      @nombre,
      @telefono,
      @premio_id,
      @premio_label,
      @fecha_giro,
      @ip,
      @device_fingerprint,
      @es_bot_sospechoso
    )
  `);

  const migrar = db.transaction(() => {
    for (const participante of participantes) {
      const normalizado = normalizarParticipanteJson(participante);
      if (!normalizado) continue;

      if (normalizado.id) {
        insertarConId.run(normalizado);
      } else {
        insertarSinId.run(normalizado);
      }
    }
  });

  migrar();
}

migrarDesdeJsonSiNecesario();

function participacionReciente(telefono) {
  const ahora = new Date();
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)).toISOString();
  const inicioMesSiguiente = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1)).toISOString();

  return db.prepare(`
    SELECT ${SELECT_FIELDS}
    FROM participantes
    WHERE telefono = ?
      AND fecha_giro >= ?
      AND fecha_giro < ?
    ORDER BY fecha_giro DESC
    LIMIT 1
  `).get(telefono, inicioMes, inicioMesSiguiente) ?? null;
}

function deviceSospechoso(fingerprint) {
  if (!fingerprint) return false;
  const hace24hs = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const row = db.prepare(`
    SELECT COUNT(*) AS total
    FROM participantes
    WHERE device_fingerprint = ?
      AND fecha_giro >= ?
  `).get(fingerprint, hace24hs);

  return Number(row?.total ?? 0) >= 5;
}

function registrar({ nombre, telefono, premio, ip, device_fingerprint, es_bot_sospechoso }) {
  const fechaGiro = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO participantes (
      nombre,
      telefono,
      premio_id,
      premio_label,
      fecha_giro,
      ip,
      device_fingerprint,
      es_bot_sospechoso
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nombre,
    telefono,
    premio.id,
    premio.label,
    fechaGiro,
    ip ?? null,
    device_fingerprint ?? null,
    es_bot_sospechoso ? 1 : 0,
  );

  return db.prepare(`
    SELECT ${SELECT_FIELDS}
    FROM participantes
    WHERE id = ?
  `).get(result.lastInsertRowid);
}

function listarTodos() {
  return db.prepare(`
    SELECT
      id,
      nombre,
      telefono,
      premio_label,
      fecha_giro,
      ip,
      es_bot_sospechoso
    FROM participantes
    ORDER BY fecha_giro DESC
    LIMIT 500
  `).all();
}

function eliminarTodos() {
  return db.transaction(() => {
    const result = db.prepare('DELETE FROM participantes').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'participantes'").run();
    return result.changes;
  })();
}

function eliminarSinPremioEntre(inicioIso, finIso) {
  return db.transaction(() => {
    const params = { inicioIso, finIso };
    const totalSinPremio = db.prepare(`
      SELECT COUNT(*) AS total
      FROM participantes
      WHERE premio_id = 'sin_premio'
        AND fecha_giro >= @inicioIso
        AND fecha_giro < @finIso
    `).get(params).total;

    const totalGanadores = db.prepare(`
      SELECT COUNT(*) AS total
      FROM participantes
      WHERE premio_id <> 'sin_premio'
        AND fecha_giro >= @inicioIso
        AND fecha_giro < @finIso
    `).get(params).total;

    const result = db.prepare(`
      DELETE FROM participantes
      WHERE premio_id = 'sin_premio'
        AND fecha_giro >= @inicioIso
        AND fecha_giro < @finIso
    `).run(params);

    return {
      eliminados: result.changes,
      candidatos: totalSinPremio,
      conservadosGanadores: totalGanadores,
    };
  })();
}

module.exports = {
  participacionReciente,
  deviceSospechoso,
  registrar,
  listarTodos,
  eliminarTodos,
  eliminarSinPremioEntre,
  DB_FILE,
};
