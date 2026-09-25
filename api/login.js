const { getPassword, tokenForPassword, safeEqual } = require('./_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const configured = getPassword();
  if (!configured) {
    return res.status(500).json({ error: 'APP_PASSWORD is not configured in Vercel.' });
  }

  const supplied = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (!safeEqual(supplied, configured)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const token = tokenForPassword(configured);
  res.setHeader('Set-Cookie',
    'svs_auth=' + encodeURIComponent(token) +
    '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200'
  );

  return res.status(200).json({ ok: true });
};
