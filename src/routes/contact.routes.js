const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');
const ContactService = require('../services/contact.service');
const { asyncWrap } = require('../middleware/error-handler');

if (!fs.existsSync(config.uploadPath)) {
  fs.mkdirSync(config.uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: config.uploadPath,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(allowed.includes(ext) ? null : new Error('Only Excel/CSV files allowed'), allowed.includes(ext));
  },
});

router.get('/', asyncWrap(async (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const result = ContactService.getAll({ page: +page, limit: +limit, search });
  res.json({ success: true, ...result });
}));

router.post('/import', upload.single('file'), asyncWrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const result = await ContactService.importFromExcel(req.file.path);
  res.json({ success: true, ...result });
}));

router.delete('/all', asyncWrap(async (req, res) => {
  ContactService.deleteAll();
  res.json({ success: true, message: 'All contacts deleted' });
}));

router.delete('/:id', asyncWrap(async (req, res) => {
  ContactService.deleteById(req.params.id);
  res.json({ success: true });
}));

module.exports = router;
