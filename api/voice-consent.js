const { validateRequest, decodeHeader } = require('./_voice-upload');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const upload = validateRequest(req, res);
  if (!upload) return;

  const name = decodeHeader(req.headers['x-consent-name'], 'story_voice_consent').slice(0, 80);
  const language = decodeHeader(req.headers['x-consent-language'], 'en').slice(0, 10);

  try {
    const form = new FormData();
    form.append('name', name);
    form.append('language', language);
    form.append('recording', new Blob([upload.bytes], { type: upload.type }), upload.filename);

    const upstream = await fetch('https://api.openai.com/v1/audio/voice_consents', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: form
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : 'OpenAI rejected the consent recording.';
      return res.status(upstream.status).json({ error: message });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Server error while uploading voice consent.' });
  }
};
