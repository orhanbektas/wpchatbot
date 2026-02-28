const CampaignModel = require('../db/models/campaign.model');
const MessageModel = require('../db/models/message.model');
const { normalize } = require('../utils/phone-normalizer');
const config = require('../../config/config');

const MessageService = {
  /**
   * Queue a single message. Creates a one-off campaign + message.
   */
  sendSingle({ phone, text, mediaPath = null, minDelay, maxDelay }) {
    const e164 = normalize(phone);
    if (!e164) throw new Error(`Invalid phone number: ${phone}`);

    const campaign = CampaignModel.create({
      name: `Single → ${e164}`,
      type: 'single',
      status: 'draft',
      message_text: text,
      media_path: mediaPath || null,
      scheduled_at: null,
      min_delay: minDelay || config.defaultMinDelay,
      max_delay: maxDelay || config.defaultMaxDelay,
      daily_limit: 1,
    });

    const msgId = MessageModel.insertSingle(campaign.id, e164);
    CampaignModel.updateStatus(campaign.id, 'running');

    return { campaignId: campaign.id, messageId: msgId, phone: e164 };
  },

  stats() {
    return MessageModel.stats();
  },

  getRecent(limit = 10) {
    return MessageModel.getRecent(limit);
  },
};

module.exports = MessageService;
