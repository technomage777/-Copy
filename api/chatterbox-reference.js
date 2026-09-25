const { isAuthorized } = require('./_auth');

const MAX_BYTES = 4 * 1024 * 1024;

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

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Please log in first.' });
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN is not configured in Vercel.' });
  }

  const bytes = rawBody(req);
  if (!bytes || !bytes.length) return res.status(400).json({ error: 'Reference audio is required.' });
  if (bytes.length > MAX_BYTES) return res.status(413).json({ error: 'Reference audio must be under 4 MB.' });

  const filename = decodeHeader(req.headers['x-file-name'], 'reference.wav').slice(0, 200);
  const type = decodeHeader(req.headers['x-file-type'], 'application/octet-stream').split(';')[0].trim();

  try {
    const form = new FormData();
    form.append('content', new Blob([bytes], { type }), filename);

    const upstream = await fetch('https://api.replicate.com/v1/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.REPLICATE_API_TOKEN },
      body: form
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data.detail || data.error || 'Replicate rejected the reference audio.';
      return res.status(upstream.status).json({ error: typeof message === 'string' ? message : JSON.stringify(message) });
    }

    return res.status(200).json({
      id: data.id,
      url: data.urls && data.urls.get ? data.urls.get : null,
      expires_at: data.expires_at || null
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error while uploading the Chatterbox reference.' });
  }
};
