const router = require('express').Router();
const waClient = require('../core/whatsapp-client');
const { asyncWrap } = require('../middleware/error-handler');

router.get('/status', (req, res) => {
  res.json({ success: true, state: waClient.getState() });
});

router.post('/connect', asyncWrap(async (req, res) => {
  await waClient.forceRestart();
  res.json({ success: true, message: 'Initializing...', state: waClient.getState() });
}));

router.post('/disconnect', asyncWrap(async (req, res) => {
  await waClient.logout();
  res.json({ success: true, message: 'Logged out' });
}));

router.post('/restart', asyncWrap(async (req, res) => {
  await waClient.forceRestart();
  res.json({ success: true, message: 'Restarting...' });
}));

module.exports = router;
