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
        return "कुंडली के योग";
      } else {
        return "सितारे";
      }
    }
    return match;
  });
}

// New structured response components with variable layouts to avoid repeating same structure
export function buildStructuredResponse(data, seed) {
  const observation = data.observation || "";
  const reasoning = data.reasoning || "";
  const prediction = data.prediction || "";
  const timeline = data.timeline || "";
  const remedy = data.remedy || "";
  const insight = data.insight || "";
  const followup = data.followup || "";

  const openingsList = [
    "आपके जन्मांग चक्र का गहरा अध्ययन करने पर,",
    "कुंडली के सूक्ष्म संकेत बताते हैं कि,",
    "ग्रहों के वर्तमान प्रभाव को देखने पर,",
    "नवांश और गोचर दोनों के संकेतों को मिलाकर देखें तो,",
    "आपके ग्रह चक्र की दशाओं की गणना करने पर,",
    "आपके मुख्य ग्रहों के वर्तमान संकेत यह दर्शाते हैं कि,",
    "जन्म चक्र और गोचरीय संक्रमण के प्रभाव से,",
    "आपके लग्न और कुंडली के योगों के अनुसार,",
    "आपकी कुंडली के विभिन्न योगों का विश्लेषण करने पर,",
    "अभी आपके ग्रहों के प्रभाव को देखें तो,",
    "आपके जन्मांग और भाग्य स्थान का आकलन करने पर,",
    "ग्रहों की गति और गोचर संतुलन को समझने पर,",
    "आपके लग्न चक्र और महादशा के प्रभाव को देखें तो,",
    "दशा चक्र के सूक्ष्म योगों का अध्ययन करने पर,",
    "आपके राशि स्वामी और लग्नेश के वर्तमान संकेतों के अनुसार,",
    "आपके ग्रहों के वर्तमान गोचरीय प्रभाव को समझने पर,",
    "जन्मांग के पारिवारिक और विवाह स्थान के विश्लेषण से,",
    "कुंडली के योगों का सूक्ष्म अध्ययन करने पर,",
    "आपके कर्म और भाग्य स्थान की स्थिति को देखते हुए,",
    "राशिफल और दशाओं के वर्तमान तालमेल के अनुसार,",
    "आपके जन्मांग चक्र के ग्रहों का आकलन करने पर,",
    "ग्रहों की इस वर्तमान गोचर व्यवस्था के अनुसार,"
  ];

  const opening = pick(seed, openingsList);
  const finalObservation = observation ? (opening + " " + observation) : "";

  // Deterministically choose a layout structure to avoid repetition
  const structureMode = Math.abs(seed) % 3;
  let parts = [];

  if (structureMode === 0) {
    // Layout 1: Standard layout
    parts = [
      finalObservation,
      reasoning,
      prediction,
      timeline,
      remedy,
      insight,
      followup
    ];
  } else if (structureMode === 1) {
    // Layout 2: Conversational flow
    const combinedObsReason = finalObservation && reasoning ? `${finalObservation} ${reasoning}` : (finalObservation || reasoning);
    const combinedPredTime = prediction && timeline ? `${prediction} Yeh badlav ${timeline} ke beech dikhega.` : (prediction || timeline);
    parts = [
      combinedObsReason,
      combinedPredTime,
      remedy,
      insight,
      followup
    ];
  } else {
    // Layout 3: Direct prediction first
    parts = [
      prediction ? `Aapki kundali ke anusar: ${prediction}` : "",
      finalObservation,
      remedy,
      insight
    ];
  }

  return parts
    .filter(Boolean)
    .join("\n\n");
}

// deprecated
function getIntentComponents(intent, seed, userData) {
  const openings = [
    "देखते हैं आपकी कुंडली में क्या कहते हैं ग्रह।",
    "आइए आपके जन्म कुंडली की बात करें।",
    "अपनी गहरी दृष्टि से आपकी कुंडली देख रहा हूं।",
    "आपके ग्रहों की स्थिति बता रही हैं कुछ खास।",
    "कुंडली के संकेत आपके भविष्य की कहानी सुनाते हैं।"
  ];

  const opening = pick(seed, openings);

  let reasoning = "", prediction = "", timing = "", remedy = "", curiosity = "";

  // Intent-specific components
  switch (intent) {
    case "marriage_when":
      reasoning = pick(seed + 1, [
        "आपके विवाह स्थान में शुक्र और बृहस्पति का संयोग दिख रहा है जो स्थायी संबंधों को बढ़ाता है।",
        "कुंडली में लग्नेश और सप्तमेश की स्थिति शादी के योग बना रही है।",
        "ग्रहों की चाल बता रही है कि अब संबंधों को लेकर गंभीरता आएगी।"
      ]);
      prediction = pick(seed + 2, [
        "जल्द ही आपको एक ऐसा जीवनसाथी मिलेगा जो आपके साथ हर मुसीबत में खड़ा रहेगा।",
        "संबंधों में अब नई गहराई आएगी और शादी के योग मजबूत बनेंगे।",
        "आपकी शादी का समय आ चुका है और जल्द ही शुभ समाचार मिलेगा।"
      ]);
      timing = pick(seed + 3, [
        "अगले 6 महीने के अंदर ही शादी के योग सबसे मजबूत हैं।",
        "वर्ष के अंत तक या अगले वर्ष की शुरुआत में शुभ समय है।",
        "अगले 12 महीने के भीतर ही शादी का संकेत दिख रहा है।"
      ]);
      remedy = pick(seed + 4, [
        "शुक्रवार को माता लक्ष्मी की पूजा करें और केला चढ़ाएं।",
        "रोजाना सोमवार को शिव जी को जल अर्पित करें।",
        "गुरुवार को बैठकर 108 बार 'ऊं गुरुवे नमः' जाप करें।"
      ]);
      curiosity = pick(seed + 5, [
        "क्या आप प्रेम विवाह या अरेंज्ड विवाह के बारे में और जानना चाहेंगे?",
        "क्या आपको अपने जीवनसाथी के स्वभाव के बारे में और जानकारी चाहिए?",
        "क्या शादी की तिथि के बारे में और विस्तार से जानना चाहेंगे?"
      ]);
      break;
    case "government_job":
      reasoning = pick(seed + 1, [
        "कर्म भाव में सूर्य और शनि की दृष्टि से सरकारी नौकरी के मजबूत योग बन रहे हैं।",
        "दशमेश और कर्मेश का संयोग आपको सरकारी क्षेत्र में सफलता दिलाएगा।",
        "आपकी कुंडली में सरकारी सेवा के लिए शुभ ग्रहों की स्थिति है।"
      ]);
      prediction = pick(seed + 2, [
        "जल्द ही आपको सरकारी नौकरी में चयन मिलेगा और पद पर आप मान-सम्मान पाएंगे।",
        "सरकारी क्षेत्र में आपका भविष्य बहुत उज्ज्वल है और सफलता मिलेगी।",
        "आपके परिश्रम का फल सरकारी नौकरी के रूप में जल्द ही मिलेगा।"
      ]);
      timing = pick(seed + 3, [
        "अगले 3 से 6 महीने के भीतर ही नौकरी के योग मजबूत हैं।",
        "वर्ष के अंत तक आपके लिए सरकारी नौकरी का शुभ समय है।",
        "अगले 1 वर्ष के अंदर ही चयन के योग बनेंगे।"
      ]);
      remedy = pick(seed + 4, [
        "रोजाना सूर्य देव को जल अर्पित करें और 'ऊं घृणि सूर्याय नमः' जाप करें।",
        "शनिवार को शनि देव की पूजा करें और तेल चढ़ाएं।",
        "हर दिन 108 बार 'ऊं भं भानवे नमः' जाप करें।"
      ]);
      curiosity = pick(seed + 5, [
        "क्या आपको सरकारी और प्राइवेट क्षेत्र में कौन सा बेहतर रहेगा, इसके बारे में जानना चाहेंगे?",
        "क्या नौकरी में पदोन्नति के योग के बारे में और जानकारी चाहिए?",
        "क्या आपके कौशल और कौन सा विभाग आपके लिए शुभ है, इसके बारे में जानना चाहेंगे?"
      ]);
      break;
    case "business":
      reasoning = pick(seed + 1, [
        "आपके व्यापार भाव में बुध और गुरु का संयोग लाभ के योग दे रहा है।",
        "लग्नेश और व्यापारेश की स्थिति आपके व्यापार को नई ऊंचाइयों तक ले जाएगी।",
        "ग्रहों की चाल से पता चलता है कि अब व्यापार में विस्तार होने का समय है।"
      ]);
      prediction = pick(seed + 2, [
        "व्यापार में जल्द ही नया ग्राहक जुड़ेंगे और लाभ में वृद्धि होगी।",
        "नया व्यापार संभव है और पुराने व्यापार में भी नई ऊर्जा आएगी।",
        "व्यापार में नई योजनाएं बनाने का समय आ चुका है और सफलता मिलेगी।"
      ]);
      timing = pick(seed + 3, [
        "अगले 6 महीने के भीतर ही व्यापार में बड़ा लाभ हो सकता है।",
        "वर्ष के अंत तक व्यापार में विस्तार के योग मजबूत हैं।",
        "अगले 1 वर्ष के अंदर ही व्यापार की नई शुरुआत हो सकती है।"
      ]);
      remedy = pick(seed + 4, [
        "बुधवार को गणेश जी की पूजा करें और दूर्वा चढ़ाएं।",
        "हर दिन पीपल के पेड़ के नीचे जाकर पानी डालें।",
        "गुरुवार को 108 बार 'ऊं गुरुवे नमः' जाप करें।"
      ]);
      curiosity = pick(seed + 5, [
        "क्या आपको व्यापार में निवेश के शुभ समय के बारे में जानना चाहिए?",
        "क्या व्यापार में साझेदारी आपके लिए अच्छी रहेगी, इसके बारे में जानना चाहेंगे?",
        "क्या आपके लिए कौन सा व्यापार क्षेत्र सबसे लाभदायक है, इसके बारे में जानना चाहेंगे?"
      ]);
      break;
    case "health":
      reasoning = pick(seed + 1, [
        "आपकी कुंडली में छठ्ठा और प्रथम भाव के स्वामी ग्रह स्वास्थ्य के लिए शुभ संकेत दे रहे हैं।",
        "स्वास्थ्य भाव में ग्रहों की स्थिति से पता चलता है कि थोड़ी सावधानी से सब ठीक रहेगा।",
        "आपकी स्वास्थ्य के लिए ग्रहों की चाल मिलकर शुभ संकेत दे रही है।"
      ]);
      prediction = pick(seed + 2, [
        "जल्द ही आपकी स्वास्थ्य में सुधार होगा और आप फिर से ताज़ा महसूस करेंगे।",
        "स्वास्थ्य में कोई बड़ी समस्या नहीं है, बस थोड़ी सावधानी बरतें।",
        "आपकी स्वास्थ्य ग्रहों की कृपा से जल्द ही ठीक हो जाएगा।"
      ]);
      timing = pick(seed + 3, [
        "अगले 2 से 4 महीने के भीतर ही स्वास्थ्य में सुधार के योग हैं।",
        "वर्ष के अंत तक आप पूरी तरह से स्वस्थ और ताज़ा महसूस करेंगे।",
        "अगले 6 महीने में स्वास्थ्य में बहुत सुधार दिखाई देगा।"
      ]);
      remedy = pick(seed + 4, [
        "रोजाना योग और प्राणायाम करें, स्वास्थ्य के लिए बहुत लाभदायक होगा।",
        "ग्रहों को शांत करने के लिए हर दिन सूर्य जी को जल अर्पित करें।",
        "स्वास्थ्य के लिए हर दिन पांच तुलसी के पत्ते खाएं।"
      ]);
      curiosity = pick(seed + 5, [
        "क्या आपको स्वास्थ्य के लिए और उपाय जानने हैं?",
        "क्या आपके आहार के बारे में और जानकारी चाहिए?",
        "क्या आपके लिए कौन सा योग सबसे लाभदायक है, इसके बारे में जानना चाहेंगे?"
      ]);
      break;
    case "child_when":
      reasoning = pick(seed + 1, [
        "आपकी कुंडली में पुत्र भाव में गुरु और चंद्रमा की स्थिति संतान सुख के योग दे रही है।",
        "पुत्रेश और लग्नेश की स्थिति से संतान के योग मजबूत बन रहे हैं।",
        "ग्रहों की चाल से पता चलता है कि अब संतान के योग बनने शुरू हो गए हैं।"
      ]);
      prediction = pick(seed + 2, [
        "जल्द ही आपको संतान सुख मिलेगा और यह आपके जीवन में नई खुशियां लाएगा।",
        "संतान के योग अब मजबूत हो रहे हैं और जल्द ही शुभ समाचार मिलेगा।",
        "आपकी कुंडली में संतान के लिए बहुत ही शुभ समय आ रहा है।"
      ]);
      timing = pick(seed + 3, [
        "अगले 6 महीने से 1 वर्ष के भीतर संतान के योग बनेंगे।",
        "वर्ष के अंत तक या अगले वर्ष की शुरुआत में शुभ समय है।",
        "अगले 18 महीने के अंदर ही संतान सुख मिलने के योग मजबूत हैं।"
      ]);
      remedy = pick(seed + 4, [
        "सोमवार को चंद्रमा जी को अर्घ्य दें और 'ऊं सोमाय नमः' जाप करें।",
        "गुरुवार को माता लक्ष्मी और गणेश जी की पूजा करें।",
        "हर दिन 108 बार 'ऊं कुमाराय नमः' जाप करें।"
      ]);
      curiosity = pick(seed + 5, [
        "क्या आपको पुत्र या कन्या के योग के बारे में और जानना चाहिए?",
        "क्या संतान के भविष्य के बारे में और जानकारी चाहिए?",
        "क्या संतान सुख के लिए और उपाय जानने चाहेंगे?"
      ]);
      break;
    default:
      reasoning = pick(seed + 1, [
        "आपकी कुंडली के ग्रहों की स्थिति सकारात्मक संकेत दे रही है।",
        "ग्रहों की चाल से पता चलता है कि अच्छा समय आने वाला है।",
        "आपके भाग्य के सितारे अब आपके साथ हैं।"
      ]);
      prediction = pick(seed + 2, [
        "जल्द ही आपके जीवन में नई खुशियां और अवसर आएंगे।",
        "आपके जीवन में अब कुछ बदलाव आने वाले हैं जो आपके लिए अच्छे हैं।",
        "भविष्य आपके लिए बहुत ही उज्ज्वल और सफलतापूर्ण दिख रहा है।"
      ]);
      timing = pick(seed + 3, [
        "अगले कुछ ही महीनों में अच्छे समय की शुरुआत होगी।",
        "वर्ष के अंत तक आपके लिए बहुत कुछ शुभ होने वाला है।",
        "अगले 6 महीने के अंदर ही परिस्थितियां आपके अनुकूल होंगी।"
      ]);
      remedy = pick(seed + 4, [
        "हर दिन 108 बार 'ऊं नमः शिवाय' जाप करें।",
        "सोमवार को शिव जी को जल अर्पित करें।",
        "गुरुवार को गणेश जी की पूजा करें।"
      ]);
      curiosity = pick(seed + 5, [
        "क्या आपको किसी खास विषय के बारे में और जानकारी चाहिए?",
        "क्या आप अपने भविष्य के किसी और हिस्से के बारे में जानना चाहेंगे?",
        "क्या और किसी उपाय के बारे में जानना चाहेंगे?"
      ]);
  }

  return {
    opening,
    reasoning,
    prediction,
    timing,
    remedy,
    curiosity
  };
}

export function humanize(text, seed = 1) {
  if (typeof text !== 'string') return text;

  let result = text;

  // BAN THESE PHRASES AND SANITIZE
  if (/व्यापार|बिज़नेस|दुकान|व्यवसाय|partnership/i.test(result)) {
    result = result.replace(/सप्तम भाव/gi, "व्यापार भाव");
  } else {
    result = result.replace(/सप्तम भाव/gi, "विवाह स्थान");
  }
  result = result.replace(/ग्रहों की स्थिति/gi, "ग्रहों के संकेत");
  result = result.replace(/बृहस्पति की कृपा/gi, "बृहस्पति के शुभ प्रभाव");

  // Keep planets/houses limited to maximum of 2
  result = limitPlanetsAndHouses(result);

  // Preserve all original replacements for backward compatibility
  result = result.replace(/ग्रहों का योग/g, () => pick(seed + 1, [
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

  result = result.replace(/ शक्ति शालिनी अंतर्दृष्टि/g, " विशेष समझ");
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

  // Remove repetitive opening phrases
  result = result.replace(/वत्स! तुम्हारे भाग्य के सितारे बहुत ही शुभ संकेत दे रहे हैं\./gi, pick(seed + 50, [
    "देखिए आपके भाग्य के सितारे क्या कहते हैं।",
    "आपके भाग्य के सितारे शुभ संकेत दे रहे हैं।",
    "आपके ग्रहों की स्थिति कुछ खास बता रही है।"
  ]));

  // Warm conversational replacement maps
  result = result.replace(/जातक/gi, "आप");
  result = result.replace(/दाम्पत्य सुख/g, "वैवाहिक सुख");
  result = result.replace(/दाम्पत्य जीवन/g, "वैवाहिक जीवन");
  result = result.replace(/दाम्पत्य/gi, "वैवाहिक जीवन");
  result = result.replace(/का गोचर/g, "की ग्रहों की चाल");
  result = result.replace(/के गोचर/g, "की ग्रहों की चाल");
  result = result.replace(/की गोचर/g, "की ग्रहों की चाल");
  result = result.replace(/गोचर स्थिति/g, "ग्रहों की स्थिति");
  result = result.replace(/गोचर/gi, "ग्रहों की चाल");
  result = result.replace(/वाणी/gi, "बातचीत");
  result = result.replace(/संशय/gi, "उलझन");
  result = result.replace(/शीघ्र/gi, "जल्दी");
  result = result.replace(/अवधि/gi, "समय");
  result = result.replace(/आवश्यक/gi, "ज़रूरी");
  result = result.replace(/विश्वास/gi, "भरोसा");

  // Do NOT always end with a question: strip trailing question 50% of the time based on seed
  if (result.trim().endsWith('?')) {
    const shouldRemoveQuestion = (Math.abs(seed) % 2 === 0);
    if (shouldRemoveQuestion) {
      const sentences = result.split(/(?<=[.?!।|])\s+/);
      if (sentences.length > 1) {
        const lastSentence = sentences[sentences.length - 1];
        if (lastSentence.trim().endsWith('?')) {
          result = sentences.slice(0, -1).join(' ');
        }
      }
    }
  }

  // Word count limit (max 120 words)
  result = limitToWordCount(result, 120);

  return result;
}
