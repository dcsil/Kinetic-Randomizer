import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data.sqlite");

const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  members TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS presentation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  order_json TEXT NOT NULL DEFAULT '[]',
  current_index INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO presentation_state (id, order_json, current_index)
  VALUES (1, '[]', 0);
`);

export function mapGroup(row) {
  return {
    id: row.id,
    name: row.name,
    members: row.members,
    ready: Boolean(row.ready),
  };
}

export default db;
