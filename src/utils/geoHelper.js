import cities from 'all-the-cities';

/**
 * Resolves a city name to latitude, longitude, and timezone offset.
 * Defaults to timezone offset 5.5 (India) if unknown.
 * 
 * @param {string} pob - Place of Birth string (e.g. "Hamirpur Himachal Pradesh")
 * @returns {{lat: number, lng: number, tzOffset: number}}
 */
export function getGeoDetails(pob) {
  // Default values (India central coordinates)
  const defaultRes = { lat: 20.5937, lng: 78.9629, tzOffset: 5.5 };

  if (!pob || typeof pob !== 'string') {
    return defaultRes;
  }

  // Normalize place of birth search terms
  const searchStr = pob.toLowerCase().trim();
  const searchWords = searchStr.split(/[\s,]+/);

  // Search in all-the-cities
  // Priority:
  // 1. Exact match of name (e.g. "hamirpur")
  // 2. City name exists as a word in the pob string
  let matches = [];

  for (const word of searchWords) {
    if (word.length < 3) continue; // skip very short words
    const filtered = cities.filter(c => c.name.toLowerCase() === word);
    if (filtered.length > 0) {
      matches.push(...filtered);
    }
  }

  // If no exact word match, search for substring match
  if (matches.length === 0) {
    for (const word of searchWords) {
      if (word.length < 3) continue;
      const filtered = cities.filter(c => c.name.toLowerCase().includes(word));
      if (filtered.length > 0) {
        matches.push(...filtered);
      }
    }
  }

  if (matches.length === 0) {
    return defaultRes;
  }

  // Sort matches by population descending to get the most prominent city
  matches.sort((a, b) => (b.population || 0) - (a.population || 0));

  const bestCity = matches[0];
  const lng = bestCity.loc.coordinates[0];
  const lat = bestCity.loc.coordinates[1];

  // Derive timezone offset based on longitude (15 degrees = 1 hour)
  // Let's approximate tzOffset. If country is IN, tzOffset is 5.5.
  let tzOffset = 5.5; // default to India
  if (bestCity.country !== 'IN') {
    // simple timezone calculation from longitude: round(longitude / 15 * 2) / 2
    tzOffset = Math.round((lng / 15) * 2) / 2;
  }

  return { lat, lng, tzOffset };
}
