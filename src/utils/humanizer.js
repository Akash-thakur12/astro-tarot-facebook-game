// Word count limiter that trims at a sentence boundary
function limitToWordCount(text, maxWords = 120) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  
  const truncated = words.slice(0, maxWords).join(' ');
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('।'),
    truncated.lastIndexOf('|')
  );
  
  if (lastSentenceEnd > 50) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  return truncated + '...';
}

// Limits excessive mentions of planets and houses to maximum 2
function limitPlanetsAndHouses(text) {
  const jointRegex = /(बृहस्पति|शुक्र|शनि|राहु|केतु|मंगल|बुध|चंद्रमा|सूर्य|लग्न भाव|कर्म भाव|भाग्य भाव|जाया भाव|पुत्र भाव|धन भाव|व्यापार भाव|स्वास्थ्य भाव|चतुर्थ भाव|सप्तम भाव|दशम भाव|सप्तमेश|दशमेश|लग्नेश|कर्मेश|व्यापारेश|पुत्रेश)/g;
  let count = 0;
  return text.replace(jointRegex, (match) => {
    count++;
    if (count > 2) {
      if (match.includes("भाव") || match.includes("ेश")) {
        return "स्थिति";
      } else {
        return "समय";
      }
    }
    return match;
  });
}

// New structured response components with variable layouts to avoid repeating same structure
export function buildStructuredResponse(data, seed) {
  const reasoning = data.reasoning || "";
  const prediction = data.prediction || "";
  const remedy = data.remedy || "";
  const followup = data.followup || "";

  return [
    reasoning,
    prediction,
    remedy,
    followup
  ].filter(Boolean).join(" ");
}

export function humanize(text, seed = 1) {
  if (typeof text !== 'string') return text;

  let result = text;

  // 1. Remove markdown formatting (bold, italics, headers, lists)
  result = result.replace(/\*\*|__/g, ""); // Bold
  result = result.replace(/\*|_/g, "");   // Italics
  result = result.replace(/#+\s+/g, "");  // Headers
  result = result.replace(/^\s*[-*+]\s+/gm, ""); // Bullet points

  // 2. Remove emojis
  result = result.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, "");

  // 3. Keep planets/houses limited to maximum of 2 and replace with neutral simple words, not astrology terms
  result = limitPlanetsAndHouses(result);

  // 4. 80-word cap
  result = limitToWordCount(result, 80);

  // 5. Whitespace cleanup
  result = result.replace(/\s+/g, " ").trim();

  return result;
}
