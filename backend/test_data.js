require('dotenv').config();
const { getFlights } = require('./services/flightDataService');
const { getHotels } = require('./services/hotelDataService');

async function test() {
  console.log('\n=== FLIGHTS: Delhi → London ===');
  const fd = await getFlights('Delhi', 'London', null);
  console.log('isEstimated:', fd.isEstimated);
  fd.flights.slice(0, 2).forEach(f => {
    console.log(`  ${f.airlineName} (${f.airline}) | ${f.price ? '$' + f.price : 'no price'} | ${f.duration} | ${f.stopLabel} | dep: ${f.departure} | arr: ${f.arrival}`);
  });

  console.log('\n=== HOTELS: Goa (mid-range) ===');
  const hd = await getHotels('Goa', null, null, 'mid-range');
  console.log('isEstimated:', hd.isEstimated);
  hd.hotels.slice(0, 3).forEach(h => {
    console.log(`  ${h.name} | $${h.price} | ${h.stars}★ | ${h.area}`);
  });

  console.log('\n=== HOTELS: Unknown city "Jaipur" ===');
  const hd2 = await getHotels('Jaipur', null, null, 'mid-range');
  console.log('isEstimated:', hd2.isEstimated);
  hd2.hotels.slice(0, 3).forEach(h => {
    console.log(`  ${h.name} | $${h.price}`);
  });
}
test().catch(e => console.error('Test error:', e.message));
