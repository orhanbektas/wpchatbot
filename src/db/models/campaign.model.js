const { getDb } = require('../database');

const CampaignModel = {
  create(data) {
    const db = getDb();
    const res = db.prepare(`
      INSERT INTO campaigns (name, type, status, message_text, media_path, scheduled_at, min_delay, max_delay, daily_limit)
      VALUES (@name, @type, @status, @message_text, @media_path, @scheduled_at, @min_delay, @max_delay, @daily_limit)
    `).run(data);
    return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(res.lastInsertRowid);
  },

  findAll({ page = 1, limit = 20 } = {}) {
    const db = getDb();
    const offset = (page - 1) * limit;
    const rows = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id) as total_messages,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id AND m.status = 'sent') as sent_count,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id AND m.status = 'failed') as failed_count,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id AND m.status IN ('queued','retry')) as pending_count
      FROM campaigns c
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    const { total } = db.prepare('SELECT COUNT(*) as total FROM campaigns').get();
    return { rows, total, page, limit };
  },

  findById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id) as total_messages,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id AND m.status = 'sent') as sent_count,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id AND m.status = 'failed') as failed_count,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id AND m.status IN ('queued','retry')) as pending_count
      FROM campaigns c WHERE c.id = ?
    `).get(id);
  },

  updateStatus(id, status) {
    return getDb().prepare(`
      UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, id);
  },

  findDueScheduled() {
    return getDb().prepare(`
      SELECT * FROM campaigns
      WHERE type = 'scheduled' AND status = 'draft'
      AND scheduled_at <= datetime('now')
    `).all();
  },

  deleteById(id) {
    return getDb().prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  },
};

module.exports = CampaignModel;
