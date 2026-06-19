-- JotModel D1 schema. The CRDT holds the drawing; D1 holds metadata + permissions.
-- This file is the canonical FRESH-INSTALL state and is safe to re-run (CREATE … IF NOT EXISTS).
-- Apply locally:  wrangler d1 execute jotmodel --local --file worker/db/schema.sql
-- Apply remote:   wrangler d1 execute jotmodel        --file worker/db/schema.sql
--
-- Incremental changes to an EXISTING database live in worker/db/migrations/ and are run once
-- (ALTER TABLE is not idempotent). Re-running this file after a migration is a no-op.

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,          -- Clerk user id (sub)
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- A board belongs to at most one project (project_id NULL = ungrouped / "All boards").
CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL DEFAULT 'untitled project',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

CREATE TABLE IF NOT EXISTS boards (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL DEFAULT 'untitled board',
  updated_at   INTEGER NOT NULL,
  snapshot_ref TEXT,                                  -- R2 key of the latest CRDT snapshot
  project_id   TEXT REFERENCES projects(id) ON DELETE SET NULL,  -- NULL = ungrouped
  summary_json TEXT                                   -- compact model summary for the Home thumbnail
);
CREATE INDEX IF NOT EXISTS idx_boards_owner   ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);

CREATE TABLE IF NOT EXISTS members (
  board_id  TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id),
  role      TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
  PRIMARY KEY (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS share_links (
  token      TEXT PRIMARY KEY,           -- opaque capability; possession grants the role
  board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('editor','viewer')),
  expires_at INTEGER                     -- epoch ms, or NULL for no expiry
);
CREATE INDEX IF NOT EXISTS idx_share_board ON share_links(board_id);
