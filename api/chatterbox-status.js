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
    const upstream = await fetch('https://api.replicate.com/v1/predictions/' + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + process.env.REPLICATE_API_TOKEN }
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data.detail || data.error || 'Could not read Chatterbox status.';
      return res.status(upstream.status).json({ error: typeof message === 'string' ? message : JSON.stringify(message) });
    }

    const errorText = data.error
      ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      : null;

    return res.status(200).json({
      id: data.id,
      status: data.status,
      output: data.output || null,
      error: errorText
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error while checking Chatterbox status.' });
  }
};
