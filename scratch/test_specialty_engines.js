import { getAstrologyData } from '../src/utils/astroEngine.js';
import { calculateLoveEngine, calculateMoneyEngine } from '../src/utils/specialtyEngines.js';

async function main() {
  const astroData = await getAstrologyData({
    dob: '1990-08-31',
    tob: '12:50 PM',
    pob: 'Hamirpur Himachal Pradesh'
  });
  const love = calculateLoveEngine(astroData);
  const money = calculateMoneyEngine(astroData);
  console.log('Love Engine:', JSON.stringify(love, null, 2));
  console.log('Money Engine:', JSON.stringify(money, null, 2));
}

main().catch(console.error);
