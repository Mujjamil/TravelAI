const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const { sendPasswordResetEmail } = require('../services/emailService');
const {
  SESSION_COOKIE_NAME,
  registerUser,
  verifyCredentials,
  createSession,
  revokeSession,
  revokeAllSessions,
  getCookieOptions,
  clearCookieOptions,
  issuePasswordResetToken,
  resetPassword
} = require('../services/authService');
const { requireAuth } = require('../middleware/authMiddleware');
const { t } = require('../i18n');

const AUTH_ERROR_MAP = new Map([
  ['Name must be between 2 and 80 characters.', 'authErrors.nameLength'],
  ['Name contains invalid characters.', 'authErrors.nameChars'],
  ['Email is required.', 'authErrors.emailRequired'],
  ['Invalid email format.', 'authErrors.emailInvalid'],
  ['Password must be between 8 and 128 characters.', 'authErrors.passwordLength'],
  ['Password must include uppercase, lowercase, and a number.', 'authErrors.passwordRules'],
  ['Email already registered.', 'authErrors.emailExists'],
  ['Invalid credentials.', 'authErrors.invalidCredentials'],
  ['Password is required.', 'authErrors.passwordRequired'],
  ['Invalid reset token.', 'authErrors.resetTokenInvalid'],
  ['Reset token is invalid or already used.', 'authErrors.resetTokenUsed'],
  ['Reset token has expired.', 'authErrors.resetTokenExpired']
]);

function localizeAuthError(locale, message) {
  const key = AUTH_ERROR_MAP.get(String(message || '').trim());
  if (!key) return message;
  return t(locale, key);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

router.use(authLimiter);

router.post('/register', async (req, res) => {
  const { name, email, password, rememberMe = false } = req.body || {};
  const result = await registerUser({ name, email, password });
  if (result.error) {
    return res.status(result.status || 400).json({ error: localizeAuthError(req.locale, result.error) });
  }
  const session = createSession({
    userId: result.user.id,
    rememberMe: !!rememberMe,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip
  });
  res.cookie(SESSION_COOKIE_NAME, session.token, getCookieOptions(session.rememberMe));
  return res.status(201).json({ user: result.user });
});

router.post('/login', async (req, res) => {
  const { email, password, rememberMe = false } = req.body || {};
  const result = await verifyCredentials({ email, password });
  if (result.error) {
    return res.status(result.status || 401).json({ error: localizeAuthError(req.locale, result.error) });
  }
  const session = createSession({
    userId: result.user.id,
    rememberMe: !!rememberMe,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip
  });
  res.cookie(SESSION_COOKIE_NAME, session.token, getCookieOptions(session.rememberMe));
  return res.json({ user: result.user });
});

router.post('/logout', (req, res) => {
  revokeSession(req.cookies?.[SESSION_COOKIE_NAME]);
  res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions());
  res.json({ message: t(req.locale, 'auth.loggedOut') });
});

router.post('/logout-all', requireAuth, (req, res) => {
  revokeAllSessions(req.user.id);
  res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions());
  res.json({ message: t(req.locale, 'auth.loggedOutAll') });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  const result = issuePasswordResetToken(email);
  if (result.error) {
    return res.status(result.status || 400).json({ error: localizeAuthError(req.locale, result.error) });
  }

  if (result.token) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    sendPasswordResetEmail({ to: email, token: result.token, frontendUrl })
      .catch(err => console.error('[email] reset email failed:', err.message));
  }

  const payload = {
    message: t(req.locale, 'auth.resetLinkSent')
  };
  if (process.env.NODE_ENV !== 'production' && result.token) {
    payload.devResetToken = result.token;
    payload.devResetExpiresAt = result.expiresAt;
  }
  return res.json(payload);
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  const result = await resetPassword({ token, newPassword: password });
  if (result.error) {
    return res.status(result.status || 400).json({ error: localizeAuthError(req.locale, result.error) });
  }
  res.json({ message: t(req.locale, 'auth.passwordResetSuccess') });
});

module.exports = router;
