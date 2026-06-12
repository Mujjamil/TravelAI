/**
 * Route & Map Service
 * - Calculates routes between cities using OSRM (free, no key needed)
 * - Provides coordinates for map display
 * - Determines if route is drivable (within ~2000km)
 * - Returns GeoJSON polyline for map rendering
 *
 * OSRM public API: http://router.project-osrm.org (free, no key)
 */

const axios = require('axios');

// City coordinates database
const CITY_COORDS = {
  paris:      { lat:48.8566, lng:2.3522,   country:'France' },
  london:     { lat:51.5074, lng:-0.1278,  country:'UK' },
  amsterdam:  { lat:52.3676, lng:4.9041,   country:'Netherlands' },
  berlin:     { lat:52.5200, lng:13.4050,  country:'Germany' },
  rome:       { lat:41.9028, lng:12.4964,  country:'Italy' },
  barcelona:  { lat:41.3851, lng:2.1734,   country:'Spain' },
  madrid:     { lat:40.4168, lng:-3.7038,  country:'Spain' },
  vienna:     { lat:48.2082, lng:16.3738,  country:'Austria' },
  prague:     { lat:50.0755, lng:14.4378,  country:'Czechia' },
  lisbon:     { lat:38.7223, lng:-9.1393,  country:'Portugal' },
  brussels:   { lat:50.8503, lng:4.3517,   country:'Belgium' },
  milan:      { lat:45.4642, lng:9.1900,   country:'Italy' },
  zurich:     { lat:47.3769, lng:8.5417,   country:'Switzerland' },
  munich:     { lat:48.1351, lng:11.5820,  country:'Germany' },
  frankfurt:  { lat:50.1109, lng:8.6821,   country:'Germany' },
  dubai:      { lat:25.2048, lng:55.2708,  country:'UAE' },
  abu_dhabi:  { lat:24.4539, lng:54.3773,  country:'UAE' },
  istanbul:   { lat:41.0082, lng:28.9784,  country:'Turkey' },
  athens:     { lat:37.9838, lng:23.7275,  country:'Greece' },
  delhi:      { lat:28.7041, lng:77.1025,  country:'India' },
  mumbai:     { lat:19.0760, lng:72.8777,  country:'India' },
  bangalore:  { lat:12.9716, lng:77.5946,  country:'India' },
  goa:        { lat:15.2993, lng:74.1240,  country:'India' },
  hyderabad:  { lat:17.3850, lng:78.4867,  country:'India' },
  jaipur:     { lat:26.9124, lng:75.7873,  country:'India' },
  agra:       { lat:27.1767, lng:78.0081,  country:'India' },
  varanasi:   { lat:25.3176, lng:82.9739,  country:'India' },
  chennai:    { lat:13.0827, lng:80.2707,  country:'India' },
  kolkata:    { lat:22.5726, lng:88.3639,  country:'India' },
  bangkok:    { lat:13.7563, lng:100.5018, country:'Thailand' },
  'chiang mai':{ lat:18.7883, lng:98.9853, country:'Thailand' },
  phuket:     { lat:7.8804, lng:98.3923,   country:'Thailand' },
  singapore:  { lat:1.3521, lng:103.8198,  country:'Singapore' },
  kuala_lumpur:{ lat:3.1390, lng:101.6869, country:'Malaysia' },
  tokyo:      { lat:35.6762, lng:139.6503, country:'Japan' },
  kyoto:      { lat:35.0116, lng:135.7681, country:'Japan' },
  osaka:      { lat:34.6937, lng:135.5023, country:'Japan' },
  hiroshima:  { lat:34.3853, lng:132.4553, country:'Japan' },
  seoul:      { lat:37.5665, lng:126.9780, country:'South Korea' },
  beijing:    { lat:39.9042, lng:116.4074, country:'China' },
  shanghai:   { lat:31.2304, lng:121.4737, country:'China' },
  'new york': { lat:40.7128, lng:-74.0060, country:'USA' },
  'los angeles':{ lat:34.0522, lng:-118.2437, country:'USA' },
  miami:      { lat:25.7617, lng:-80.1918,  country:'USA' },
  chicago:    { lat:41.8781, lng:-87.6298,  country:'USA' },
  'las vegas':{ lat:36.1699, lng:-115.1398, country:'USA' },
  'san francisco':{ lat:37.7749, lng:-122.4194, country:'USA' },
  sydney:     { lat:-33.8688, lng:151.2093, country:'Australia' },
  melbourne:  { lat:-37.8136, lng:144.9631, country:'Australia' },
  cairo:      { lat:30.0444, lng:31.2357,   country:'Egypt' },
  nairobi:    { lat:-1.2921, lng:36.8219,   country:'Kenya' },
  cape_town:  { lat:-33.9249, lng:18.4241,  country:'South Africa' },
  bali:       { lat:-8.3405, lng:115.0920,  country:'Indonesia' },
  maldives:   { lat:3.2028, lng:73.2207,    country:'Maldives' },
  iceland:    { lat:64.1355, lng:-21.8954,  country:'Iceland' },
  santorini:  { lat:36.3932, lng:25.4615,   country:'Greece' },
  reykjavik:  { lat:64.1355, lng:-21.8954,  country:'Iceland' },
};

function getCityCoords(city) {
  const key = city.toLowerCase().trim().replace(/\s+/g, '_');
  return CITY_COORDS[key] || CITY_COORDS[city.toLowerCase()] || null;
}

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Get driving route from OSRM (free public API, no key needed)
async function getOSRMRoute(originCoords, destCoords) {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson&steps=false`;
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data.code !== 'Ok') return null;
    const route = res.data.routes[0];
    return {
      distance_km: Math.round(route.distance / 1000),
      duration_hours: Math.round(route.duration / 3600 * 10) / 10,
      duration_text: formatDuration(route.duration),
      geometry: route.geometry, // GeoJSON LineString
    };
  } catch(e) {
    console.error('[OSRM]', e.message);
    return null;
  }
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// Generate a curved flight path between two coordinates
function generateFlightPath(orig, dest, numPoints = 50) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Bezier curve with an elevated midpoint for arc effect
    const lat = orig.lat * (1-t) + dest.lat * t + Math.sin(Math.PI * t) * 5;
    const lng = orig.lng * (1-t) + dest.lng * t;
    points.push([lng, lat]);
  }
  return { type: 'LineString', coordinates: points };
}

// ── Main Route Function ─────────────────────────────────────
async function getRoute(originCity, destinationCity) {
  const origCoords = getCityCoords(originCity);
  const destCoords = getCityCoords(destinationCity);

  if (!origCoords || !destCoords) {
    return { canDrive: false, error: 'Coordinates not found for one or both cities.' };
  }

  const distKm = haversineKm(origCoords.lat, origCoords.lng, destCoords.lat, destCoords.lng);
  const DRIVE_THRESHOLD_KM = 1500; // Only offer driving for <1500km

  // Check if same country (more likely drivable)
  const sameCountry = origCoords.country === destCoords.country;

  let driveRoute = null;
  let canDrive = distKm < DRIVE_THRESHOLD_KM && sameCountry;

  if (canDrive) {
    driveRoute = await getOSRMRoute(origCoords, destCoords);
    if (!driveRoute) {
      // Estimate if OSRM fails
      driveRoute = {
        distance_km: Math.round(distKm * 1.3),
        duration_hours: Math.round(distKm * 1.3 / 80 * 10) / 10,
        duration_text: formatDuration(distKm * 1.3 / 80 * 3600),
        geometry: generateStraightPath(origCoords, destCoords),
      };
    }
  }

  // Flight path (always provided as fallback)
  const flightPath = generateFlightPath(origCoords, destCoords);
  const flightHours = Math.round(distKm / 800 * 10) / 10;

  return {
    origin:      { city: originCity, ...origCoords },
    destination: { city: destinationCity, ...destCoords },
    distance_km: Math.round(distKm),
    canDrive,
    sameCountry,
    drive: canDrive ? driveRoute : null,
    flight: {
      distance_km: Math.round(distKm),
      duration_text: `${Math.floor(flightHours)}h ${Math.round((flightHours%1)*60)}m`,
      geometry: flightPath,
      type: 'arc',
    },
    mapBounds: {
      sw: { lat: Math.min(origCoords.lat, destCoords.lat) - 2, lng: Math.min(origCoords.lng, destCoords.lng) - 2 },
      ne: { lat: Math.max(origCoords.lat, destCoords.lat) + 2, lng: Math.max(origCoords.lng, destCoords.lng) + 2 },
    },
  };
}

function generateStraightPath(orig, dest) {
  return {
    type: 'LineString',
    coordinates: [[orig.lng, orig.lat], [dest.lng, dest.lat]],
  };
}

module.exports = { getRoute, getCityCoords, haversineKm };
