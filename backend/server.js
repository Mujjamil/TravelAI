require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { localeMiddleware } = require('./middleware/localeMiddleware');
const { t } = require('./i18n');

const chatRoutes   = require('./routes/chat');
const authRoutes   = require('./routes/auth');
const tripRoutes   = require('./routes/trips');
const userRoutes   = require('./routes/users');
const travelRoutes = require('./routes/travel');
const bookingRoutes = require('./routes/bookings');
const chatHistoryRoutes = require('./routes/chatHistory');
const { requireAuth } = require('./middleware/authMiddleware');

const app  = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.PHP_FRONTEND_URL || 'http://localhost:8000',
  // Allow both common Vite ports in development so port conflicts don't break auth
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3001']
    : []),
];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS blocked'));
  },
  credentials: true
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(localeMiddleware);
app.use(morgan('dev'));

app.use('/api/auth',   authRoutes);
app.use('/api/chat',   requireAuth, chatRoutes);
app.use('/api/chat-history', requireAuth, chatHistoryRoutes);
app.use('/api/trips',  requireAuth, tripRoutes);
app.use('/api/users',  requireAuth, userRoutes);
app.use('/api/travel', requireAuth, travelRoutes);
app.use('/api/bookings', requireAuth, bookingRoutes);

app.get('/health', (_, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: t(req.locale, 'errors.internalServer') });
});

app.listen(PORT, () => {
  console.log(`🚀 Travel Bot API  → http://localhost:${PORT}`);
  console.log(`   Flights:         GET /api/travel/flights?origin=Delhi&destination=London`);
  console.log(`   Hotels:          GET /api/travel/hotels?city=Paris&budget=mid-range`);
  console.log(`   Route/Map:       GET /api/travel/route?origin=Delhi&destination=Goa`);
});
module.exports = app;
