const { getDb } = require('../database');

const ContactModel = {
  bulkInsert(contacts) {
    const db = getDb();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO contacts (phone, name, source)
      VALUES (?, ?, ?)
    `);
    let inserted = 0;
    db.exec('BEGIN');
    try {
      for (const row of contacts) {
        const res = insert.run(row.phone, row.name, row.source);
        if (res.changes) inserted++;
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    return inserted;
  },

  findAll({ page = 1, limit = 50, search = '' } = {}) {
    const db = getDb();
    const offset = (page - 1) * limit;
    const pattern = `%${search}%`;
    const rows = db.prepare(`
      SELECT * FROM contacts
      WHERE (phone LIKE ? OR name LIKE ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(pattern, pattern, limit, offset);
    const total = db.prepare(`
      SELECT COUNT(*) as total FROM contacts
      WHERE (phone LIKE ? OR name LIKE ?)
    `).get(pattern, pattern).total;
    return { rows, total, page, limit };
  },

  findById(id) {
    return getDb().prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  },

  deleteById(id) {
    return getDb().prepare('DELETE FROM contacts WHERE id = ?').run(id);
  },

  deleteAll() {
    return getDb().prepare('DELETE FROM contacts').run();
  },

  count() {
    return getDb().prepare('SELECT COUNT(*) as count FROM contacts').get().count;
  },
};

module.exports = ContactModel;
