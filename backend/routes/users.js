const express = require('express');
const router  = express.Router();
const db = require('../db/travelDb');

const getPrefStmt = db.prepare(`
  SELECT data_json, updated_at FROM user_preferences WHERE user_id = ?
`);
const upsertPrefStmt = db.prepare(`
  INSERT INTO user_preferences (user_id, data_json, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    data_json = excluded.data_json,
    updated_at = excluded.updated_at
`);

router.get('/profile', (req, res) => {
  const row = getPrefStmt.get(req.user.id);
  const preferences = row ? JSON.parse(row.data_json || '{}') : {};
  res.json({ user: { ...req.user, preferences } });
});

router.get('/preferences', (req, res) => {
  const row = getPrefStmt.get(req.user.id);
  const preferences = row ? JSON.parse(row.data_json || '{}') : {};
  res.json({ preferences, updatedAt: row?.updated_at || null });
});

router.put('/preferences', (req, res) => {
  const preferences = req.body && typeof req.body === 'object' ? req.body : {};
  const now = new Date().toISOString();
  upsertPrefStmt.run(req.user.id, JSON.stringify(preferences), now);
  res.json({ message: 'Preferences saved!', preferences, updatedAt: now });
});

module.exports = router;
