const { getDb } = require('./database');

function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT,
      source TEXT,
      is_valid INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('single','bulk','scheduled')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','running','paused','done','failed')),
      message_text TEXT,
      media_path TEXT,
      scheduled_at TEXT,
      min_delay INTEGER DEFAULT 30000,
      max_delay INTEGER DEFAULT 60000,
      daily_limit INTEGER DEFAULT 50,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      contact_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','sent','failed','retry')),
      attempt_count INTEGER DEFAULT 0,
      last_error TEXT,
      queued_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      context TEXT,
      message TEXT NOT NULL,
      meta TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings VALUES ('warmup_day', '1');
    INSERT OR IGNORE INTO settings VALUES ('warmup_enabled', 'true');
    INSERT OR IGNORE INTO settings VALUES ('daily_limit', '50');
    INSERT OR IGNORE INTO settings VALUES ('min_delay', '30000');
    INSERT OR IGNORE INTO settings VALUES ('max_delay', '60000');
  `);
}

module.exports = { runMigrations };
