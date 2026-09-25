const crypto = require('crypto');

function getPassword() {
  return process.env.APP_PASSWORD || '';
}

function tokenForPassword(password) {
  return crypto.createHash('sha256').update('story-voice-studio:' + password).digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i === -1) return;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function isAuthorized(req) {
  const password = getPassword();
  if (!password) return false;
  const cookie = parseCookies(req).svs_auth || '';
  const expected = tokenForPassword(password);
  return safeEqual(cookie, expected);
}

module.exports = { getPassword, tokenForPassword, isAuthorized, safeEqual };
