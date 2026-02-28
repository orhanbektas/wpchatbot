const router = require('express').Router();
const SettingService = require('../services/setting.service');
const antiBan = require('../core/anti-ban');
const { asyncWrap } = require('../middleware/error-handler');

router.get('/', (req, res) => {
  const settings = SettingService.getAll();
  const dailyStats = antiBan.getDailyStats();
  res.json({ success: true, settings, dailyStats });
});

router.put('/', asyncWrap(async (req, res) => {
  const results = SettingService.updateMany(req.body);
  res.json({ success: true, updated: results });
}));

module.exports = router;
