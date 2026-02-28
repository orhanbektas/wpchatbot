const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');

/**
 * Normalize a raw phone string to E.164 format.
 * Default country hint: TR (Turkey)
 * Returns null if invalid.
 */
function normalize(raw, defaultCountry = 'TR') {
  if (!raw) return null;
  try {
    let cleaned = String(raw).replace(/\s+/g, '').replace(/[^\d+]/g, '');

    // Handle Turkish local format: 05xx → +905xx
    if (/^05\d{9}$/.test(cleaned)) {
      cleaned = '+9' + cleaned;
    }
    // 5xxxxxxxxx (10 digit starting with 5)
    if (/^5\d{9}$/.test(cleaned)) {
      cleaned = '+90' + cleaned;
    }

    const phone = parsePhoneNumber(cleaned, defaultCountry);
    if (phone && phone.isValid()) {
      return phone.format('E.164');
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Normalize an array of raw numbers.
 * Returns { valid: string[], invalid: string[] }
 */
function normalizeList(rawList, defaultCountry = 'TR') {
  const valid = [];
  const invalid = [];
  const seen = new Set();

  for (const raw of rawList) {
    const e164 = normalize(raw, defaultCountry);
    if (!e164) {
      invalid.push(String(raw));
    } else if (seen.has(e164)) {
      // duplicate
    } else {
      seen.add(e164);
      valid.push(e164);
    }
  }
  return { valid, invalid };
}

module.exports = { normalize, normalizeList };
