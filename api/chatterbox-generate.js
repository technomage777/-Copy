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
  const referenceDataUri = typeof body.reference_data_uri === 'string' ? body.reference_data_uri : '';

  if (!input) return res.status(400).json({ error: 'Narration text is required.' });
  const engine = body.engine === 'chatterbox_turbo' ? 'chatterbox_turbo' : 'chatterbox';
  if (engine === 'chatterbox_turbo' && input.length > 500) {
    return res.status(400).json({ error: 'Chatterbox Turbo allows a maximum of 500 characters per generation.' });
  }
  if (engine === 'chatterbox' && input.length > 4096) {
    return res.status(400).json({ error: 'Narration is limited to 4096 characters in this app.' });
  }

  if (!/^data:audio\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(referenceDataUri)) {
    return res.status(400).json({ error: 'Save a valid Chatterbox reference voice first.' });
  }
  if (referenceDataUri.length > 3.6 * 1024 * 1024) {
    return res.status(413).json({ error: 'Reference voice is too large. Keep it under 2.5 MB.' });
  }

  const modelInput = engine === 'chatterbox_turbo'
    ? {
        text: input,
        reference_audio: referenceDataUri,
        temperature: numberInRange(body.turbo_temperature, 0.05, 2, 0.65),
        top_p: numberInRange(body.top_p, 0.5, 1, 0.9),
        top_k: Math.min(2000, Math.max(1, Math.floor(Number(body.top_k) || 1000))),
        repetition_penalty: numberInRange(body.repetition_penalty, 1, 2, 1.2),
        seed: Math.max(0, Math.floor(Number(body.turbo_seed) || 42))
      }
    : {
        prompt: input,
        audio_prompt: referenceDataUri,
        exaggeration: numberInRange(body.exaggeration, 0.25, 2, 0.5),
        cfg_weight: numberInRange(body.cfg_weight, 0.2, 1, 0.4),
        temperature: numberInRange(body.temperature, 0.05, 5, 0.8),
        seed: Math.max(0, Math.floor(Number(body.seed) || 42))
      };

  try {
    const modelPath = engine === 'chatterbox_turbo'
      ? 'resemble-ai/chatterbox-turbo'
      : 'resemble-ai/chatterbox';

    const upstream = await fetch('https://api.replicate.com/v1/models/' + modelPath + '/predictions', {
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
