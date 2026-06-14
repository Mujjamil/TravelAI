require('dotenv').config();
const { getFlights } = require('./services/flightDataService');
const { getHotels } = require('./services/hotelDataService');

async function test() {
  console.log('--- Testing Flight Service ---');
  try {
    const flightRes = await getFlights('Delhi', 'London', '2025-06-15');
    console.log('isEstimated:', flightRes.isEstimated);
    console.log('Number of flights:', flightRes.flights?.length);
    if (flightRes.flights && flightRes.flights.length > 0) {
      console.log('Sample Flight:', flightRes.flights[0]);
    }
  } catch (err) {
    console.error('Flight error:', err);
  }

  console.log('\n--- Testing Hotel Service ---');
  try {
    const hotelRes = await getHotels('London', '2025-06-15', '2025-06-20', 'mid-range');
    console.log('isEstimated:', hotelRes.isEstimated);
    console.log('Number of hotels:', hotelRes.hotels?.length);
    if (hotelRes.hotels && hotelRes.hotels.length > 0) {
      console.log('Sample Hotel:', hotelRes.hotels[0]);
    }
  } catch (err) {
    console.error('Hotel error:', err);
  }
}

test();
