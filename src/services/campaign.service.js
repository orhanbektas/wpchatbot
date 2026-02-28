const CampaignModel = require('../db/models/campaign.model');
const MessageModel = require('../db/models/message.model');
const ContactModel = require('../db/models/contact.model');
const { getDb } = require('../db/database');
const config = require('../../config/config');

const CampaignService = {
  create(data) {
    const campaign = CampaignModel.create({
      name: data.name,
      type: data.type,
      status: data.type === 'scheduled' ? 'draft' : 'draft',
      message_text: data.message_text,
      media_path: data.media_path || null,
      scheduled_at: data.scheduled_at || null,
      min_delay: data.min_delay || config.defaultMinDelay,
      max_delay: data.max_delay || config.defaultMaxDelay,
      daily_limit: data.daily_limit || config.defaultDailyLimit,
    });
    return campaign;
  },

  /**
   * Start a bulk or single campaign immediately.
   * Queues all contact messages.
   */
  startBulk(campaignId, phones) {
    const campaign = CampaignModel.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status === 'running') throw new Error('Campaign already running');

    MessageModel.bulkInsert(campaignId, phones);
    CampaignModel.updateStatus(campaignId, 'running');
    return CampaignModel.findById(campaignId);
  },

  /**
   * Start with all contacts in DB
   */
  startBulkAllContacts(campaignId) {
    const phones = getDb().prepare('SELECT phone FROM contacts WHERE is_valid = 1').all().map((r) => r.phone);
    if (!phones.length) throw new Error('No contacts available');
    return this.startBulk(campaignId, phones);
  },

  pause(campaignId) {
    CampaignModel.updateStatus(campaignId, 'paused');
    return CampaignModel.findById(campaignId);
  },

  resume(campaignId) {
    CampaignModel.updateStatus(campaignId, 'running');
    return CampaignModel.findById(campaignId);
  },

  getAll(opts) {
    return CampaignModel.findAll(opts);
  },

  getById(id) {
    const campaign = CampaignModel.findById(id);
    if (!campaign) throw new Error('Campaign not found');
    return campaign;
  },

  getMessages(campaignId, opts) {
    return MessageModel.getByCampaign(campaignId, opts);
  },

  delete(campaignId) {
    CampaignModel.deleteById(campaignId);
  },
};

module.exports = CampaignService;
