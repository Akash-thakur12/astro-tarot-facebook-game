import { safeParseMemoryState, mergeRecommendationMemory } from '../api/services/memoryStateParser.js';

const tests = [
  { name: "1. Valid JSON", data: '{"advisedCareer": "Software Engineer", "discouragedPaths": ["Trading"]}' },
  { name: "2. Missing quotes", data: '{advisedCareer: Fashion, discouragedPaths: [Art]}' },
  { name: "3. Trailing commas", data: '{"advisedCareer": "Doctor", "discouragedPaths": ["Law",],}' },
  { name: "4. Plain text value", data: 'Fashion Designing' },
  { name: "5. Empty object", data: 'None' },
  { name: "6. Nested invalid object", data: '{"advisedCareer": {"nested": 123}, "advisedBusiness": 123}' },
  { name: "7. Large discouragedPaths array", data: '{"discouragedPaths": ["A", "B", "C", "D", 123, "E"]}' },
  { name: "8. Completely corrupted output", data: '{"advisedCareer": "Fashion" : : [}' }
];

for (const t of tests) {
  console.log(`\n--- Test: ${t.name} ---`);
  console.log(`Input: ${t.data}`);
  const parsed = safeParseMemoryState(t.data);
  console.log(`Output: ${JSON.stringify(parsed, null, 2)}`);
}
