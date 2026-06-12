const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db/travelDb');
const { getFlights } = require('../services/flightDataService');
const { getHotels } = require('../services/hotelDataService');
const { getRoute } = require('../services/routeService');

const listStmt = db.prepare(`
  SELECT * FROM trips
  WHERE user_id = ?
  ORDER BY datetime(updated_at) DESC
`);
const getStmt = db.prepare(`
  SELECT * FROM trips
  WHERE id = ? AND user_id = ?
`);
const insertStmt = db.prepare(`
  INSERT INTO trips (
    id, user_id, title, destination, start_date, end_date, budget, status, notes,
    itinerary_json, selected_flight_json, selected_hotel_json, is_public, share_token,
    created_at, updated_at
  ) VALUES (
    @id, @user_id, @title, @destination, @start_date, @end_date, @budget, @status, @notes,
    @itinerary_json, @selected_flight_json, @selected_hotel_json, @is_public, @share_token,
    @created_at, @updated_at
  )
`);
const updateStmt = db.prepare(`
  UPDATE trips
  SET title=@title, destination=@destination, start_date=@start_date, end_date=@end_date,
      budget=@budget, status=@status, notes=@notes, itinerary_json=@itinerary_json,
      selected_flight_json=@selected_flight_json, selected_hotel_json=@selected_hotel_json,
      updated_at=@updated_at
  WHERE id=@id AND user_id=@user_id
`);
const deleteStmt = db.prepare(`DELETE FROM trips WHERE id = ? AND user_id = ?`);
const shareStmt = db.prepare(`
  UPDATE trips
  SET is_public = 1, share_token = ?, updated_at = ?
  WHERE id = ? AND user_id = ?
`);
const findSharedStmt = db.prepare(`
  SELECT * FROM trips WHERE share_token = ? AND is_public = 1
`);
const listDocStmt = db.prepare(`
  SELECT * FROM documents
  WHERE user_id = ? AND trip_id = ?
  ORDER BY datetime(created_at) DESC
`);
const getDocStmt = db.prepare(`
  SELECT * FROM documents
  WHERE id = ? AND user_id = ?
`);
const insertDocStmt = db.prepare(`
  INSERT INTO documents (id, user_id, trip_id, name, file_path, mime_type, size_bytes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const deleteDocStmt = db.prepare(`
  DELETE FROM documents WHERE id = ? AND user_id = ?
`);
const listBookingStmt = db.prepare(`
  SELECT * FROM bookings
  WHERE user_id = ? AND trip_id = ?
  ORDER BY datetime(updated_at) DESC
`);
const getTripConversationStmt = db.prepare(`
  SELECT * FROM chat_conversations
  WHERE user_id = ? AND trip_id = ?
  ORDER BY datetime(updated_at) DESC
  LIMIT 1
`);
const listConversationMessagesStmt = db.prepare(`
  SELECT * FROM chat_messages
  WHERE conversation_id = ?
  ORDER BY datetime(created_at) DESC
  LIMIT 40
`);

const uploadDir = path.join(__dirname, '..', 'data', 'vault');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const allowedDocTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function parseTripRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    destination: row.destination || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    budget: row.budget || '',
    status: row.status,
    notes: row.notes || '',
    itinerary: JSON.parse(row.itinerary_json || '[]'),
    selectedFlight: row.selected_flight_json ? JSON.parse(row.selected_flight_json) : null,
    selectedHotel: row.selected_hotel_json ? JSON.parse(row.selected_hotel_json) : null,
    isPublic: !!row.is_public,
    shareToken: row.share_token || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function foldIcsLine(value) {
  if (value.length <= 73) return value;
  let out = '';
  let line = value;
  while (line.length > 73) {
    out += line.slice(0, 73) + '\r\n ';
    line = line.slice(73);
  }
  return out + line;
}

function toUtcDateString(dateText) {
  if (!dateText) return '';
  const dt = new Date(dateText);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function normalizeDocumentRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id || null,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function normalizeConversationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id || null,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}

function normalizeChatMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    meta: JSON.parse(row.meta_json || '{}'),
    createdAt: row.created_at,
  };
}

function normalizeBookingRow(row) {
  return {
    id: row.id,
    type: row.type,
    provider: row.provider,
    status: row.status,
    totalAmount: row.total_amount,
    currency: row.currency,
    details: JSON.parse(row.details_json || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', (req, res) => {
  const rows = listStmt.all(req.user.id);
  res.json({ trips: rows.map(parseTripRow) });
});

router.post('/', (req, res) => {
  const now = new Date().toISOString();
  const id = uuidv4();
  const body = req.body || {};
  const payload = {
    id,
    user_id: req.user.id,
    title: body.title || 'Untitled Trip',
    destination: body.destination || '',
    start_date: body.startDate || '',
    end_date: body.endDate || '',
    budget: body.budget || '',
    status: body.status || 'planning',
    notes: body.notes || '',
    itinerary_json: JSON.stringify(Array.isArray(body.itinerary) ? body.itinerary : []),
    selected_flight_json: body.selectedFlight ? JSON.stringify(body.selectedFlight) : null,
    selected_hotel_json: body.selectedHotel ? JSON.stringify(body.selectedHotel) : null,
    is_public: 0,
    share_token: null,
    created_at: now,
    updated_at: now
  };
  insertStmt.run(payload);
  const trip = parseTripRow(getStmt.get(id, req.user.id));
  res.status(201).json({ trip });
});

router.get('/shared/:token', (req, res) => {
  const row = findSharedStmt.get(req.params.token);
  if (!row) return res.status(404).json({ error: 'Shared trip not found.' });
  const trip = parseTripRow(row);
  res.json({ trip });
});

router.get('/:id/details', async (req, res) => {
  const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  const travelDate = trip.startDate || undefined;
  const origin = 'Delhi';
  const destination = trip.destination || 'Goa';
  const budget = trip.budget || 'mid-range';

  const [flightResult, hotelResult, routeResult] = await Promise.allSettled([
    getFlights(origin, destination, travelDate),
    getHotels(destination, travelDate, null, budget),
    getRoute(origin, destination),
  ]);

  const flights = flightResult.status === 'fulfilled'
    ? (flightResult.value?.flights || [])
    : [];
  const hotels = hotelResult.status === 'fulfilled'
    ? (hotelResult.value?.hotels || [])
    : [];
  const route = routeResult.status === 'fulfilled'
    ? routeResult.value
    : null;
  const documents = listDocStmt.all(req.user.id, req.params.id).map(normalizeDocumentRow);
  const bookings = listBookingStmt.all(req.user.id, req.params.id).map(normalizeBookingRow);
  const conversationRow = getTripConversationStmt.get(req.user.id, req.params.id);
  const conversation = normalizeConversationRow(conversationRow);
  const chatMessages = conversation
    ? listConversationMessagesStmt.all(conversation.id).reverse().map(normalizeChatMessage)
    : [];

  return res.json({
    trip,
    route,
    flights: trip.selectedFlight ? [trip.selectedFlight, ...flights] : flights,
    hotels: trip.selectedHotel ? [trip.selectedHotel, ...hotels] : hotels,
    documents,
    bookings,
    conversation,
    chatMessages,
  });
});

router.get('/:id', (req, res) => {
  const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  res.json({ trip });
});

router.put('/:id', (req, res) => {
  const current = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!current) return res.status(404).json({ error: 'Trip not found.' });
  const body = req.body || {};
  updateStmt.run({
    id: req.params.id,
    user_id: req.user.id,
    title: body.title ?? current.title,
    destination: body.destination ?? current.destination,
    start_date: body.startDate ?? current.startDate,
    end_date: body.endDate ?? current.endDate,
    budget: body.budget ?? current.budget,
    status: body.status ?? current.status,
    notes: body.notes ?? current.notes,
    itinerary_json: JSON.stringify(Array.isArray(body.itinerary) ? body.itinerary : current.itinerary),
    selected_flight_json: body.selectedFlight !== undefined
      ? (body.selectedFlight ? JSON.stringify(body.selectedFlight) : null)
      : (current.selectedFlight ? JSON.stringify(current.selectedFlight) : null),
    selected_hotel_json: body.selectedHotel !== undefined
      ? (body.selectedHotel ? JSON.stringify(body.selectedHotel) : null)
      : (current.selectedHotel ? JSON.stringify(current.selectedHotel) : null),
    updated_at: new Date().toISOString()
  });
  const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
  res.json({ trip });
});

router.delete('/:id', (req, res) => {
  const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  deleteStmt.run(req.params.id, req.user.id);
  res.json({ message: 'Deleted.' });
});

router.post('/:id/duplicate', (req, res) => {
  const current = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!current) return res.status(404).json({ error: 'Trip not found.' });
  const now = new Date().toISOString();
  const id = uuidv4();
  insertStmt.run({
    id,
    user_id: req.user.id,
    title: `${current.title} (Copy)`,
    destination: current.destination,
    start_date: current.startDate,
    end_date: current.endDate,
    budget: current.budget,
    status: 'planning',
    notes: current.notes,
    itinerary_json: JSON.stringify(current.itinerary || []),
    selected_flight_json: current.selectedFlight ? JSON.stringify(current.selectedFlight) : null,
    selected_hotel_json: current.selectedHotel ? JSON.stringify(current.selectedHotel) : null,
    is_public: 0,
    share_token: null,
    created_at: now,
    updated_at: now
  });
  const trip = parseTripRow(getStmt.get(id, req.user.id));
  res.status(201).json({ trip });
});

router.post('/:id/share', (req, res) => {
  const current = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!current) return res.status(404).json({ error: 'Trip not found.' });
  const token = current.shareToken || uuidv4().replace(/-/g, '');
  shareStmt.run(token, new Date().toISOString(), req.params.id, req.user.id);
  res.json({ shareToken: token, shareUrl: `/api/trips/shared/${token}` });
});

router.get('/:id/export-ics', (req, res) => {
  const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  const uid = `${trip.id}@travel-planner-v2`;
  const dtStamp = toUtcDateString(new Date().toISOString());
  const dtStart = toUtcDateString(trip.startDate || new Date().toISOString());
  const dtEnd = toUtcDateString(trip.endDate || trip.startDate || new Date().toISOString());
  const title = foldIcsLine(`SUMMARY:${(trip.title || 'Trip').replace(/\n/g, ' ')}`);
  const location = foldIcsLine(`LOCATION:${(trip.destination || '').replace(/\n/g, ' ')}`);
  const description = foldIcsLine(`DESCRIPTION:${(trip.notes || '').replace(/\n/g, ' ')}`);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//travel-planner-v2//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    title,
    location,
    description,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="trip-${trip.id}.ics"`);
  res.send(ics);
});

router.get('/:id/documents', (req, res) => {
  const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  const rows = listDocStmt.all(req.user.id, req.params.id);
  res.json({ documents: rows.map(normalizeDocumentRow) });
});

router.post('/:id/documents', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'file_too_large', message: 'File must be 10MB or smaller.' });
    }
    if (err) {
      return res.status(400).json({ error: 'upload_failed', message: 'Unable to upload file.' });
    }
    const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (!req.file) return res.status(400).json({ error: 'file_required', message: 'Please upload a file.' });
    if (!allowedDocTypes.has(req.file.mimetype)) {
      return res.status(400).json({ error: 'unsupported_file_type', message: 'Supported: PDF, JPEG, PNG, WEBP.' });
    }
    const id = uuidv4();
    const ext = req.file.mimetype === 'application/pdf'
      ? '.pdf'
      : req.file.mimetype === 'image/png'
        ? '.png'
        : req.file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg';
    const safeName = `${id}${ext}`;
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, req.file.buffer);
    const now = new Date().toISOString();
    insertDocStmt.run(
      id,
      req.user.id,
      req.params.id,
      req.body?.name || req.file.originalname || safeName,
      filePath,
      req.file.mimetype,
      req.file.size,
      now
    );
    const row = getDocStmt.get(id, req.user.id);
    res.status(201).json({ document: normalizeDocumentRow(row) });
  });
});

router.delete('/:id/documents/:docId', (req, res) => {
  const trip = parseTripRow(getStmt.get(req.params.id, req.user.id));
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  const row = getDocStmt.get(req.params.docId, req.user.id);
  if (!row || row.trip_id !== req.params.id) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  try {
    if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  } catch {}
  deleteDocStmt.run(req.params.docId, req.user.id);
  res.json({ message: 'Document deleted.' });
});

module.exports = router;
