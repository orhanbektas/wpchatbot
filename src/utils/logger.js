const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');

if (!fs.existsSync(config.logPath)) {
  fs.mkdirSync(config.logPath, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          const ctx = context ? `[${context}] ` : '';
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level} ${ctx}${message}${extra}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(config.logPath, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(config.logPath, 'app.log'),
    }),
  ],
});

// DB transport — lazy require to avoid circular
logger.logToDb = function (level, context, message, meta) {
  try {
    const LogModel = require('../db/models/log.model');
    LogModel.insert(level, context, message, meta);
  } catch (_) {}
};

const createContextLogger = (context) => ({
  info: (msg, meta) => { logger.info(msg, { context, ...meta }); logger.logToDb('info', context, msg, meta); },
  warn: (msg, meta) => { logger.warn(msg, { context, ...meta }); logger.logToDb('warn', context, msg, meta); },
  error: (msg, meta) => { logger.error(msg, { context, ...meta }); logger.logToDb('error', context, msg, meta); },
  debug: (msg, meta) => { logger.debug(msg, { context, ...meta }); },
});

module.exports = { logger, createContextLogger };
