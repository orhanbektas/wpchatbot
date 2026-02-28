const XLSX = require('xlsx');

/**
 * Parse an Excel/CSV file and extract phone numbers (and optional names).
 * Attempts to auto-detect which column contains phones.
 * Returns array of { phone: string, name: string|null }
 */
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) return [];

  const keys = Object.keys(rows[0]);

  // Detect phone column
  const phoneKey = keys.find((k) =>
    /phone|telefon|gsm|numara|mobile|cel|tel/i.test(k)
  ) || keys[0];

  // Detect name column
  const nameKey = keys.find((k) =>
    /name|isim|ad|adsoy|firstname|fullname/i.test(k)
  ) || null;

  return rows
    .map((row) => ({
      phone: String(row[phoneKey] || '').trim(),
      name: nameKey ? String(row[nameKey] || '').trim() || null : null,
    }))
    .filter((r) => r.phone);
}

module.exports = { parseExcel };
