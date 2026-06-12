const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/authDb');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'tp_session';
const DEFAULT_SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 8);
const REMEMBER_SESSION_TTL_SECONDS = Number(process.env.REMEMBER_ME_TTL_SECONDS || 60 * 60 * 24 * 30);
const IDLE_TIMEOUT_SECONDS = Number(process.env.SESSION_IDLE_TIMEOUT_SECONDS || 60 * 30);
const REMEMBER_IDLE_TIMEOUT_SECONDS = Number(process.env.REMEMBER_ME_IDLE_TIMEOUT_SECONDS || 60 * 60 * 24 * 7);
const RESET_TOKEN_TTL_SECONDS = Number(process.env.RESET_TOKEN_TTL_SECONDS || 60 * 30);

const findUserByEmailStmt = db.prepare(`
  SELECT id, name, email, password_hash, created_at, updated_at
  FROM users
  WHERE email = ?
`);
const createUserStmt = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const createSessionStmt = db.prepare(`
  INSERT INTO sessions (id, user_id, token_hash, remember_me, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
`);
const getSessionByTokenHashStmt = db.prepare(`
  SELECT s.id, s.user_id, s.remember_me, s.user_agent, s.ip_address, s.created_at, s.last_seen_at, s.expires_at, s.revoked_at,
         u.name, u.email
  FROM sessions s
  INNER JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ?
`);
const updateSessionSeenStmt = db.prepare(`
  UPDATE sessions
  SET last_seen_at = ?
  WHERE id = ?
`);
const revokeSessionByHashStmt = db.prepare(`
  UPDATE sessions
  SET revoked_at = ?
  WHERE token_hash = ? AND revoked_at IS NULL
`);
const revokeAllUserSessionsStmt = db.prepare(`
  UPDATE sessions
  SET revoked_at = ?
  WHERE user_id = ? AND revoked_at IS NULL
`);
const findUserByIdStmt = db.prepare(`
  SELECT id, name, email, created_at, updated_at
  FROM users
  WHERE id = ?
`);
const createResetTokenStmt = db.prepare(`
  INSERT INTO password_reset_tokens (id, user_id, token_hash, created_at, expires_at, used_at)
  VALUES (?, ?, ?, ?, ?, NULL)
`);
const findResetTokenStmt = db.prepare(`
  SELECT rt.id, rt.user_id, rt.expires_at, rt.used_at, u.email
  FROM password_reset_tokens rt
  INNER JOIN users u ON u.id = rt.user_id
  WHERE rt.token_hash = ?
`);
const markResetTokenUsedStmt = db.prepare(`
  UPDATE password_reset_tokens
  SET used_at = ?
  WHERE id = ?
`);
const updateUserPasswordStmt = db.prepare(`
  UPDATE users
  SET password_hash = ?, updated_at = ?
  WHERE id = ?
`);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateName(name) {
  const value = String(name || '').trim();
  if (value.length < 2 || value.length > 80) {
    return 'Name must be between 2 and 80 characters.';
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(value)) {
    return 'Name contains invalid characters.';
  }
  return null;
}

function validateEmail(email) {
  const value = normalizeEmail(email);
  if (!value) return 'Email is required.';
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!ok) return 'Invalid email format.';
  return null;
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8 || value.length > 128) {
    return 'Password must be between 8 and 128 characters.';
  }
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  if (!hasUpper || !hasLower || !hasDigit) {
    return 'Password must include uppercase, lowercase, and a number.';
  }
  return null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function sanitizeUser(user) {
  if (!user) return null;
  return { id: user.user_id || user.id, name: user.name, email: user.email };
}

async function registerUser({ name, email, password }) {
  const nameErr = validateName(name);
  if (nameErr) return { error: nameErr, status: 400 };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, status: 400 };
  const passErr = validatePassword(password);
  if (passErr) return { error: passErr, status: 400 };

  const normalizedEmail = normalizeEmail(email);
  const existing = findUserByEmailStmt.get(normalizedEmail);
  if (existing) return { error: 'Email already registered.', status: 409 };

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = uuidv4();
  const timestamp = nowIso();
  createUserStmt.run(id, String(name).trim(), normalizedEmail, hash, timestamp, timestamp);

  return { user: sanitizeUser(findUserByIdStmt.get(id)) };
}

async function verifyCredentials({ email, password }) {
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr, status: 400 };
  if (!password) return { error: 'Password is required.', status: 400 };

  const user = findUserByEmailStmt.get(normalizeEmail(email));
  if (!user) return { error: 'Invalid credentials.', status: 401 };

  const valid = await bcrypt.compare(String(password), user.password_hash);
  if (!valid) return { error: 'Invalid credentials.', status: 401 };

  return { user: sanitizeUser(user) };
}

function createSession({ userId, rememberMe = false, userAgent = '', ipAddress = '' }) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const createdAt = new Date();
  const ttl = rememberMe ? REMEMBER_SESSION_TTL_SECONDS : DEFAULT_SESSION_TTL_SECONDS;
  const expiresAt = addSeconds(createdAt, ttl).toISOString();
  const now = createdAt.toISOString();
  createSessionStmt.run(
    uuidv4(),
    userId,
    tokenHash,
    rememberMe ? 1 : 0,
    String(userAgent || '').slice(0, 255),
    String(ipAddress || '').slice(0, 120),
    now,
    now,
    expiresAt
  );
  return { token: rawToken, expiresAt, rememberMe: !!rememberMe };
}

function resolveSession(rawToken) {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const row = getSessionByTokenHashStmt.get(tokenHash);
  if (!row || row.revoked_at) return null;

  const now = new Date();
  const expiresAt = new Date(row.expires_at);
  if (expiresAt <= now) {
    revokeSessionByHashStmt.run(nowIso(), tokenHash);
    return null;
  }

  const idleLimit = row.remember_me ? REMEMBER_IDLE_TIMEOUT_SECONDS : IDLE_TIMEOUT_SECONDS;
  const lastSeenAt = new Date(row.last_seen_at);
  const idleExpiresAt = addSeconds(lastSeenAt, idleLimit);
  if (idleExpiresAt <= now) {
    revokeSessionByHashStmt.run(nowIso(), tokenHash);
    return null;
  }

  updateSessionSeenStmt.run(nowIso(), row.id);

  return {
    sessionId: row.id,
    user: sanitizeUser(row),
    rememberMe: !!row.remember_me,
    expiresAt: row.expires_at
  };
}

function revokeSession(rawToken) {
  if (!rawToken) return;
  revokeSessionByHashStmt.run(nowIso(), hashToken(rawToken));
}

function revokeAllSessions(userId) {
  revokeAllUserSessionsStmt.run(nowIso(), userId);
}

function getCookieOptions(rememberMe) {
  const maxAgeSeconds = rememberMe ? REMEMBER_SESSION_TTL_SECONDS : DEFAULT_SESSION_TTL_SECONDS;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeSeconds * 1000,
    path: '/'
  };
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };
}

function issuePasswordResetToken(email) {
  const normalizedEmail = normalizeEmail(email);
  const emailErr = validateEmail(normalizedEmail);
  if (emailErr) return { error: emailErr, status: 400 };

  const user = findUserByEmailStmt.get(normalizedEmail);
  if (!user) {
    return { ok: true };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const createdAt = new Date();
  const expiresAt = addSeconds(createdAt, RESET_TOKEN_TTL_SECONDS).toISOString();
  createResetTokenStmt.run(uuidv4(), user.id, tokenHash, createdAt.toISOString(), expiresAt);
  return { ok: true, token, expiresAt };
}

async function resetPassword({ token, newPassword }) {
  const normalizedToken = String(token || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(normalizedToken)) {
    return { error: 'Invalid reset token.', status: 400 };
  }
  const passErr = validatePassword(newPassword);
  if (passErr) return { error: passErr, status: 400 };

  const row = findResetTokenStmt.get(hashToken(normalizedToken));
  if (!row || row.used_at) return { error: 'Reset token is invalid or already used.', status: 400 };
  if (new Date(row.expires_at) <= new Date()) return { error: 'Reset token has expired.', status: 400 };

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const now = nowIso();
  updateUserPasswordStmt.run(hash, now, row.user_id);
  markResetTokenUsedStmt.run(now, row.id);
  revokeAllSessions(row.user_id);

  return { ok: true };
}

module.exports = {
  SESSION_COOKIE_NAME,
  normalizeEmail,
  validateName,
  validateEmail,
  validatePassword,
  registerUser,
  verifyCredentials,
  createSession,
  resolveSession,
  revokeSession,
  revokeAllSessions,
  getCookieOptions,
  clearCookieOptions,
  issuePasswordResetToken,
  resetPassword
};
