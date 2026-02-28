const ContactModel = require('../db/models/contact.model');
const { parseExcel } = require('../utils/excel-parser');
const { normalizeList } = require('../utils/phone-normalizer');
const fs = require('fs');

const ContactService = {
  async importFromExcel(filePath, source = 'excel') {
    try {
      const raw = parseExcel(filePath);
      const rawPhones = raw.map((r) => r.phone);
      const nameMap = {};
      raw.forEach((r) => { if (r.name) nameMap[r.phone] = r.name; });

      const { valid, invalid } = normalizeList(rawPhones);

      const contacts = valid.map((phone) => ({
        phone,
        name: nameMap[phone] || null,
        source,
      }));

      const inserted = ContactModel.bulkInsert(contacts);
      const duplicates = valid.length - inserted;

      return {
        total: raw.length,
        imported: inserted,
        duplicates,
        invalid: invalid.length,
        invalidList: invalid.slice(0, 20),
      };
    } finally {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  },

  getAll(opts) {
    return ContactModel.findAll(opts);
  },

  deleteById(id) {
    return ContactModel.deleteById(id);
  },

  deleteAll() {
    return ContactModel.deleteAll();
  },

  count() {
    return ContactModel.count();
  },
};

module.exports = ContactService;
