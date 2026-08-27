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
  ok3         INTEGER NOT NULL DEFAULT 0,
  repair3     INTEGER NOT NULL DEFAULT 0,
  ng3         INTEGER NOT NULL DEFAULT 0,
  ok4         INTEGER NOT NULL DEFAULT 0,
  repair4     INTEGER NOT NULL DEFAULT 0,
  ng4         INTEGER NOT NULL DEFAULT 0,
  defect_data       JSONB NOT NULL DEFAULT '{}',
  repair_data       JSONB NOT NULL DEFAULT '{}',
  hourly_data       JSONB NOT NULL DEFAULT '{}',
  defect_data_shaft JSONB NOT NULL DEFAULT '{}',
  repair_data_shaft JSONB NOT NULL DEFAULT '{}',
  hourly_data_shaft JSONB NOT NULL DEFAULT '{}',
  entry_logs        JSONB NOT NULL DEFAULT '[]',
  saved_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS history (
  id          SERIAL PRIMARY KEY,
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
  ok3         INTEGER NOT NULL DEFAULT 0,
  repair3     INTEGER NOT NULL DEFAULT 0,
  ng3         INTEGER NOT NULL DEFAULT 0,
  ok4         INTEGER NOT NULL DEFAULT 0,
  repair4     INTEGER NOT NULL DEFAULT 0,
  ng4         INTEGER NOT NULL DEFAULT 0,
  defect_data       JSONB NOT NULL DEFAULT '{}',
  repair_data       JSONB NOT NULL DEFAULT '{}',
  hourly_data       JSONB NOT NULL DEFAULT '{}',
  defect_data_shaft JSONB NOT NULL DEFAULT '{}',
  repair_data_shaft JSONB NOT NULL DEFAULT '{}',
  hourly_data_shaft JSONB NOT NULL DEFAULT '{}',
  entry_logs        JSONB NOT NULL DEFAULT '[]',
  saved_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe to re-run against an existing database (e.g. after this migration).
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS entry_logs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE history ADD COLUMN IF NOT EXISTS entry_logs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS ok3 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS repair3 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS ng3 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS ok4 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS repair4 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS ng4 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE history ADD COLUMN IF NOT EXISTS ok3 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE history ADD COLUMN IF NOT EXISTS repair3 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE history ADD COLUMN IF NOT EXISTS ng3 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE history ADD COLUMN IF NOT EXISTS ok4 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE history ADD COLUMN IF NOT EXISTS repair4 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE history ADD COLUMN IF NOT EXISTS ng4 INTEGER NOT NULL DEFAULT 0;

-- Per-group breakdown maps for Camshaft + Crankshaft (the dashboard B/C vs
-- Camshaft/Crankshaft toggle). Block Cylinder keeps the original
-- defect_data / repair_data / hourly_data columns.
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS defect_data_shaft JSONB NOT NULL DEFAULT '{}';
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS repair_data_shaft JSONB NOT NULL DEFAULT '{}';
ALTER TABLE production_state ADD COLUMN IF NOT EXISTS hourly_data_shaft JSONB NOT NULL DEFAULT '{}';
ALTER TABLE history ADD COLUMN IF NOT EXISTS defect_data_shaft JSONB NOT NULL DEFAULT '{}';
ALTER TABLE history ADD COLUMN IF NOT EXISTS repair_data_shaft JSONB NOT NULL DEFAULT '{}';
ALTER TABLE history ADD COLUMN IF NOT EXISTS hourly_data_shaft JSONB NOT NULL DEFAULT '{}';

INSERT INTO production_state (id, saved_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;
