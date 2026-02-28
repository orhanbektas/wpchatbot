const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const config = require('../../config/config');
const { createContextLogger } = require('../utils/logger');

const log = createContextLogger('whatsapp');

const STATE = {
  DISCONNECTED: 'DISCONNECTED',
  INITIALIZING: 'INITIALIZING',
  QR_PENDING: 'QR_PENDING',
  AUTHENTICATED: 'AUTHENTICATED',
  READY: 'READY',
  FAILED: 'FAILED',
};

let client = null;
let currentState = STATE.DISCONNECTED;
let io = null; // socket.io instance, injected at startup
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;
const RECONNECT_BASE_DELAY = 5000;

function setState(s) {
  currentState = s;
  log.info(`State → ${s}`);
  emit('wa:state', { state: s });
}

function emit(event, data) {
  if (io) io.emit(event, data);
}

function setIo(ioInstance) {
  io = ioInstance;
}

function getState() {
  return currentState;
}

function getClient() {
  if (currentState !== STATE.READY || !client) {
    throw new Error('WhatsApp client not ready');
  }
  return client;
}

async function initialize() {
  if ([STATE.INITIALIZING, STATE.QR_PENDING, STATE.AUTHENTICATED, STATE.READY].includes(currentState)) {
    log.warn('Initialize called but client already active');
    return;
  }

  setState(STATE.INITIALIZING);

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.resolve(config.waSessionPath),
    }),
    puppeteer: {
      headless: true,
      executablePath: config.chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
      ],
    },
  });

  client.on('qr', async (qr) => {
    setState(STATE.QR_PENDING);
    emit('wa:qr', { qr });
    log.info('QR code generated');
  });

  client.on('authenticated', () => {
    setState(STATE.AUTHENTICATED);
    reconnectAttempts = 0;
  });

  client.on('ready', () => {
    setState(STATE.READY);
    reconnectAttempts = 0;
    log.info('WhatsApp client ready');
    emit('wa:ready', {});
  });

  client.on('auth_failure', (msg) => {
    log.error('Auth failure', { msg });
    setState(STATE.FAILED);
    emit('wa:auth_failure', { msg });
  });

  client.on('disconnected', async (reason) => {
    log.warn('Disconnected', { reason });
    setState(STATE.DISCONNECTED);
    emit('wa:disconnected', { reason });
    await scheduleReconnect();
  });

  try {
    await client.initialize();
  } catch (err) {
    log.error('Client initialize threw', { error: err.message });
    setState(STATE.FAILED);
    await scheduleReconnect();
  }
}

async function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    log.error('Max reconnect attempts reached. Manual restart required.');
    setState(STATE.FAILED);
    return;
  }
  reconnectAttempts++;
  const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1);
  log.info(`Reconnect attempt ${reconnectAttempts} in ${delay}ms`);
  setTimeout(async () => {
    try {
      await destroy();
      await initialize();
    } catch (err) {
      log.error('Reconnect failed', { error: err.message });
    }
  }, delay);
}

async function destroy() {
  if (client) {
    try {
      await client.destroy();
    } catch (_) {}
    client = null;
  }
  currentState = STATE.DISCONNECTED;
}

async function logout() {
  if (client) {
    try {
      await client.logout();
    } catch (_) {}
    await destroy();
  }
}

/**
 * Send a message with typing simulation.
 * @param {string} phone - E.164 format
 * @param {string} text
 * @param {string|null} mediaPath - absolute path
 */
async function sendMessage(phone, text, mediaPath = null) {
  const wClient = getClient();
  // WhatsApp chatId format: 905551234567@c.us
  const chatId = phone.replace('+', '') + '@c.us';

  // Typing simulation
  try {
    const chat = await wClient.getChatById(chatId);
    await chat.sendSeen();
    await wClient.sendPresenceAvailable();
  } catch (_) {}

  try {
    await wClient.sendMessage(chatId, '');
  } catch (_) {}

  // Simulate typing delay
  const { typingDelay } = require('../utils/delay');
  await typingDelay(text);

  if (mediaPath) {
    const media = MessageMedia.fromFilePath(mediaPath);
    await wClient.sendMessage(chatId, media, { caption: text });
  } else {
    await wClient.sendMessage(chatId, text);
  }
}

module.exports = {
  initialize,
  destroy,
  logout,
  getClient,
  getState,
  setIo,
  STATE,
  sendMessage,
  forceRestart: async () => {
    reconnectAttempts = 0;
    await destroy();
    await initialize();
  },
};
