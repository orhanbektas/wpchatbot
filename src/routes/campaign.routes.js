const router = require('express').Router();
const CampaignService = require('../services/campaign.service');
const { asyncWrap } = require('../middleware/error-handler');
const { requireFields } = require('../middleware/request-validator');
const { normalize } = require('../utils/phone-normalizer');

router.get('/', asyncWrap(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = CampaignService.getAll({ page: +page, limit: +limit });
  res.json({ success: true, ...result });
}));

router.get('/:id', asyncWrap(async (req, res) => {
  const campaign = CampaignService.getById(req.params.id);
  res.json({ success: true, campaign });
}));

router.get('/:id/messages', asyncWrap(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const result = CampaignService.getMessages(req.params.id, { page: +page, limit: +limit });
  res.json({ success: true, ...result });
}));

// Create campaign (returns draft, not yet started)
router.post('/',
  requireFields('name', 'type', 'message_text'),
  asyncWrap(async (req, res) => {
    const campaign = CampaignService.create(req.body);
    res.status(201).json({ success: true, campaign });
  })
);

// Start bulk campaign: sends to all contacts or provided phone list
router.post('/:id/start', asyncWrap(async (req, res) => {
  const { phones } = req.body; // optional array of raw phones

  let campaign;
  if (phones && phones.length) {
    const normalized = phones
      .map((p) => normalize(p))
      .filter(Boolean);
    if (!normalized.length) throw new Error('No valid phone numbers');
    campaign = CampaignService.startBulk(req.params.id, normalized);
  } else {
    campaign = CampaignService.startBulkAllContacts(req.params.id);
  }
  res.json({ success: true, campaign });
}));

router.post('/:id/pause', asyncWrap(async (req, res) => {
  const campaign = CampaignService.pause(req.params.id);
  res.json({ success: true, campaign });
}));

router.post('/:id/resume', asyncWrap(async (req, res) => {
  const campaign = CampaignService.resume(req.params.id);
  res.json({ success: true, campaign });
}));

router.delete('/:id', asyncWrap(async (req, res) => {
  CampaignService.delete(req.params.id);
  res.json({ success: true });
}));

module.exports = router;
