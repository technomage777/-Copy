const { isAuthorized } = require('./_auth');

function numberInRange(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
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

  const body = req.body || {};
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  const referenceUrl = typeof body.reference_url === 'string' ? body.reference_url : '';

  if (!input) return res.status(400).json({ error: 'Narration text is required.' });
  if (input.length > 4096) return res.status(400).json({ error: 'Narration is limited to 4096 characters in this app.' });

  let parsed;
  try { parsed = new URL(referenceUrl); } catch (_) {}
  if (!parsed || parsed.protocol !== 'https:' || parsed.hostname !== 'api.replicate.com' || !parsed.pathname.startsWith('/v1/files/')) {
    return res.status(400).json({ error: 'Upload a valid Chatterbox reference voice first.' });
  }

  const modelInput = {
    prompt: input,
    audio_prompt: referenceUrl,
    exaggeration: numberInRange(body.exaggeration, 0.25, 2, 0.5),
    cfg_weight: numberInRange(body.cfg_weight, 0.2, 1, 0.4),
    temperature: numberInRange(body.temperature, 0.05, 5, 0.8),
    seed: Math.max(0, Math.floor(Number(body.seed) || 0))
  };

  try {
    const upstream = await fetch('https://api.replicate.com/v1/models/resemble-ai/chatterbox/predictions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.REPLICATE_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: modelInput })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data.detail || (data.error && data.error.message) || data.error || 'Replicate could not start Chatterbox.';
      return res.status(upstream.status).json({ error: typeof message === 'string' ? message : JSON.stringify(message) });
    }

    return res.status(200).json({ id: data.id, status: data.status || 'starting' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error while starting Chatterbox.' });
  }
};
