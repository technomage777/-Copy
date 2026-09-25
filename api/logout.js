module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  res.setHeader('Set-Cookie', 'svs_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
  return res.status(200).json({ ok: true });
};
