import { getAstrologyData } from '../src/utils/astroEngine.js';

async function main() {
  const result = await getAstrologyData({
    dob: '1990-08-31',
    tob: '12:50 PM',
    pob: 'Hamirpur Himachal Pradesh'
  });
  console.log('Astrology Calculation Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
