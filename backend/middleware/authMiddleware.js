const { SESSION_COOKIE_NAME, resolveSession } = require('../services/authService');
const { t } = require('../i18n');

function extractSessionToken(req) {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function optionalAuth(req, _res, next) {
  const token = extractSessionToken(req);
  const result = resolveSession(token);
  if (result) {
    req.auth = {
      sessionId: result.sessionId,
      token,
      expiresAt: result.expiresAt
    };
    req.user = result.user;
  }
  next();
}

function requireAuth(req, res, next) {
  const token = extractSessionToken(req);
  const result = resolveSession(token);
  if (!result) {
    return res.status(401).json({ error: t(req.locale, 'errors.authRequired') });
  }
  req.auth = {
    sessionId: result.sessionId,
    token,
    expiresAt: result.expiresAt
  };
  req.user = result.user;
  return next();
}

module.exports = {
  extractSessionToken,
  optionalAuth,
  requireAuth
};
