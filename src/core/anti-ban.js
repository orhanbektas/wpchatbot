const SettingModel = require('../db/models/setting.model');
const MessageModel = require('../db/models/message.model');
const { createContextLogger } = require('../utils/logger');

const log = createContextLogger('anti-ban');

// Warmup schedule: day → max daily messages
const WARMUP_SCHEDULE = {
  1: 15, 2: 20, 3: 25,
  4: 35, 5: 45, 6: 55, 7: 65,
  8: 80, 9: 95, 10: 110,
  11: 130, 12: 150, 13: 175, 14: 200,
};

function getWarmupLimit(day) {
  const d = Math.min(Math.max(parseInt(day) || 1, 1), 14);
  return WARMUP_SCHEDULE[d] || 200;
}

function getDailyLimit() {
  const warmupEnabled = SettingModel.get('warmup_enabled') === 'true';
  if (warmupEnabled) {
    const day = parseInt(SettingModel.get('warmup_day') || '1');
    return getWarmupLimit(day);
  }
  return parseInt(SettingModel.get('daily_limit') || '50');
}

function canSend() {
  const sentToday = MessageModel.countSentToday();
  const limit = getDailyLimit();
  if (sentToday >= limit) {
    log.warn(`Daily limit reached: ${sentToday}/${limit}`);
    return false;
  }
  return true;
}

function getDelayMs(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function getDailyStats() {
  const sentToday = MessageModel.countSentToday();
  const limit = getDailyLimit();
  const warmupDay = parseInt(SettingModel.get('warmup_day') || '1');
  return { sentToday, limit, warmupDay, remaining: Math.max(0, limit - sentToday) };
}

/**
 * Advance warmup day — call once per midnight (scheduler).
 */
function advanceWarmupDay() {
  const current = parseInt(SettingModel.get('warmup_day') || '1');
  const next = Math.min(current + 1, 14);
  SettingModel.set('warmup_day', next);
  log.info(`Warmup day advanced: ${current} → ${next}, new limit: ${getWarmupLimit(next)}`);
}

module.exports = { canSend, getDelayMs, getDailyStats, getDailyLimit, advanceWarmupDay };
