const cron = require('node-cron');
const CampaignModel = require('../db/models/campaign.model');
const MessageModel = require('../db/models/message.model');
const ContactModel = require('../db/models/contact.model');
const { getDb } = require('../db/database');
const antiBan = require('./anti-ban');
const { createContextLogger } = require('../utils/logger');

const log = createContextLogger('scheduler');

function start() {
  // Every minute: check due scheduled campaigns
  cron.schedule('* * * * *', checkScheduledCampaigns);

  // Midnight: advance warmup day
  cron.schedule('0 0 * * *', () => {
    antiBan.advanceWarmupDay();
  });

  log.info('Scheduler started');
}

function checkScheduledCampaigns() {
  try {
    const dueCampaigns = CampaignModel.findDueScheduled();
    for (const campaign of dueCampaigns) {
      activateCampaign(campaign);
    }
  } catch (err) {
    log.error('Scheduler error', { error: err.message });
  }
}

function activateCampaign(campaign) {
  try {
    // Get all valid contacts
    const db = getDb();
    let phones;

    if (campaign.contact_filter) {
      // future: filter by tag/group
      phones = db.prepare('SELECT phone FROM contacts WHERE is_valid = 1').all().map((r) => r.phone);
    } else {
      phones = db.prepare('SELECT phone FROM contacts WHERE is_valid = 1').all().map((r) => r.phone);
    }

    if (!phones.length) {
      log.warn(`Campaign ${campaign.id} has no contacts, marking failed`);
      CampaignModel.updateStatus(campaign.id, 'failed');
      return;
    }

    MessageModel.bulkInsert(campaign.id, phones);
    CampaignModel.updateStatus(campaign.id, 'running');
    log.info(`Campaign ${campaign.id} activated with ${phones.length} messages`);
  } catch (err) {
    log.error(`Failed to activate campaign ${campaign.id}`, { error: err.message });
    CampaignModel.updateStatus(campaign.id, 'failed');
  }
}

module.exports = { start, activateCampaign };
