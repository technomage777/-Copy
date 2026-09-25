const { validateRequest, decodeHeader } = require('./_voice-upload');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const upload = validateRequest(req, res);
  if (!upload) return;

  const name = decodeHeader(req.headers['x-voice-name'], 'Story Narrator').slice(0, 80);
  const consent = String(req.headers['x-consent-id'] || '').trim();

  if (!/^cons_[A-Za-z0-9_-]+$/.test(consent)) {
    return res.status(400).json({ error: 'A valid consent ID is required.' });
  }

  try {
    const form = new FormData();
    form.append('name', name);
    form.append('consent', consent);
    form.append('audio_sample', new Blob([upload.bytes], { type: upload.type }), upload.filename);

    const upstream = await fetch('https://api.openai.com/v1/audio/voices', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: form
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : 'OpenAI rejected the custom voice sample.';
      return res.status(upstream.status).json({ error: message });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Server error while creating the custom voice.' });
  }
};
