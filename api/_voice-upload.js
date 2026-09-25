const { isAuthorized } = require('./_auth');

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/aac',
  'audio/flac','audio/webm','video/mp4','audio/mp4','audio/m4a','audio/x-m4a','application/octet-stream'
]);

function decodeHeader(value, fallback = '') {
  if (!value) return fallback;
  try { return decodeURIComponent(String(value)); } catch (_) { return String(value); }
}

function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  return null;
}

function validateRequest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Use POST.' });
    return null;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Please log in first.' });
    return null;
  }
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OPENAI_API_KEY is not configured in Vercel.' });
    return null;
  }

  const bytes = rawBody(req);
  if (!bytes || !bytes.length) {
    res.status(400).json({ error: 'Audio file is required.' });
    return null;
  }
  if (bytes.length > MAX_BYTES) {
    res.status(413).json({ error: 'Audio file must be under 4 MB for this Vercel app.' });
    return null;
  }

  const type = decodeHeader(req.headers['x-file-type'], 'application/octet-stream').split(';')[0].trim();
  if (!ALLOWED_TYPES.has(type)) {
    res.status(400).json({ error: 'Unsupported audio file type.' });
    return null;
  }

  const filename = decodeHeader(req.headers['x-file-name'], 'audio');
  return { bytes, type, filename };
}

module.exports = { validateRequest, decodeHeader };
