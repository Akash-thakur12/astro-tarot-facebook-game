/**
 * Deterministic lightweight humanization layer to replace specific Hinglish/formal terms
 * with natural Hindi variations using a seed value to maintain deterministic outputs.
 * 
 * @param {string} text - The input horoscope text.
 * @param {number} seed - The seed to make replacements deterministic.
 * @returns {string} The humanized/cleaned text.
 */
function pick(seed, arr) {
  return arr[Math.abs(seed) % arr.length];
}

export function humanize(text, seed = 1) {
  if (typeof text !== 'string') return text;

  let result = text;

  result = result.replace(/ग्रहों का योग/g, () => pick(seed + 1, [
    "ग्रहों की स्थिति",
    "ग्रहों के संकेत",
    "ग्रहों का प्रभाव"
  ]));

  result = result.replace(/ग्रहों की क्रीड़ा/g, () => pick(seed + 7, [
    "ग्रहों के संकेत",
    "ग्रहों की चाल",
    "ग्रहों का प्रभाव"
  ]));

  result = result.replace(/मिसअंडरस्टैंडिंग/g, "मनमुटाव");

  result = result.replace(/फिजिकल एक्टिविटी/g, () => pick(seed + 13, [
    "व्यायाम",
    "योग और व्यायाम",
    "शारीरिक गतिविधि"
  ]));

  result = result.replace(/शक्तिशाली अंतर्दृष्टि/g, () => pick(seed + 21, [
    "गहरी समझ",
    "महत्वपूर्ण संकेत",
    "विशेष समझ"
  ]));

  result = result.replace(/विशेष रूप से बोधगम्य/g, () => pick(seed + 37, [
    "समझदार",
    "सूझबूझ वाले",
    "विचारशील"
  ]));

  result = result.replace(/रिलेशनशिप/g, () => pick(seed + 43, [
    "रिश्ते",
    "प्रेम संबंध",
    "संबंध"
  ]));

  result = result.replace(/पार्टनर/g, () => pick(seed + 47, [
    "जीवनसाथी",
    "प्रिय व्यक्ति",
    "साथी"
  ]));

  return result;
}
