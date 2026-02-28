const { getDb } = require('../database');

const LogModel = {
  insert(level, context, message, meta = null) {
    try {
      getDb().prepare(`
        INSERT INTO logs (level, context, message, meta)
        VALUES (?, ?, ?, ?)
      `).run(level, context, message, meta ? JSON.stringify(meta) : null);
    } catch (_) {}
  },

  findAll({ page = 1, limit = 100, level = '', context = '' } = {}) {
    const db = getDb();
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (level) { where += ' AND level = ?'; params.push(level); }
    if (context) { where += ' AND context = ?'; params.push(context); }

    const rows = db.prepare(`
      SELECT * FROM logs ${where}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const { total } = db.prepare(`SELECT COUNT(*) as total FROM logs ${where}`).get(...params);
    return { rows, total, page, limit };
  },

  clear() {
    return getDb().prepare('DELETE FROM logs').run();
  },
};

module.exports = LogModel;
