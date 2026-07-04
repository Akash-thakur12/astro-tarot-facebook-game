/**
 * Detects the core intent of a user's astrology question.
 * Supports Hindi (Hinglish/Devanagari) and English keywords.
 * Includes broad generic intents and specific subcategories.
 * 
 * @param {string} question - The user's question.
 * @returns {string} One of the classified intents.
 */
export function detectIntent(question) {
  if (!question || typeof question !== 'string') {
    return 'general';
  }
  
  const q = question.toLowerCase().trim();

  // --- 1. MARRIAGE & RELATIONSHIPS ---
  
  // Arrange Marriage (specific)
  if (
    q.includes('arrange marriage') ||
    q.includes('arranged marriage') ||
    q.includes('arrange vivah') ||
    q.includes('parivar ki pasand') ||
    q.includes('ghar walo ki pasand') ||
    q.includes('अरेंज मैरिज') ||
    q.includes('अरेंज्ड मैरिज')
  ) {
    return 'arranged_marriage';
  }

  // Love Marriage (specific)
  if (
    q.includes('love marriage') ||
    q.includes('prem vivah') ||
    q.includes('prem shaadi') ||
    q.includes('prem shadi') ||
    q.includes('pasand ki shadi') ||
    q.includes('pasand ki shaadi') ||
    q.includes('लव मैरिज') ||
    q.includes('प्रेम विवाह') ||
    (q.includes('love') && (q.includes('shadi') || q.includes('shaadi') || q.includes('vivah') || q.includes('marriage')))
  ) {
    return 'love_marriage';
  }

  // Second Marriage (specific)
  if (
    q.includes('second marriage') ||
    q.includes('dobara shadi') ||
    q.includes('dobara shaadi') ||
    q.includes('dusri shadi') ||
    q.includes('dusri shaadi') ||
    q.includes('doosri shadi') ||
    q.includes('doosri shaadi') ||
    q.includes('दूसरी शादी') ||
    q.includes('दोबारा शादी')
  ) {
    return 'second_marriage';
  }

  // Breakup (specific)
  if (
    q.includes('breakup') ||
    q.includes('break up') ||
    q.includes('break-up') ||
    q.includes('rishta toot') ||
    q.includes('shadi toot') ||
    q.includes('alag ho') ||
    q.includes('ब्रेकअप') ||
    q.includes('रिश्ता टूट')
  ) {
    return 'breakup';
  }

  // Ex Back (specific)
  if (
    q.includes('ex back') ||
    q.includes('ex wapas') ||
    q.includes('ex vapas') ||
    q.includes('wapis') ||
    q.includes('bapis') ||
    q.includes('wapis aegi') ||
    q.includes('bapis aegi') ||
    q.includes('patchup') ||
    q.includes('patch-up') ||
    q.includes('patch up') ||
    q.includes('purana pyar') ||
    q.includes('ex boyfriend') ||
    q.includes('ex girlfriend') ||
    q.includes('ex bf') ||
    q.includes('ex gf') ||
    q.includes('एक्स वापस') ||
    q.includes('पुराना प्यार')
  ) {
    return 'ex_back';
  }

  // Partner Loyal (specific)
  if (
    q.includes('loyal') ||
    q.includes('loyalty') ||
    q.includes('cheat') ||
    q.includes('dhokha') ||
    q.includes('dhoka') ||
    q.includes('wafadar') ||
    q.includes('vafadar') ||
    q.includes('धोखा') ||
    q.includes('वफादार')
  ) {
    return 'partner_loyal';
  }

  // Child When (specific)
  if (
    q.includes('child') ||
    q.includes('baby') ||
    q.includes('pregnancy') ||
    q.includes('pregnant') ||
    q.includes('bachha') ||
    q.includes('bachhe') ||
    q.includes('bacha') ||
    q.includes('santan') ||
    q.includes('santana') ||
    q.includes('संतान') ||
    q.includes('बच्चा') ||
    q.includes('बच्चे')
  ) {
    return 'child_when';
  }

  // Marriage When (generic fallback)
  if (
    q.includes('marriage') ||
    q.includes('shadi') ||
    q.includes('shaadi') ||
    q.includes('vivah') ||
    q.includes('biyaah') ||
    q.includes('biyah') ||
    q.includes('शादी') ||
    q.includes('विवाह') ||
    q.includes('ब्याह')
  ) {
    return 'marriage_when';
  }

  // --- 2. CAREER & JOBS ---

  // Government Job (specific)
  if (
    q.includes('sarkari naukri') ||
    q.includes('sarkari job') ||
    q.includes('govt job') ||
    q.includes('government job') ||
    q.includes('gov job') ||
    q.includes('सरकारी नौकरी') ||
    q.includes('सकारी जॉब')
  ) {
    return 'government_job';
  }

  // Promotion (specific)
  if (
    q.includes('promotion') ||
    q.includes('padonnati') ||
    q.includes('tarakki') ||
    q.includes('increment') ||
    q.includes('प्रमोशन') ||
    q.includes('पदोन्नति') ||
    q.includes('तरक्की')
  ) {
    return 'promotion';
  }

  // Salary (specific)
  if (
    q.includes('salary') ||
    q.includes('income') ||
    q.includes('vetan') ||
    q.includes('tankha') ||
    q.includes('tanha') ||
    q.includes('salary badhegi') ||
    q.includes('वेतन') ||
    q.includes('सैलरी') ||
    q.includes('तनख्वाह')
  ) {
    return 'salary';
  }

  // Job Change (specific)
  if (
    q.includes('job change') ||
    q.includes('change job') ||
    q.includes('naukri badal') ||
    q.includes('job badal') ||
    q.includes('जॉब चेंज') ||
    q.includes('नौकरी बदलना')
  ) {
    return 'job_change';
  }

  // Career Field (specific)
  if (
    q.includes('career field') ||
    q.includes('stream choice') ||
    q.includes('subject choose') ||
    q.includes('study field') ||
    q.includes('field choose') ||
    q.includes('करियर फील्ड') ||
    q.includes('कौन सा सब्जेक्ट')
  ) {
    return 'career_field';
  }

  // Unemployment (specific)
  if (
    q.includes('unemployed') ||
    q.includes('unemployment') ||
    q.includes('job loss') ||
    q.includes('naukri chhut') ||
    q.includes('berozgar') ||
    q.includes('berozgari') ||
    q.includes('बेरोजगार') ||
    q.includes('बेरोजगारी') ||
    q.includes('नौकरी छूट')
  ) {
    return 'unemployment';
  }

  // Job (generic fallback)
  if (
    q.includes('naukri') ||
    q.includes('naukari') ||
    q.includes('job') ||
    q.includes('service') ||
    q.includes('placement') ||
    q.includes('interview') ||
    q.includes('नौकरी') ||
    q.includes('जॉब')
  ) {
    return 'job';
  }

  // --- 3. BUSINESS & PROPERTY ---

  // Startup (specific)
  if (
    q.includes('startup') ||
    q.includes('new venture') ||
    q.includes('naya business') ||
    q.includes('naya vyapar') ||
    q.includes('naya kaam') ||
    q.includes('स्टार्टअप') ||
    q.includes('नया काम')
  ) {
    return 'startup';
  }

  // Investment (specific)
  if (
    q.includes('investment') ||
    q.includes('invest') ||
    q.includes('share market') ||
    q.includes('stock') ||
    q.includes('invest money') ||
    q.includes('निवेश') ||
    q.includes('इन्वेस्टमेंट')
  ) {
    return 'investment';
  }

  // Debt (specific)
  if (
    q.includes('debt') ||
    q.includes('loan') ||
    q.includes('karz') ||
    q.includes('karza') ||
    q.includes('udhaar') ||
    q.includes('udhar') ||
    q.includes('कर्ज') ||
    q.includes('उधार') ||
    q.includes('लोन') ||
    q.includes('कर्जा')
  ) {
    return 'debt';
  }

  // Property (specific)
  if (
    q.includes('property') ||
    q.includes('zameen') ||
    q.includes('land') ||
    q.includes('plot') ||
    q.includes('jaydad') ||
    q.includes('संपत्ति') ||
    q.includes('जमीन') ||
    q.includes('प्लॉट')
  ) {
    return 'property';
  }

  // House Purchase (specific)
  if (
    q.includes('house purchase') ||
    q.includes('buy home') ||
    q.includes('buy house') ||
    q.includes('naya ghar') ||
    q.includes('naya makan') ||
    q.includes('नया घर') ||
    q.includes('मकान खरीदना')
  ) {
    return 'house_purchase';
  }

  // Business (generic fallback)
  if (
    q.includes('business') ||
    q.includes('vyapar') ||
    q.includes('dhandha') ||
    q.includes('dhanda') ||
    q.includes('trade') ||
    q.includes('vyapaar') ||
    q.includes('shop') ||
    q.includes('dukaan') ||
    q.includes('dukan') ||
    q.includes('व्यापार') ||
    q.includes('बिज़नेस') ||
    q.includes('धंधा') ||
    q.includes('दुकान')
  ) {
    return 'business';
  }

  // Money (generic fallback)
  if (
    q.includes('paise') ||
    q.includes('paisa') ||
    q.includes('money') ||
    q.includes('dhan') ||
    q.includes('laxmi') ||
    q.includes('amir') ||
    q.includes('ameer') ||
    q.includes('wealth') ||
    q.includes('rupay') ||
    q.includes('rupee') ||
    q.includes('पैसा') ||
    q.includes('पैसे') ||
    q.includes('धन') ||
    q.includes('अमीर')
  ) {
    return 'money';
  }

  // --- 4. FOREIGN TRAVEL ---

  // Foreign Settlement (specific)
  if (
    q.includes('foreign settlement') ||
    q.includes('settle abroad') ||
    q.includes('videsh me settle') ||
    q.includes('videsh basna') ||
    q.includes('videsh me basna') ||
    q.includes('विदेश में बसना') ||
    q.includes('विदेश सेटलमेंट')
  ) {
    return 'foreign_settlement';
  }

  // Visa (specific)
  if (
    q.includes('visa') ||
    q.includes('visa status') ||
    q.includes('वीजा') ||
    q.includes('विज़ा')
  ) {
    return 'visa';
  }

  // Foreign Travel (specific)
  if (
    q.includes('foreign travel') ||
    q.includes('travel abroad') ||
    q.includes('videsh yatra') ||
    q.includes('videsh ghumna') ||
    q.includes('विदेश यात्रा') ||
    q.includes('विदेश घूमना')
  ) {
    return 'foreign_travel';
  }

  // Foreign (generic fallback)
  if (
    q.includes('foreign') ||
    q.includes('videsh') ||
    q.includes('abroad') ||
    q.includes('travel') ||
    q.includes('passport') ||
    q.includes('green card') ||
    q.includes('विदेश')
  ) {
    return 'foreign';
  }

  // --- 5. HEALTH & MENTAL STATUS ---

  // Mental Stress (specific)
  if (
    q.includes('mental stress') ||
    q.includes('depression') ||
    q.includes('anxiety') ||
    q.includes('tension') ||
    q.includes('chinta') ||
    q.includes('stress') ||
    q.includes('manasik tanav') ||
    q.includes('मानसिक तनाव') ||
    q.includes('चिंता') ||
    q.includes('डिप्रेशन')
  ) {
    return 'mental_stress';
  }

  // Family Health (specific)
  if (
    q.includes('parents health') ||
    q.includes('family health') ||
    q.includes('mummy health') ||
    q.includes('papa health') ||
    q.includes('parivar ka swasthya') ||
    q.includes('परिवार का स्वास्थ्य')
  ) {
    return 'family_health';
  }

  // Health (generic fallback)
  if (
    q.includes('health') ||
    q.includes('bimari') ||
    q.includes('beemari') ||
    q.includes('sehat') ||
    q.includes('illness') ||
    q.includes('disease') ||
    q.includes('swasthya') ||
    q.includes('operation') ||
    q.includes('cure') ||
    q.includes('doctor') ||
    q.includes('ill') ||
    q.includes('sick') ||
    q.includes('स्वास्थ्य') ||
    q.includes('बीमारी') ||
    q.includes('सेहत')
  ) {
    return 'health';
  }

  // --- 6. ASTROLOGICAL DOSHAS & REMEDIES ---

  // Sade Sati
  if (
    q.includes('sade sati') ||
    q.includes('sadesati') ||
    q.includes('shani dasha') ||
    q.includes('साढ़े साती') ||
    q.includes('साढ़े साती') ||
    q.includes('शनि की ढैया')
  ) {
    return 'sade_sati';
  }

  // Rahu
  if (
    q.includes('rahu') ||
    q.includes('rahu mahadasha') ||
    q.includes('rahu dasha') ||
    q.includes('राहु')
  ) {
    return 'rahu';
  }

  // Ketu
  if (
    q.includes('ketu') ||
    q.includes('ketu mahadasha') ||
    q.includes('ketu dasha') ||
    q.includes('केतु')
  ) {
    return 'ketu';
  }

  // Kaalsarp
  if (
    q.includes('kaalsarp') ||
    q.includes('kaal sarp') ||
    q.includes('kalsarp') ||
    q.includes('कालसर्प दोष') ||
    q.includes('कालसर्प')
  ) {
    return 'kaalsarp';
  }

  // Gemstone
  if (
    q.includes('gemstone') ||
    q.includes('rashi ratna') ||
    q.includes('ring') ||
    q.includes('panna') ||
    q.includes('neelam') ||
    q.includes('pukhraj') ||
    q.includes('ratna') ||
    q.includes('रत्न') ||
    q.includes('अंगूठी')
  ) {
    return 'gemstone';
  }

  // Evil Eye
  if (
    q.includes('evil eye') ||
    q.includes('nazar dosh') ||
    q.includes('buri nazar') ||
    q.includes('buri najar') ||
    q.includes('नजर दोष') ||
    q.includes('बुरी नजर')
  ) {
    return 'evil_eye';
  }

  // Simple Remedy
  if (
    q.includes('simple remedy') ||
    q.includes('remedy') ||
    q.includes('upay') ||
    q.includes('nivaran') ||
    q.includes('upaya') ||
    q.includes('chhutkara') ||
    q.includes('उपाय') ||
    q.includes('निवारण')
  ) {
    return 'simple_remedy';
  }

  // --- 7. GENERIC FALLBACKS ---

  // Education
  if (
    q.includes('education') ||
    q.includes('padhai') ||
    q.includes('study') ||
    q.includes('exam') ||
    q.includes('board') ||
    q.includes('college') ||
    q.includes('school') ||
    q.includes('result') ||
    q.includes('pass') ||
    q.includes('fail') ||
    q.includes('degree') ||
    q.includes('marks') ||
    q.includes('university') ||
    q.includes('पढ़ाई') ||
    q.includes('परीक्षा') ||
    q.includes('एग्जाम')
  ) {
    return 'education';
  }

  // Family
  if (
    q.includes('family') ||
    q.includes('parivar') ||
    q.includes('mata') ||
    q.includes('pita') ||
    q.includes('parent') ||
    q.includes('bhai') ||
    q.includes('behen') ||
    q.includes('bacha') ||
    q.includes('bacche') ||
    q.includes('child') ||
    q.includes('son') ||
    q.includes('daughter') ||
    q.includes('ghar') ||
    q.includes('mother') ||
    q.includes('father') ||
    q.includes('brother') ||
    q.includes('sister') ||
    q.includes('wife') ||
    q.includes('husband') ||
    q.includes('patni') ||
    q.includes('pati') ||
    q.includes('परिवार') ||
    q.includes('माता') ||
    q.includes('पिता') ||
    q.includes('भाई') ||
    q.includes('बहन') ||
    q.includes('बच्चे') ||
    q.includes('घर')
  ) {
    return 'family';
  }

  // Career (broad generic fallback)
  if (
    q.includes('career') ||
    q.includes('bhavishya') ||
    q.includes('future') ||
    q.includes('destiny') ||
    q.includes('bhagya') ||
    q.includes('kismat') ||
    q.includes('star') ||
    q.includes('grah') ||
    q.includes('kundali') ||
    q.includes('kundli') ||
    q.includes('करियर') ||
    q.includes('भविष्य') ||
    q.includes('भाग्य') ||
    q.includes('कुंडली')
  ) {
    return 'career';
  }

  return 'general';
}
