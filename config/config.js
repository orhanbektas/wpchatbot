require('dotenv').config();

const waSessionPath = process.env.WA_SESSION_PATH || './.wwebjs_auth';

// Chrome otomatik tespit
function detectChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const fs = require('fs');
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

module.exports = {
  port: parseInt(process.env.PORT) || 3000,
  waSessionPath,
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  logPath: process.env.LOG_PATH || './logs',
  dbPath: process.env.DB_PATH || './data/app.db',
  chromePath: detectChrome(),

  defaultMinDelay: parseInt(process.env.DEFAULT_MIN_DELAY) || 30000,
  defaultMaxDelay: parseInt(process.env.DEFAULT_MAX_DELAY) || 60000,
  defaultDailyLimit: parseInt(process.env.DEFAULT_DAILY_LIMIT) || 50,
  warmupEnabled: process.env.WARMUP_ENABLED === 'true',

  maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3,
  retryDelays: (process.env.RETRY_DELAYS || '30000,120000,600000')
    .split(',').map(Number),
};
