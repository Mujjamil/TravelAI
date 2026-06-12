const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/travelDb');

const router = express.Router();

const listConversationsStmt = db.prepare(`
  SELECT c.*,
    (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY datetime(m.created_at) DESC LIMIT 1) AS last_message
  FROM chat_conversations c
  WHERE c.user_id = ?
  ORDER BY datetime(c.updated_at) DESC
`);
const getConversationStmt = db.prepare(`
  SELECT * FROM chat_conversations
  WHERE id = ? AND user_id = ?
`);
const insertConversationStmt = db.prepare(`
  INSERT INTO chat_conversations (
    id, user_id, trip_id, title, created_at, updated_at, last_message_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const updateConversationStmt = db.prepare(`
  UPDATE chat_conversations
  SET title = ?, trip_id = ?, updated_at = ?
  WHERE id = ? AND user_id = ?
`);
const deleteConversationStmt = db.prepare(`
  DELETE FROM chat_conversations
  WHERE id = ? AND user_id = ?
`);
const listMessagesStmt = db.prepare(`
  SELECT * FROM chat_messages
  WHERE conversation_id = ?
  ORDER BY datetime(created_at) ASC
`);
const insertMessageStmt = db.prepare(`
  INSERT INTO chat_messages (
    id, conversation_id, role, content, meta_json, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`);
const touchConversationStmt = db.prepare(`
  UPDATE chat_conversations
  SET updated_at = ?, last_message_at = ?
  WHERE id = ? AND user_id = ?
`);
const validTripStmt = db.prepare(`
  SELECT id FROM trips
  WHERE id = ? AND user_id = ?
`);

function normalizeConversation(row) {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id || null,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    lastMessage: row.last_message || '',
  };
}

function normalizeMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    meta: JSON.parse(row.meta_json || '{}'),
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const rows = listConversationsStmt.all(req.user.id);
  res.json({ conversations: rows.map(normalizeConversation) });
});

router.post('/', (req, res) => {
  const now = new Date().toISOString();
  const id = uuidv4();
  const title = String(req.body?.title || 'New Conversation').slice(0, 120);
  let tripId = req.body?.tripId || null;
  if (tripId && !validTripStmt.get(tripId, req.user.id)) {
    return res.status(400).json({ error: 'Invalid tripId' });
  }
  insertConversationStmt.run(id, req.user.id, tripId, title, now, now, now);
  const row = getConversationStmt.get(id, req.user.id);
  res.status(201).json({ conversation: normalizeConversation(row) });
});

router.get('/:conversationId/messages', (req, res) => {
  const conv = getConversationStmt.get(req.params.conversationId, req.user.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const rows = listMessagesStmt.all(req.params.conversationId);
  res.json({
    conversation: normalizeConversation(conv),
    messages: rows.map(normalizeMessage),
  });
});

router.post('/:conversationId/messages', (req, res) => {
  const conv = getConversationStmt.get(req.params.conversationId, req.user.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const role = req.body?.role === 'bot' ? 'bot' : 'user';
  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ error: 'content required' });
  const meta = req.body?.meta && typeof req.body.meta === 'object' ? req.body.meta : {};
  const now = new Date().toISOString();
  const id = uuidv4();
  insertMessageStmt.run(id, req.params.conversationId, role, content, JSON.stringify(meta), now);
  touchConversationStmt.run(now, now, req.params.conversationId, req.user.id);
  res.status(201).json({
    message: normalizeMessage({
      id,
      conversation_id: req.params.conversationId,
      role,
      content,
      meta_json: JSON.stringify(meta),
      created_at: now,
    }),
  });
});

router.patch('/:conversationId', (req, res) => {
  const conv = getConversationStmt.get(req.params.conversationId, req.user.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const title = req.body?.title !== undefined ? String(req.body.title || '').slice(0, 120) : conv.title;
  let tripId = req.body?.tripId !== undefined ? req.body.tripId : conv.trip_id;
  if (tripId && !validTripStmt.get(tripId, req.user.id)) {
    return res.status(400).json({ error: 'Invalid tripId' });
  }
  const now = new Date().toISOString();
  updateConversationStmt.run(title || conv.title, tripId || null, now, req.params.conversationId, req.user.id);
  const updated = getConversationStmt.get(req.params.conversationId, req.user.id);
  res.json({ conversation: normalizeConversation(updated) });
});

router.delete('/:conversationId', (req, res) => {
  const conv = getConversationStmt.get(req.params.conversationId, req.user.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  deleteConversationStmt.run(req.params.conversationId, req.user.id);
  res.json({ message: 'Conversation deleted' });
});

module.exports = router;
