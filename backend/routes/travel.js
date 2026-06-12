/**
 * Travel Data Routes
 * GET /api/travel/flights  → real flight data
 * GET /api/travel/hotels   → real hotel data
 * GET /api/travel/route    → map route between cities
 */

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/travelDb');
const { getFlights }  = require('../services/flightDataService');
const { getHotels }   = require('../services/hotelDataService');
const { getRoute }    = require('../services/routeService');
const { buildTripExtras, getDays } = require('../services/tripPlanService');

const listWatchStmt = db.prepare(`
  SELECT * FROM price_watch_rules
  WHERE user_id = ?
  ORDER BY datetime(updated_at) DESC
`);
const getWatchStmt = db.prepare(`
  SELECT * FROM price_watch_rules
  WHERE id = ? AND user_id = ?
`);
const insertWatchStmt = db.prepare(`
  INSERT INTO price_watch_rules (
    id, user_id, type, origin, destination, city, target_price, currency,
    is_active, last_price, last_checked_at, created_at, updated_at
  ) VALUES (
    @id, @user_id, @type, @origin, @destination, @city, @target_price, @currency,
    @is_active, @last_price, @last_checked_at, @created_at, @updated_at
  )
`);
const updateWatchStmt = db.prepare(`
  UPDATE price_watch_rules
  SET target_price = @target_price, currency = @currency, is_active = @is_active,
      updated_at = @updated_at
  WHERE id = @id AND user_id = @user_id
`);
const deleteWatchStmt = db.prepare(`
  DELETE FROM price_watch_rules WHERE id = ? AND user_id = ?
`);
const setWatchPriceStmt = db.prepare(`
  UPDATE price_watch_rules
  SET last_price = ?, last_checked_at = ?, updated_at = ?
  WHERE id = ?
`);
const insertWatchEventStmt = db.prepare(`
  INSERT INTO price_watch_events (
    id, rule_id, price, currency, message, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`);
const listWatchEventStmt = db.prepare(`
  SELECT * FROM price_watch_events
  WHERE rule_id = ?
  ORDER BY datetime(created_at) DESC
  LIMIT 50
`);

function normalizeWatchRow(row) {
  return {
    id: row.id,
    type: row.type,
    origin: row.origin || '',
    destination: row.destination || '',
    city: row.city || '',
    targetPrice: row.target_price,
    currency: row.currency,
    isActive: !!row.is_active,
    lastPrice: row.last_price,
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ── GET /api/travel/flights ─────────────────────────────────
// Query: ?origin=Delhi&destination=London&date=2025-06-01
router.get('/flights', async (req, res) => {
  const { origin, destination, date } = req.query;
  if (!destination) return res.status(400).json({ error: 'destination is required' });
  try {
    const data = await getFlights(origin || 'Delhi', destination, date);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('[/flights]', e.message);
    res.status(500).json({ error: 'Flight search failed', details: e.message });
  }
});

// ── GET /api/travel/hotels ──────────────────────────────────
// Query: ?city=Paris&checkIn=2025-06-01&checkOut=2025-06-07&budget=mid-range
router.get('/hotels', async (req, res) => {
  const { city, checkIn, checkOut, budget } = req.query;
  if (!city) return res.status(400).json({ error: 'city is required' });
  try {
    const data = await getHotels(city, checkIn, checkOut, budget || 'mid-range');
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('[/hotels]', e.message);
    res.status(500).json({ error: 'Hotel search failed', details: e.message });
  }
});

// ── GET /api/travel/route ───────────────────────────────────
// Query: ?origin=Delhi&destination=Goa
router.get('/route', async (req, res) => {
  const { origin, destination } = req.query;
  if (!origin || !destination) return res.status(400).json({ error: 'origin and destination required' });
  try {
    const data = await getRoute(origin, destination);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('[/route]', e.message);
    res.status(500).json({ error: 'Route calculation failed', details: e.message });
  }
});

// ── GET /api/travel/search (combined) ──────────────────────
// All-in-one: flights + hotels + route
router.get('/search', async (req, res) => {
  const { origin, destination, date, checkIn, checkOut, budget } = req.query;
  if (!destination) return res.status(400).json({ error: 'destination required' });
  try {
    const [flightData, hotelData, routeData] = await Promise.allSettled([
      getFlights(origin || 'Delhi', destination, date),
      getHotels(destination, checkIn, checkOut, budget || 'mid-range'),
      origin ? getRoute(origin, destination) : Promise.resolve(null),
    ]);
    res.json({
      success: true,
      flights: flightData.status === 'fulfilled' ? flightData.value : null,
      hotels:  hotelData.status  === 'fulfilled' ? hotelData.value  : null,
      route:   routeData.status  === 'fulfilled' ? routeData.value  : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/travel/complete-plan ───────────────────────────
// One prompt → flights, hotels, route, itinerary, packing, places and media.
router.get('/complete-plan', async (req, res) => {
  const {
    origin = 'Delhi',
    destination,
    date = '',
    duration = '7-days',
    budget = 'mid-range',
    tripType = 'general',
    month = '',
    placeType = '',
    companion = '',
  } = req.query;
  if (!destination) return res.status(400).json({ error: 'destination required' });

  const days = getDays(duration);
  const checkInDate = date ? new Date(`${date}T00:00:00`) : new Date();
  if (!date) checkInDate.setDate(checkInDate.getDate() + 30);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + days);
  const checkIn = checkInDate.toISOString().slice(0, 10);
  const checkOut = checkOutDate.toISOString().slice(0, 10);

  try {
    const [flightData, hotelData, routeData] = await Promise.allSettled([
      getFlights(origin, destination, date || checkIn),
      getHotels(destination, checkIn, checkOut, budget),
      getRoute(origin, destination),
    ]);
    const extras = buildTripExtras({ destination, duration, budget, tripType, month, placeType, companion });

    res.json({
      success: true,
      search: { origin, destination, date: date || checkIn, checkIn, checkOut, duration, budget, tripType, month, placeType, companion },
      flights: flightData.status === 'fulfilled' ? flightData.value : null,
      hotels: hotelData.status === 'fulfilled' ? hotelData.value : null,
      route: routeData.status === 'fulfilled' ? routeData.value : null,
      ...extras,
    });
  } catch (e) {
    console.error('[/complete-plan]', e.message);
    res.status(500).json({ error: 'Complete trip planning failed', details: e.message });
  }
});

router.get('/best-time', (req, res) => {
  const { destination = '', month } = req.query;
  const monthNum = Number(month || new Date().getMonth() + 1);
  if (!destination) return res.status(400).json({ error: 'destination required' });
  const validMonth = Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12 ? monthNum : 1;
  const peakMonths = new Set([12, 1, 6, 7, 8]);
  const shoulderMonths = new Set([2, 3, 4, 9, 10, 11]);
  const crowdLevel = peakMonths.has(validMonth) ? 'high' : shoulderMonths.has(validMonth) ? 'medium' : 'low';
  const weatherRisk = [6, 7, 8, 9].includes(validMonth) ? 'medium' : 'low';
  const score = crowdLevel === 'high' ? 62 : crowdLevel === 'medium' ? 78 : 88;
  res.json({
    success: true,
    destination,
    month: validMonth,
    crowdLevel,
    weatherRisk,
    recommendationScore: score,
    summary: `For ${destination}, month ${validMonth} is estimated as ${crowdLevel} crowd with ${weatherRisk} weather risk.`,
  });
});

router.get('/logistics', (req, res) => {
  const { city = '', country = '' } = req.query;
  if (!city) return res.status(400).json({ error: 'city required' });
  res.json({
    success: true,
    city,
    country,
    airportTransfer: [
      'Official airport taxi',
      'Ride-hailing app pickup zone',
      'Airport express bus/metro',
    ],
    esim: [
      'Check regional eSIM providers',
      'Activate data pack before arrival',
    ],
    transportPasses: [
      'Daily transit pass',
      'Weekly tourist mobility pass',
    ],
    emergency: {
      police: '112',
      ambulance: '112',
      fire: '112',
    },
  });
});

router.post('/auto-itinerary', async (req, res) => {
  const {
    destination = '',
    days = 3,
    interests = [],
    pace = 'balanced',
    budget = 'mid-range',
    startDate = '',
  } = req.body || {};
  if (!destination) return res.status(400).json({ error: 'destination required' });
  const totalDays = Math.max(1, Math.min(14, Number(days) || 3));
  const baseInterests = Array.isArray(interests) && interests.length > 0
    ? interests
    : ['sightseeing', 'food', 'local culture'];
  const schedule = Array.from({ length: totalDays }).map((_, idx) => {
    const day = idx + 1;
    const seed = baseInterests[idx % baseInterests.length];
    return {
      day,
      title: `Day ${day}: ${seed}`,
      morning: `Explore top ${seed} spots in ${destination}`,
      afternoon: `Guided walk and local lunch (${budget})`,
      evening: pace === 'relaxed' ? 'Leisure + sunset viewpoint' : 'Night market / city highlights',
      estimatedDailyBudget: (budget === 'luxury' ? 220 : budget === 'budget' ? 60 : 120) * 83,
    };
  });
  res.json({
    success: true,
    destination,
    pace,
    budget,
    startDate,
    itinerary: schedule,
  });
});

router.post('/split-cost', (req, res) => {
  const { total = 0, people = 1, paidBy = [] } = req.body || {};
  const totalAmount = Number(total);
  const count = Math.max(1, Number(people) || 1);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return res.status(400).json({ error: 'total must be a positive number' });
  }
  const eachShare = Number((totalAmount / count).toFixed(2));
  const payers = Array.isArray(paidBy) ? paidBy : [];
  const paidMap = new Map();
  for (const p of payers) {
    if (!p?.name) continue;
    paidMap.set(p.name, Number(p.amount || 0));
  }
  const settlements = [...paidMap.entries()].map(([name, amount]) => ({
    name,
    paid: amount,
    shouldPay: eachShare,
    balance: Number((amount - eachShare).toFixed(2)),
  }));
  res.json({
    success: true,
    total: totalAmount,
    people: count,
    eachShare,
    settlements,
  });
});

router.get('/price-watch/rules', (req, res) => {
  const rows = listWatchStmt.all(req.user.id);
  res.json({ rules: rows.map(normalizeWatchRow) });
});

router.post('/price-watch/rules', (req, res) => {
  const body = req.body || {};
  const now = new Date().toISOString();
  const id = uuidv4();
  const payload = {
    id,
    user_id: req.user.id,
    type: body.type === 'hotel' ? 'hotel' : 'flight',
    origin: body.origin || '',
    destination: body.destination || '',
    city: body.city || '',
    target_price: Number(body.targetPrice || 0),
    currency: body.currency || 'USD',
    is_active: body.isActive === false ? 0 : 1,
    last_price: null,
    last_checked_at: null,
    created_at: now,
    updated_at: now,
  };
  insertWatchStmt.run(payload);
  const row = getWatchStmt.get(id, req.user.id);
  res.status(201).json({ rule: normalizeWatchRow(row) });
});

router.put('/price-watch/rules/:id', (req, res) => {
  const row = getWatchStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Rule not found' });
  const body = req.body || {};
  updateWatchStmt.run({
    id: req.params.id,
    user_id: req.user.id,
    target_price: body.targetPrice !== undefined ? Number(body.targetPrice) : row.target_price,
    currency: body.currency || row.currency,
    is_active: body.isActive === undefined ? row.is_active : (body.isActive ? 1 : 0),
    updated_at: new Date().toISOString(),
  });
  const updated = getWatchStmt.get(req.params.id, req.user.id);
  res.json({ rule: normalizeWatchRow(updated) });
});

router.delete('/price-watch/rules/:id', (req, res) => {
  const row = getWatchStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Rule not found' });
  deleteWatchStmt.run(req.params.id, req.user.id);
  res.json({ message: 'Rule deleted' });
});

router.post('/price-watch/rules/:id/check', async (req, res) => {
  const row = getWatchStmt.get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Rule not found' });
  if (!row.is_active) return res.status(400).json({ error: 'Rule is inactive' });

  let currentPrice = null;
  try {
    if (row.type === 'flight') {
      const data = await getFlights(row.origin || 'Delhi', row.destination || row.city || 'Dubai', null);
      currentPrice = Number(data?.flights?.[0]?.price || 0);
    } else {
      const data = await getHotels(row.city || row.destination || 'Dubai', null, null, 'mid-range');
      currentPrice = Number(data?.hotels?.[0]?.price || 0);
    }
  } catch {
    currentPrice = Number(row.last_price || 0);
  }
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) currentPrice = Number(row.last_price || 0);

  const now = new Date().toISOString();
  setWatchPriceStmt.run(currentPrice, now, now, row.id);
  let event = null;
  if (currentPrice > 0 && row.target_price > 0 && currentPrice <= row.target_price) {
    const message = `${row.type === 'flight' ? 'Flight' : 'Hotel'} dropped to ${currentPrice} ${row.currency}.`;
    const eventId = uuidv4();
    insertWatchEventStmt.run(eventId, row.id, currentPrice, row.currency, message, now);
    event = { id: eventId, message, price: currentPrice };
  }
  const updated = getWatchStmt.get(row.id, req.user.id);
  const events = listWatchEventStmt.all(row.id);
  res.json({ rule: normalizeWatchRow(updated), event, events });
});

module.exports = router;
