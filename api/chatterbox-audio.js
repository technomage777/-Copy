const { isAuthorized } = require('./_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Please log in first.' });
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN is not configured in Vercel.' });
  }

  const id = String(req.query && req.query.id || '').trim();
  if (!/^[A-Za-z0-9_-]{4,100}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid prediction ID.' });
  }

  try {
    const predictionResponse = await fetch('https://api.replicate.com/v1/predictions/' + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + process.env.REPLICATE_API_TOKEN }
    });
    const prediction = await predictionResponse.json().catch(() => ({}));

    if (!predictionResponse.ok) {
      const message = prediction.detail || prediction.error || 'Could not read Chatterbox prediction.';
      return res.status(predictionResponse.status).json({ error: typeof message === 'string' ? message : JSON.stringify(message) });
    }
    if (prediction.status !== 'succeeded') {
      return res.status(409).json({ error: 'Chatterbox audio is not ready yet.' });
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl || typeof outputUrl !== 'string') {
      return res.status(502).json({ error: 'Chatterbox finished without an audio file.' });
    }

    let parsed;
    try { parsed = new URL(outputUrl); } catch (_) {}
    if (!parsed || parsed.protocol !== 'https:' || !(parsed.hostname === 'replicate.delivery' || parsed.hostname.endsWith('.replicate.delivery'))) {
      return res.status(502).json({ error: 'Unexpected Chatterbox audio URL.' });
    }

    const audioResponse = await fetch(outputUrl, {
      headers: { Authorization: 'Bearer ' + process.env.REPLICATE_API_TOKEN }
    });
    if (!audioResponse.ok) {
      return res.status(audioResponse.status).json({ error: 'Replicate audio download failed.' });
    }

    const bytes = Buffer.from(await audioResponse.arrayBuffer());
    res.setHeader('Content-Type', audioResponse.headers.get('content-type') || 'audio/wav');
    res.setHeader('Content-Disposition', 'inline; filename="story-narration-chatterbox.wav"');
    return res.status(200).send(bytes);
  } catch (error) {
    return res.status(500).json({ error: 'Server error while downloading Chatterbox audio.' });
  }
};
