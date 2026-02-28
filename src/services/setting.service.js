const SettingModel = require('../db/models/setting.model');

const ALLOWED_KEYS = ['warmup_enabled', 'warmup_day', 'daily_limit', 'min_delay', 'max_delay'];

const SettingService = {
  getAll() {
    return SettingModel.getAll();
  },

  update(key, value) {
    if (!ALLOWED_KEYS.includes(key)) throw new Error(`Unknown setting key: ${key}`);
    SettingModel.set(key, value);
    return { key, value };
  },

  updateMany(obj) {
    const results = [];
    for (const [key, value] of Object.entries(obj)) {
      if (ALLOWED_KEYS.includes(key)) {
        SettingModel.set(key, value);
        results.push({ key, value });
      }
    }
    return results;
  },
};

module.exports = SettingService;
