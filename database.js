/**
 * database.js  —  SQLite persistence using sql.js (pure-JS, no native build)
 *
 * sql.js keeps the database in-memory (WASM).
 * We load from / flush to disk (qcgate.db) on every write.
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'qcgate.db');

let SQL = null;   // sql.js module
let db  = null;   // current in-memory Database instance

// ── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  if (db) return;

  SQL = await require('sql.js')();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL;');
  _createSchema();
  _flush();     // write fresh db to disk if just created
}

function _createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS production_state (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      date        TEXT NOT NULL DEFAULT '',
      shift       TEXT NOT NULL DEFAULT 'Shift Red',
      operator    TEXT NOT NULL DEFAULT '',
      target      INTEGER NOT NULL DEFAULT 0,
      ok1         INTEGER NOT NULL DEFAULT 0,
      repair1     INTEGER NOT NULL DEFAULT 0,
      ng1         INTEGER NOT NULL DEFAULT 0,
      ok2         INTEGER NOT NULL DEFAULT 0,
      repair2     INTEGER NOT NULL DEFAULT 0,
      ng2         INTEGER NOT NULL DEFAULT 0,
      defect_data TEXT NOT NULL DEFAULT '{}',
      repair_data TEXT NOT NULL DEFAULT '{}',
      hourly_data TEXT NOT NULL DEFAULT '{}',
      saved_at    TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      shift       TEXT NOT NULL,
      operator    TEXT NOT NULL,
      target      INTEGER NOT NULL DEFAULT 0,
      ok1         INTEGER NOT NULL DEFAULT 0,
      repair1     INTEGER NOT NULL DEFAULT 0,
      ng1         INTEGER NOT NULL DEFAULT 0,
      ok2         INTEGER NOT NULL DEFAULT 0,
      repair2     INTEGER NOT NULL DEFAULT 0,
      ng2         INTEGER NOT NULL DEFAULT 0,
      defect_data TEXT NOT NULL DEFAULT '{}',
      repair_data TEXT NOT NULL DEFAULT '{}',
      hourly_data TEXT NOT NULL DEFAULT '{}',
      saved_at    TEXT NOT NULL
    );
  `);

  // Ensure singleton row exists
  db.run(
    `INSERT OR IGNORE INTO production_state (id, saved_at) VALUES (1, ?)`,
    [new Date().toISOString()]
  );
}

/** Write the in-memory WASM db back to disk */
function _flush() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/** Helper: run a SELECT, return array of plain objects */
function _all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/** Helper: run a SELECT, return first row or null */
function _get(sql, params = []) {
  const rows = _all(sql, params);
  return rows[0] || null;
}

// ── Public API ────────────────────────────────────────────────────────────────

function getState() {
  const row = _get('SELECT * FROM production_state WHERE id = 1');
  if (!row) return null;
  return {
    date:       row.date,
    shift:      row.shift,
    operator:   row.operator,
    target:     row.target,
    ok1:        row.ok1,
    repair1:    row.repair1,
    ng1:        row.ng1,
    ok2:        row.ok2,
    repair2:    row.repair2,
    ng2:        row.ng2,
    defectData: JSON.parse(row.defect_data || '{}'),
    repairData: JSON.parse(row.repair_data || '{}'),
    hourlyData: JSON.parse(row.hourly_data || '{}'),
    savedAt:    row.saved_at
  };
}

function saveState(state) {
  db.run(
    `UPDATE production_state SET
       date=?, shift=?, operator=?, target=?,
       ok1=?, repair1=?, ng1=?,
       ok2=?, repair2=?, ng2=?,
       defect_data=?, repair_data=?, hourly_data=?,
       saved_at=?
     WHERE id = 1`,
    [
      state.date        || '',
      state.shift       || 'Shift Red',
      state.operator    || '',
      state.target      || 0,
      state.ok1         || 0,
      state.repair1     || 0,
      state.ng1         || 0,
      state.ok2         || 0,
      state.repair2     || 0,
      state.ng2         || 0,
      JSON.stringify(state.defectData || {}),
      JSON.stringify(state.repairData || {}),
      JSON.stringify(state.hourlyData || {}),
      new Date().toISOString()
    ]
  );
  _flush();
}

function resetState(archiveFirst = true) {
  if (archiveFirst) {
    const current = getState();
    const hasData = current &&
      (current.ok1 + current.repair1 + current.ng1 +
       current.ok2 + current.repair2 + current.ng2) > 0;

    if (hasData) {
      db.run(
        `INSERT INTO history
           (date, shift, operator, target, ok1, repair1, ng1, ok2, repair2, ng2,
            defect_data, repair_data, hourly_data, saved_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          current.date, current.shift, current.operator, current.target,
          current.ok1, current.repair1, current.ng1,
          current.ok2, current.repair2, current.ng2,
          JSON.stringify(current.defectData),
          JSON.stringify(current.repairData),
          JSON.stringify(current.hourlyData),
          new Date().toISOString()
        ]
      );
    }
  }

  db.run(
    `UPDATE production_state SET
       date='', shift='Shift Red', operator='', target=0,
       ok1=0, repair1=0, ng1=0, ok2=0, repair2=0, ng2=0,
       defect_data='{}', repair_data='{}', hourly_data='{}',
       saved_at=?
     WHERE id = 1`,
    [new Date().toISOString()]
  );
  _flush();
}

function getHistory(limit = 30) {
  return _all(
    'SELECT * FROM history ORDER BY id DESC LIMIT ?',
    [limit]
  ).map(row => ({
    id:         row.id,
    date:       row.date,
    shift:      row.shift,
    operator:   row.operator,
    target:     row.target,
    ok1: row.ok1, repair1: row.repair1, ng1: row.ng1,
    ok2: row.ok2, repair2: row.repair2, ng2: row.ng2,
    defectData: JSON.parse(row.defect_data || '{}'),
    repairData: JSON.parse(row.repair_data || '{}'),
    hourlyData: JSON.parse(row.hourly_data || '{}'),
    savedAt:    row.saved_at
  }));
}

module.exports = { init, getState, saveState, resetState, getHistory };
