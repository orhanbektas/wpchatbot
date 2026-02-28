const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');
const MessageService = require('../services/message.service');
const { asyncWrap } = require('../middleware/error-handler');

if (!fs.existsSync(config.uploadPath)) {
  fs.mkdirSync(config.uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: config.uploadPath,
  filename: (req, file, cb) => cb(null, `media-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/single', upload.single('media'), asyncWrap(async (req, res) => {
  const { phone, text, minDelay, maxDelay } = req.body;
  if (!phone || !text) return res.status(400).json({ success: false, error: 'Telefon ve mesaj zorunludur' });
  const mediaPath = req.file ? path.resolve(req.file.path) : null;
  const result = MessageService.sendSingle({
    phone, text,
    mediaPath,
    minDelay: parseInt(minDelay) || undefined,
    maxDelay: parseInt(maxDelay) || undefined,
  });
  res.json({ success: true, ...result });
}));

router.get('/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const rows = MessageService.getRecent(limit);
  res.json({ success: true, rows });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: MessageService.stats() });
});

module.exports = router;
