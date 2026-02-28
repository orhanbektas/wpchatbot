const { getDb } = require('../database');

const MessageModel = {
  bulkInsert(campaignId, phones) {
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO messages (campaign_id, contact_phone, status)
      VALUES (?, ?, 'queued')
    `);
    db.exec('BEGIN');
    try {
      for (const phone of phones) insert.run(campaignId, phone);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  },

  insertSingle(campaignId, phone) {
    const db = getDb();
    const res = db.prepare(`
      INSERT INTO messages (campaign_id, contact_phone, status)
      VALUES (?, ?, 'queued')
    `).run(campaignId, phone);
    return res.lastInsertRowid;
  },

  getNextQueued() {
    return getDb().prepare(`
      SELECT m.*, c.message_text, c.media_path, c.min_delay, c.max_delay, c.daily_limit
      FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE m.status IN ('queued', 'retry')
      AND c.status IN ('running')
      ORDER BY m.queued_at ASC
      LIMIT 1
    `).get();
  },

  updateStatus(id, status, error = null) {
    const db = getDb();
    if (status === 'sent') {
      db.prepare(`
        UPDATE messages SET status = ?, sent_at = datetime('now'), last_error = NULL WHERE id = ?
      `).run(status, id);
    } else {
      db.prepare(`
        UPDATE messages SET status = ?, last_error = ?, attempt_count = attempt_count + 1 WHERE id = ?
      `).run(status, error, id);
    }
  },

  countSentToday() {
    return getDb().prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE status = 'sent' AND date(sent_at) = date('now')
    `).get().count;
  },

  getByCampaign(campaignId, { page = 1, limit = 50 } = {}) {
    const db = getDb();
    const offset = (page - 1) * limit;
    const rows = db.prepare(`
      SELECT * FROM messages WHERE campaign_id = ?
      ORDER BY queued_at DESC LIMIT ? OFFSET ?
    `).all(campaignId, limit, offset);
    const { total } = db.prepare('SELECT COUNT(*) as total FROM messages WHERE campaign_id = ?').get(campaignId);
    return { rows, total, page, limit };
  },

  queuedCountByCampaign(campaignId) {
    return getDb().prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE campaign_id = ? AND status IN ('queued','retry')
    `).get(campaignId).count;
  },

  stats() {
    return getDb().prepare(`
      SELECT
        SUM(CASE WHEN status='queued' OR status='retry' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status='sending' THEN 1 ELSE 0 END) as sending,
        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
      FROM messages
    `).get();
  },

  getRecent(limit = 10) {
    return getDb().prepare(`
      SELECT m.id, m.contact_phone, m.status, m.queued_at as created_at,
             c.message_text
      FROM messages m
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE m.status IN ('sent','failed','sending')
      ORDER BY m.id DESC
      LIMIT ?
    `).all(limit);
  },
};

module.exports = MessageModel;
