const waClient = require('../core/whatsapp-client');

function clientGuard(req, res, next) {
  if (waClient.getState() !== waClient.STATE.READY) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp client not ready',
      state: waClient.getState(),
    });
  }
  next();
}

module.exports = { clientGuard };
