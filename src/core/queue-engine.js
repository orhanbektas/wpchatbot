const MessageModel = require('../db/models/message.model');
const CampaignModel = require('../db/models/campaign.model');
const waClient = require('./whatsapp-client');
const antiBan = require('./anti-ban');
const config = require('../../config/config');
const { sleep } = require('../utils/delay');
const { createContextLogger } = require('../utils/logger');

const log = createContextLogger('queue');

const SUFFIX_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

function generateSuffix() {
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)];
  }
  return ' - ' + s;
}

let isProcessing = false;
let isRunning = false;
let currentIo = null;
let intervalHandle = null;

const POLL_INTERVAL = 2000;

function setIo(io) {
  currentIo = io;
}

function emit(event, data) {
  if (currentIo) currentIo.emit(event, data);
}

function start() {
  if (isRunning) return;
  isRunning = true;
  log.info('Queue engine started');
  intervalHandle = setInterval(tick, POLL_INTERVAL);
}

function stop() {
  isRunning = false;
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  log.info('Queue engine stopped');
}

async function tick() {
  if (isProcessing) return;
  if (waClient.getState() !== waClient.STATE.READY) return;
  if (!antiBan.canSend()) return;

  const msg = MessageModel.getNextQueued();
  if (!msg) return;

  isProcessing = true;

  try {
    MessageModel.updateStatus(msg.id, 'sending');
    emit('queue:sending', { messageId: msg.id, phone: msg.contact_phone });

    // Random delay BEFORE send (except first message)
    const delayMs = antiBan.getDelayMs(
      msg.min_delay || config.defaultMinDelay,
      msg.max_delay || config.defaultMaxDelay
    );
    log.info(`Waiting ${delayMs}ms before send`, { messageId: msg.id });
    await sleep(delayMs);

    const finalText = msg.message_text + generateSuffix();
    await waClient.sendMessage(msg.contact_phone, finalText, msg.media_path || null);

    MessageModel.updateStatus(msg.id, 'sent');
    log.info(`Sent to ${msg.contact_phone}`, { messageId: msg.id });
    emit('queue:sent', { messageId: msg.id, phone: msg.contact_phone });

    // Check if campaign is done
    await checkCampaignCompletion(msg.campaign_id);

  } catch (err) {
    log.error(`Send failed: ${err.message}`, { messageId: msg.id, phone: msg.contact_phone });

    const newAttempt = (msg.attempt_count || 0) + 1;

    if (isUnrecoverable(err)) {
      MessageModel.updateStatus(msg.id, 'failed', err.message);
      log.warn(`Marked as permanent fail: ${msg.contact_phone}`);
    } else if (newAttempt >= config.maxRetryAttempts) {
      MessageModel.updateStatus(msg.id, 'failed', `Max retries reached: ${err.message}`);
    } else {
      MessageModel.updateStatus(msg.id, 'retry', err.message);
      // Will be picked up again by getNextQueued (status=retry is included)
      const retryDelay = config.retryDelays[newAttempt - 1] || 60000;
      log.info(`Will retry ${msg.contact_phone} in ${retryDelay}ms`);
    }

    // If session lost, stop queue
    if (isSessionError(err)) {
      log.error('Session error detected, stopping queue');
      stop();
    }
  } finally {
    isProcessing = false;
    emit('queue:stats', MessageModel.stats());
  }
}

function isUnrecoverable(err) {
  const msg = err.message || '';
  return (
    msg.includes('not registered') ||
    msg.includes('invalid number') ||
    msg.includes('Evaluation failed')
  );
}

function isSessionError(err) {
  const msg = err.message || '';
  return (
    msg.includes('Session closed') ||
    msg.includes('Target closed') ||
    msg.includes('not ready')
  );
}

async function checkCampaignCompletion(campaignId) {
  const pending = MessageModel.queuedCountByCampaign(campaignId);
  if (pending === 0) {
    const campaign = CampaignModel.findById(campaignId);
    if (campaign && campaign.status === 'running') {
      CampaignModel.updateStatus(campaignId, 'done');
      log.info(`Campaign ${campaignId} completed`);
      emit('campaign:done', { campaignId });
    }
  }
}

module.exports = { start, stop, setIo };
