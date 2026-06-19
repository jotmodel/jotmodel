-- Migration 0001 — flat projects + board thumbnails.
-- Run ONCE per existing database (ALTER TABLE ADD COLUMN is not idempotent — a second run errors
-- with "duplicate column name", which is the expected signal that it has already been applied).
-- Fresh databases get all of this from schema.sql instead; nothing to run there.
--
--   Local:  npm run db:migrate:local
--   Remote: npm run db:migrate:remote   (production D1 — coordinate with the manual worker deploy)

-- projects table first, so the boards FK below resolves.
CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL DEFAULT 'untitled project',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- A board belongs to at most one project; deleting a project un-files its boards (NULL = ungrouped).
ALTER TABLE boards ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
-- Compact model summary (entities + relationship endpoints) the Home screen renders as a thumbnail.
ALTER TABLE boards ADD COLUMN summary_json TEXT;

CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
