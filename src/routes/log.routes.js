const router = require('express').Router();
const LogModel = require('../db/models/log.model');
const { asyncWrap } = require('../middleware/error-handler');

router.get('/', asyncWrap(async (req, res) => {
  const { page = 1, limit = 100, level = '', context = '' } = req.query;
  const result = LogModel.findAll({ page: +page, limit: +limit, level, context });
  res.json({ success: true, ...result });
}));

router.delete('/', asyncWrap(async (req, res) => {
  LogModel.clear();
  res.json({ success: true });
}));

module.exports = router;
