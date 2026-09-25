const { isAuthorized } = require('./_auth');
const VOICES = new Set([
  'alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer','verse','marin','cedar'
]);
const FORMATS = new Set(['mp3','wav','flac','aac','opus','pcm']);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Please log in first.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in Vercel.' });
  }

  const body = req.body || {};
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
  const voice = typeof body.voice === 'string' ? body.voice : 'ash';
  const format = typeof body.format === 'string' ? body.format : 'mp3';
  const speed = Number(body.speed);

  if (!input) return res.status(400).json({ error: 'Narration text is required.' });
  if (input.length > 4096) return res.status(400).json({ error: 'Narration must be 4096 characters or fewer for one request.' });
  const isCustomVoice = /^voice_[A-Za-z0-9_-]+$/.test(voice);
  if (!VOICES.has(voice) && !isCustomVoice) return res.status(400).json({ error: 'Unsupported voice.' });
  if (!FORMATS.has(format)) return res.status(400).json({ error: 'Unsupported output format.' });
  if (!Number.isFinite(speed) || speed < 0.25 || speed > 4) {
    return res.status(400).json({ error: 'Speed must be between 0.25 and 4.0.' });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: isCustomVoice ? { id: voice } : voice,
        input,
        instructions,
        response_format: format,
        speed
      })
    });

    if (!upstream.ok) {
      let detail = 'OpenAI speech generation failed.';
      try {
        const data = await upstream.json();
        if (data && data.error && data.error.message) detail = data.error.message;
      } catch (_) {}
      return res.status(upstream.status).json({ error: detail });
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    const contentTypes = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      aac: 'audio/aac',
      opus: 'audio/ogg',
      pcm: 'application/octet-stream'
    };
    res.setHeader('Content-Type', contentTypes[format] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline; filename="story-narration.' + format + '"');
    res.setHeader('Content-Length', bytes.length);
    return res.status(200).send(bytes);
  } catch (error) {
    return res.status(500).json({ error: 'Server error while generating speech.' });
  }
};
