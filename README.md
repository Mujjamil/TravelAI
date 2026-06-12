# ✈️ Travel Planner AI v2 — Real Flights, Hotels & Maps

Custom ML NLP · Real Flight APIs · Live Hotel Data · Interactive Route Maps

## 🆕 What's New in v2

| Feature         | Details                                                  |
| --------------- | -------------------------------------------------------- |
| ✈️ Real Flights | Amadeus API (free) → Aviationstack → curated estimates   |
| 🏨 Real Hotels  | Amadeus + Foursquare + curated DB for 20+ cities         |
| 🗺️ Route Maps  | Leaflet + OSRM (free, no key) drive routes + flight arcs |
| 💬 Inline Cards | Flight/hotel cards appear directly in chat               |
| 🔍 Explore Page | Full search UI with map, flights list, hotels grid       |

## 🚀 Run Instructions (3 terminals)

### Step 1 - Install Python deps + Train model (ONE TIME)

```
cd backend
pip3 install -r requirements.txt
python3 ml/train_model.py
```

### Step 2 - Setup env

```
cp .env.example .env
# Edit .env - add API keys (optional, works without them too)
```

### Step 3 - Install Node deps

```
npm install
cd ../frontend && npm install
```

### Step 4 - Run all 3 services

Terminal 1:  cd backend && python3 ml/nlp\_server.py    (port 5001)
Terminal 2:  cd backend && npm run dev                  (port 3000)
Terminal 3:  cd frontend && npm run dev                 (port 5173)

Open: <http://localhost:5173>

## 🔑 Free API Keys (all optional - works without them)

- Amadeus (best): <https://developers.amadeus.com>  - free sandbox
- Aviationstack: <https://aviationstack.com>         - 1000 req/month free
- Foursquare: <https://developer.foursquare.com>     - 950 req/day free
- OSRM + Leaflet maps: NO KEY NEEDED, completely free

## 🗺️ Map Features

- Nearby cities (same country, <1500km): shows real OSRM driving route
- Far/international routes: shows curved flight arc
- Hotel map: pins all hotels with popup cards and booking links

## API Endpoints

```
POST /api/chat                                      - chat
GET  /api/travel/flights?origin=Delhi&destination=London&date=2025-06-01
GET  /api/travel/hotels?city=Paris&budget=mid-range
GET  /api/travel/route?origin=Delhi&destination=Goa
GET  /api/travel/search?origin=Delhi&destination=London   (combined)
```

