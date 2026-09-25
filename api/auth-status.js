const { isAuthorized } = require('./_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ authenticated: isAuthorized(req) });
};
