/**
 * Specialty Engines for Pandit AI (Phases 6 - 13)
 */

export function calculateLoveEngine(astroData) {
  if (!astroData) return { loveScore: 50, relationshipStrength: "Samanya", reunionPotential: "Sanyam rakhein", soulmatePotential: "Samanya", loveWindows: ["Agle 1 saal me"] };
  
  const houses = astroData.houses || {};
  const mahadasha = astroData.mahadasha || "";
  const antardasha = astroData.antardasha || "";

  const venusHouse = houses.Venus || 1;
  const moonHouse = houses.Moon || 1;
  const jupHouse = houses.Jupiter || 1;
  const rahuHouse = houses.Rahu || 1;
  const saturnHouse = houses.Saturn || 1;

  let score = 55;

  // 5th and 7th houses occupants or lords
  if ([5, 7].includes(venusHouse)) score += 15;
  if ([5, 7].includes(moonHouse)) score += 10;
  if ([5, 7].includes(jupHouse)) score += 10;

  // Kendra/Kona placement for Venus/Moon
  if ([1, 4, 7, 10, 5, 9].includes(venusHouse)) score += 10;
  if ([1, 4, 7, 10, 5, 9].includes(moonHouse)) score += 5;

  // Malefic influence in 5th/7th
  if ([5, 7].includes(rahuHouse)) score -= 15;
  if ([5, 7].includes(saturnHouse)) score -= 10;

  // Dasha check
  if (mahadasha === "Venus" || antardasha === "Venus") score += 10;
  if (mahadasha === "Moon" || antardasha === "Moon") score += 5;

  score = Math.max(10, Math.min(98, score));

  let relationshipStrength = "Thoda utaar-chadaav wala rishta";
  if (score >= 75) relationshipStrength = "Kaafi mazboot aur gahra sambandh";
  else if (score >= 50) relationshipStrength = "Acha rishta hai, aapsi samajh badhane ki zarurat";

  let reunionPotential = "Dhairya rakhein, pehle aapsi matbhed door karein";
  if (score >= 70) reunionPotential = "Anukul yog hain, sanyam se baat ban sakti hai";
  else if (score >= 50) reunionPotential = "Kuch samay baad koshish karein";

  let soulmatePotential = "Samanya aakarshan";
  if (score >= 75) soulmatePotential = "Uchha sambhavna (Soulmate connection)";

  let dateWindow = "2026-11";
  if (astroData.antardashaEnd) {
    const parts = astroData.antardashaEnd.split('/');
    if (parts.length === 2) {
      dateWindow = `${parts[1]}-${parts[0].padStart(2, '0')}`;
    }
  }

  return {
    loveScore: score,
    relationshipStrength,
    reunionPotential,
    soulmatePotential,
    loveWindows: [formatDateNatural(dateWindow)]
  };
}

export function calculateMoneyEngine(astroData) {
  if (!astroData) return { wealthScore: 50, incomePotential: "Samanya", savingsPotential: "Bachat karein", wealthWindows: ["Agle 1 saal me"] };
  
  const houses = astroData.houses || {};
  const mahadasha = astroData.mahadasha || "";
  const antardasha = astroData.antardasha || "";

  const jupHouse = houses.Jupiter || 1;
  const venusHouse = houses.Venus || 1;
  const sunHouse = houses.Sun || 1;
  const rahuHouse = houses.Rahu || 1;
  const saturnHouse = houses.Saturn || 1;

  let score = 50;

  // Dhan yoga indicator (Jupiter/Venus in 2/11/5/9)
  if ([2, 11, 5, 9].includes(jupHouse)) score += 15;
  if ([2, 11, 5, 9].includes(venusHouse)) score += 10;
  if ([1, 4, 7, 10].includes(jupHouse)) score += 10;

  // Malefic placements in 2nd/11th/12th
  if ([2, 11, 12].includes(rahuHouse)) score -= 10;
  if ([2, 12].includes(saturnHouse)) score -= 5;

  // Dasha
  if (mahadasha === "Jupiter" || antardasha === "Jupiter") score += 10;
  if (mahadasha === "Venus" || antardasha === "Venus") score += 10;

  score = Math.max(10, Math.min(99, score));

  let incomePotential = "Mehnat ke baad hi sthirta aayegi";
  if (score >= 75) incomePotential = "Bahut achhi aamdani aur arthik unnati";
  else if (score >= 50) incomePotential = "Aamdani samanya se achhi rahegi";

  let savingsPotential = "Bachat me thodi pareshani ho sakti hai";
  if (score >= 70) savingsPotential = "Achhi bachat aur dhansanchay ke yog";
  else if (score >= 50) savingsPotential = "Kharch par niyantran rakhne se bachat hogi";

  let dateWindow = "2026-11";
  if (astroData.antardashaEnd) {
    const parts = astroData.antardashaEnd.split('/');
    if (parts.length === 2) {
      dateWindow = `${parts[1]}-${parts[0].padStart(2, '0')}`;
    }
  }

  return {
    wealthScore: score,
    incomePotential,
    savingsPotential,
    wealthWindows: [formatDateNatural(dateWindow)]
  };
}

export function calculateDailyTransitEngine(astroData, dayOfWeekStr) {
  const dayOfWeek = dayOfWeekStr || new Date().toLocaleDateString('hi-IN', { weekday: 'long' });
  
  // Use a hash of lagna + day of week to make it deterministic
  const lagna = astroData?.lagna || "Mesh";
  const seed = (lagna.length + dayOfWeek.length) % 10;
  
  let score = 65 + (seed % 4) * 5; // 65, 70, 75, 80
  
  let mood = "Utsahpurna aur sakaratmak";
  if (score < 70) mood = "Man me thodi vyakulata aur chinta";
  else if (score < 80) mood = "Samanya aur santulit mood";

  let work = "Kam me safalta aur naye avsar";
  if (score < 70) work = "Naye kaam me dheemi pragati";
  
  let money = "Samanya bachat aur niyamit aamdani";
  if (score >= 80) money = "Achanak dhan labh ke yog";

  let relationships = "Aapasi samanjasya bana rahega";
  if (score < 70) relationships = "Vivad se bachein, sanyam rakhein";

  let caution = "Naye nivesh se bachein";
  if (dayOfWeek.includes("शनि") || dayOfWeek.toLowerCase().includes("sat")) caution = "Vahan chalate samay savdhani rakhein";
  else if (dayOfWeek.includes("मंगल") || dayOfWeek.toLowerCase().includes("tue")) caution = "Gusse aur jaldbazi se bachein";

  return {
    todayScore: score,
    mood,
    work,
    money,
    relationships,
    caution
  };
}

export function calculateHealthEngine(astroData) {
  // KEEP HEALTH PREDICTIONS STRICTLY CONSERVATIVE
  if (!astroData) return { vitalityScore: 75, stressLevel: "Samanya", recoveryPotential: "Achha", healthGuidance: "Pratidin yoga aur santulit aahar lein." };

  const houses = astroData.houses || {};
  const mahadasha = astroData.mahadasha || "";

  const saturnHouse = houses.Saturn || 1;
  const marsHouse = houses.Mars || 1;
  const moonHouse = houses.Moon || 1;

  let score = 75; // Default safe high vitality

  // Modest adjustments only
  if ([6, 8, 12].includes(saturnHouse)) score -= 5;
  if ([6, 8, 12].includes(marsHouse)) score -= 5;
  if ([6, 8, 12].includes(moonHouse)) score -= 5;
  
  // Mahadasha
  if (mahadasha === "Saturn" || mahadasha === "Mars") score -= 5;

  score = Math.max(50, Math.min(90, score)); // Strict clamp to prevent low scare scores

  let stressLevel = "Samanya aur niyantrit";
  if (score < 65) stressLevel = "Thoda dhyan dene ki zarurat";

  let recoveryPotential = "Achha swasthya laabh";
  if (score < 65) recoveryPotential = "Dheere-dheere sudhaar";

  return {
    vitalityScore: score,
    stressLevel,
    recoveryPotential,
    healthGuidance: "Pratidin yoga aur dhyan karein. Santulit aahar lein aur physician ki salah anusar chalein."
  };
}

export function calculateForeignTravelEngine(astroData) {
  if (!astroData) return { foreignTravelPotential: "Samanya", settlementPotential: "Mehnat se yog", travelWindows: ["2027 ke beech"] };

  const houses = astroData.houses || {};
  const mahadasha = astroData.mahadasha || "";
  const antardasha = astroData.antardasha || "";

  const rahuHouse = houses.Rahu || 1;
  const jupHouse = houses.Jupiter || 1;

  let travelChance = 50;

  if ([9, 12, 3].includes(rahuHouse)) travelChance += 25;
  if ([9, 12, 3].includes(jupHouse)) travelChance += 15;

  if (mahadasha === "Rahu" || antardasha === "Rahu") travelChance += 10;

  let foreignTravelPotential = "Thodi deri ke baad yog banenge";
  if (travelChance >= 75) foreignTravelPotential = "Videsh yatra ke prabal yog hain";
  else if (travelChance >= 60) foreignTravelPotential = "Yatra ke anukul avsar milenge";

  let settlementPotential = "Keval yatra ke yog hain";
  if (travelChance >= 75) settlementPotential = "Videsh me settlement ki achhi sambhavna hai";
  else if (travelChance >= 60) settlementPotential = "Mehnat ke baad sthayi yog banenge";

  let dateWindow = "2026-11";
  if (astroData.antardashaEnd) {
    const parts = astroData.antardashaEnd.split('/');
    if (parts.length === 2) {
      dateWindow = `${parts[1]}-${parts[0].padStart(2, '0')}`;
    }
  }

  return {
    foreignTravelPotential,
    settlementPotential,
    travelWindows: [formatDateNatural(dateWindow)]
  };
}

export function calculateChildrenEngine(astroData) {
  if (!astroData) return { childrenPotential: "Samanya", familyGrowth: "Samanya", childWindows: ["Agle 2 saal me"] };

  const houses = astroData.houses || {};
  const jupHouse = houses.Jupiter || 1;
  const moonHouse = houses.Moon || 1;

  let score = 55;

  if ([5, 9, 11].includes(jupHouse)) score += 20;
  if ([5, 9, 11].includes(moonHouse)) score += 10;

  let childrenPotential = "Mehnat aur upay se safalta milegi";
  if (score >= 75) childrenPotential = "Santan sukh ke prabal yog hain";
  else if (score >= 60) childrenPotential = "Anukul yog ban rahe hain";

  let familyGrowth = "Nayi shuruaat aur khushi ke yog";
  if (score < 60) familyGrowth = "Dheemi pragati rahegi";

  let dateWindow = "2026-11";
  if (astroData.antardashaEnd) {
    const parts = astroData.antardashaEnd.split('/');
    if (parts.length === 2) {
      dateWindow = `${parts[1]}-${parts[0].padStart(2, '0')}`;
    }
  }

  return {
    childrenPotential,
    familyGrowth,
    childWindows: [formatDateNatural(dateWindow)]
  };
}

export function getDreamMeaning(question) {
  const q = (question || '').toLowerCase();
  
  if (q.includes("saanp") || q.includes("snake")) {
    return {
      symbol: "saanp (snake)",
      meaning: "Badlav aur roopantaran (Transformation)",
      description: "Sapne me saanp dekhna jeevan me kisi bade badlav aur shakti ke jagrat hone ka sanket hota hai."
    };
  }
  if (q.includes("mandir") || q.includes("temple")) {
    return {
      symbol: "mandir (temple)",
      meaning: "Aadhyatmikta aur shanti (Spirituality)",
      description: "Sapne me mandir dekhna aapki aadhyatmik unnati, man ki shanti aur ishwar ki kripa ka prateek hai."
    };
  }
  if (q.includes("paani") || q.includes("water")) {
    return {
      symbol: "paani (water)",
      meaning: "Bhavnaon ka pravah (Emotions)",
      description: "Sapne me saaf paani dekhna bhavnatmak shanti ka aur ganda paani dekhna man ke kalesh ka sanket hai."
    };
  }
  if (q.includes("shivling")) {
    return {
      symbol: "shivling",
      meaning: "Shubh shuruaat aur shakti",
      description: "Sapne me shivling dekhna bholenath ki kripa ka aur nayi shuruaat ka prateek hai."
    };
  }

  return {
    symbol: "samanya sapna",
    meaning: "Avachetan man ke vichar",
    description: "Yeh sapna aapke avachetan man me chal rahe vicharon aur chintaon ko darshata hai."
  };
}

export function getSpiritualGuidance(question, lagna) {
  const q = (question || '').toLowerCase();

  // Nazar query
  if (/nazar|negative/i.test(q)) {
    return {
      remedyType: "nazar",
      mantra: "Om Hanumate Namah ka jaap karein.",
      daan: "Gareeb ko kaale til daan karein.",
      pooja: "Hanuman Chalisa ka paath karein.",
      dhyan: "Apne isht dev ka dhyan dharein."
    };
  }
  // Bhoot query
  if (/bhoot|pret/i.test(q)) {
    return {
      remedyType: "bhoot",
      mantra: "Mahamrityunjaya Mantra ka jaap karein.",
      daan: "Bejubaano ko bhojan dein.",
      pooja: "Lord Shiva ki pooja karein.",
      dhyan: "Sakaratmak vichar rakhein."
    };
  }
  // Kala jadu query
  if (/kala jadu/i.test(q)) {
    return {
      remedyType: "kala_jadu",
      mantra: "Om Namah Shivaya ka jaap karein.",
      daan: "Kutte ko roti khilayein.",
      pooja: "Hanuman Chalisa ka paath karein aur dhoop lagayein.",
      dhyan: "Dhyan lagayein aur man ko shant rakhein."
    };
  }

  // Default / Isht Dev query based on Lagna
  let ishtDev = "Vishnu ji aur Shiva ji";
  const normalizedLagna = (lagna || '').toLowerCase().trim();
  if (normalizedLagna === "mesh" || normalizedLagna === "vrishchik") ishtDev = "Hanuman ji / Kartikeya";
  else if (normalizedLagna === "vrishabh" || normalizedLagna === "tula") ishtDev = "Durga Devi / Lakshmi ji";
  else if (normalizedLagna === "mithun" || normalizedLagna === "kanya") ishtDev = "Ganesh ji";
  else if (normalizedLagna === "kark") ishtDev = "Lord Shiva";
  else if (normalizedLagna === "simha") ishtDev = "Surya Dev / Vishnu ji";
  else if (normalizedLagna === "dhanu" || normalizedLagna === "meen") ishtDev = "Vishnu ji / Shiva ji";
  else if (normalizedLagna === "makar" || normalizedLagna === "kumbh") ishtDev = "Shani Dev / Hanuman ji";

  return {
    remedyType: "spiritual_guidance",
    ishtDev,
    mantra: "Om Namo Bhagavate Vasudevaya ka jaap karein.",
    daan: "Mata-pita ka aashirwad lein aur sakaratmak sochein.",
    pooja: "Apne isht dev ki aarti karein.",
    dhyan: "Aankhein band karke dhyan lagayein."
  };
}

// Helpers
function formatDateNatural(dateStr) {
  if (!dateStr || dateStr === "N/A") return "anukul samay me";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const parts = dateStr.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${year} ke beech`;
    }
  }
  return dateStr;
}
