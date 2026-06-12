const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/travelDb');

const listStmt = db.prepare(`
  SELECT * FROM bookings
  WHERE user_id = ?
  ORDER BY datetime(updated_at) DESC
`);
const getStmt = db.prepare(`
  SELECT * FROM bookings
  WHERE id = ? AND user_id = ?
`);
const insertStmt = db.prepare(`
  INSERT INTO bookings (
    id, user_id, trip_id, type, provider, status, total_amount, currency, details_json, created_at, updated_at
  ) VALUES (
    @id, @user_id, @trip_id, @type, @provider, @status, @total_amount, @currency, @details_json, @created_at, @updated_at
  )
`);
const updateStatusStmt = db.prepare(`
  UPDATE bookings
  SET status = ?, updated_at = ?
  WHERE id = ? AND user_id = ?
`);
const insertEventStmt = db.prepare(`
  INSERT INTO booking_events (id, booking_id, status, note, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
const listEventStmt = db.prepare(`
  SELECT * FROM booking_events
  WHERE booking_id = ?
  ORDER BY datetime(created_at) ASC
`);

function normalizeBooking(row) {
  return {
    id: row.id,
    tripId: row.trip_id || null,
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
  res.json({ bookings: rows.map(normalizeBooking) });
});

router.get('/:id', (req, res) => {
  const row = getStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  const events = listEventStmt.all(row.id);
  res.json({ booking: normalizeBooking(row), events });
});

router.post('/checkout', (req, res) => {
  const body = req.body || {};
  const now = new Date().toISOString();
  const id = uuidv4();
  const payload = {
    id,
    user_id: req.user.id,
    trip_id: body.tripId || null,
    type: body.type === 'hotel' ? 'hotel' : 'flight',
    provider: body.provider || 'Travel Partner',
    status: 'confirmed',
    total_amount: Number(body.totalAmount || 0),
    currency: body.currency || 'USD',
    details_json: JSON.stringify({
      traveler: body.traveler || {},
      segments: body.segments || [],
      notes: body.notes || '',
      policyAccepted: !!body.policyAccepted,
      paidAt: now,
    }),
    created_at: now,
    updated_at: now,
  };
  insertStmt.run(payload);
  insertEventStmt.run(uuidv4(), id, 'confirmed', 'Booking confirmed via checkout flow', now);
  const booking = normalizeBooking(getStmt.get(id, req.user.id));
  res.status(201).json({ booking, voucherUrl: `/api/bookings/${id}/voucher` });
});

router.post('/:id/cancel', (req, res) => {
  const row = getStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  if (row.status === 'cancelled') return res.json({ booking: normalizeBooking(row), message: 'Booking already cancelled' });
  const now = new Date().toISOString();
  updateStatusStmt.run('cancelled', now, req.params.id, req.user.id);
  insertEventStmt.run(uuidv4(), req.params.id, 'cancelled', req.body?.reason || 'Cancelled by user', now);
  const booking = normalizeBooking(getStmt.get(req.params.id, req.user.id));
  res.json({ booking, message: 'Booking cancelled' });
});

router.get('/:id/voucher', (req, res) => {
  const row = getStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  const booking = normalizeBooking(row);
  const content = [
    'TRAVEL BOOKING VOUCHER',
    `Booking ID: ${booking.id}`,
    `Type: ${booking.type}`,
    `Provider: ${booking.provider}`,
    `Status: ${booking.status}`,
    `Amount: ${booking.totalAmount || 0} ${booking.currency}`,
    `Issued: ${booking.createdAt}`,
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="voucher-${booking.id}.txt"`);
  res.send(content);
});

router.post('/:id/support', (req, res) => {
  const row = getStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Booking not found' });
  const concern = (req.body?.message || '').toLowerCase();
  const suggestions = [];
  if (concern.includes('delay')) {
    suggestions.push('Check airline live status and terminal desk support.');
    suggestions.push('Request rebooking options with same-day alternatives.');
  } else if (concern.includes('refund')) {
    suggestions.push('Review fare conditions and cancellation penalty.');
    suggestions.push('Submit refund request with booking ID and payment proof.');
  } else {
    suggestions.push('Use the booking timeline to verify current status.');
    suggestions.push('Contact provider support with booking ID and traveler name.');
  }
  suggestions.push('Keep vouchers and payment receipt ready for escalation.');
  res.json({ bookingId: req.params.id, suggestions });
});

module.exports = router;
