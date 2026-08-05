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
  defect_data JSONB NOT NULL DEFAULT '{}',
  repair_data JSONB NOT NULL DEFAULT '{}',
  hourly_data JSONB NOT NULL DEFAULT '{}',
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
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
  defect_data JSONB NOT NULL DEFAULT '{}',
  repair_data JSONB NOT NULL DEFAULT '{}',
  hourly_data JSONB NOT NULL DEFAULT '{}',
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO production_state (id, saved_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;
