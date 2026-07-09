export function safeParseMemoryState(rawText) {
  const result = {
    success: false,
    memoryState: {
      recommendationMemory: {
        advisedCareer: null,
        advisedBusiness: null,
        discouragedPaths: [],
        lastPrediction: null,
        lastRemedy: null,
        lastTimeline: null,
        importantFacts: []
      },
      debug_info: {
        confidenceScore: null
      }
    },
    error: null
  };

  if (!rawText || typeof rawText !== 'string') {
    result.error = "Input is empty or not a string";
    console.error("MEMORY_STATE_PARSE_FAILED: " + result.error);
    return result;
  }

  let text = rawText.trim();
  
  if (text.toLowerCase() === 'none' || text === '') {
    result.success = true;
    return result;
  }

  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch (e) {
    let repairedText = text;

    // Case B: Remove trailing commas
    repairedText = repairedText.replace(/,\s*([\]}])/g, '$1');

    // Case A: Missing quotes around keys
    repairedText = repairedText.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    // Fix single quotes to double quotes
    repairedText = repairedText.replace(/'/g, '"');

    // Missing quotes around string values (simple heuristic for words)
    repairedText = repairedText.replace(/:\s*([a-zA-Z0-9_\s\-]+?)\s*([,}])/g, ':"$1"$2');
    // Missing quotes around array string items
    repairedText = repairedText.replace(/\[\s*([a-zA-Z0-9_\s\-]+?)\s*\]/g, '["$1"]');

    try {
      parsed = JSON.parse(repairedText);
      console.log("MEMORY_STATE_REPAIRED");
    } catch (e2) {
      // Case D: Plain text fallback
      if (!text.includes('{')) {
        parsed = {
          advisedCareer: text,
          advisedBusiness: text,
          lastPrediction: text,
          lastRemedy: text,
          lastTimeline: text
        };
        console.log("MEMORY_STATE_REPAIRED (Plain text fallback)");
      } else {
        result.error = "Unrecoverable JSON format: " + e2.message;
        console.error("MEMORY_STATE_PARSE_FAILED: " + result.error);
        return result;
      }
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    let schemaFixed = false;

    // advisedCareer
    if (parsed.advisedCareer !== undefined) {
      if (typeof parsed.advisedCareer === 'string') {
        result.memoryState.recommendationMemory.advisedCareer = parsed.advisedCareer;
      } else {
        schemaFixed = true;
      }
    }

    // advisedBusiness
    if (parsed.advisedBusiness !== undefined) {
      if (typeof parsed.advisedBusiness === 'string') {
        result.memoryState.recommendationMemory.advisedBusiness = parsed.advisedBusiness;
      } else {
        schemaFixed = true;
      }
    }

    // lastPrediction
    if (parsed.lastPrediction !== undefined) {
      if (typeof parsed.lastPrediction === 'string') {
        result.memoryState.recommendationMemory.lastPrediction = parsed.lastPrediction;
      } else {
        schemaFixed = true;
      }
    }

    // lastRemedy
    if (parsed.lastRemedy !== undefined) {
      if (typeof parsed.lastRemedy === 'string') {
        result.memoryState.recommendationMemory.lastRemedy = parsed.lastRemedy;
      } else {
        schemaFixed = true;
      }
    }

    // lastTimeline
    if (parsed.lastTimeline !== undefined) {
      if (typeof parsed.lastTimeline === 'string') {
        result.memoryState.recommendationMemory.lastTimeline = parsed.lastTimeline;
      } else {
        schemaFixed = true;
      }
    }
    
    // discouragedPaths
    if (parsed.discouragedPaths !== undefined) {
      if (Array.isArray(parsed.discouragedPaths)) {
        const validPaths = parsed.discouragedPaths.filter(p => typeof p === 'string');
        if (validPaths.length !== parsed.discouragedPaths.length) schemaFixed = true;
        result.memoryState.recommendationMemory.discouragedPaths = validPaths;
      } else if (typeof parsed.discouragedPaths === 'string') {
        result.memoryState.recommendationMemory.discouragedPaths = [parsed.discouragedPaths];
        schemaFixed = true;
      } else {
        schemaFixed = true;
      }
    }

    // importantFacts
    if (parsed.importantFacts !== undefined) {
      if (Array.isArray(parsed.importantFacts)) {
        const validFacts = parsed.importantFacts.filter(f => typeof f === 'string');
        if (validFacts.length !== parsed.importantFacts.length) schemaFixed = true;
        result.memoryState.recommendationMemory.importantFacts = validFacts;
      } else if (typeof parsed.importantFacts === 'string') {
        result.memoryState.recommendationMemory.importantFacts = [parsed.importantFacts];
        schemaFixed = true;
      } else {
        schemaFixed = true;
      }
    }

    // confidenceScore
    if (parsed.confidenceScore !== undefined) {
      let scoreVal = parseFloat(parsed.confidenceScore);
      if (!isNaN(scoreVal)) {
        scoreVal = Math.max(0.0, Math.min(100.0, scoreVal)); // Clamp between 0.0 and 100.0
        result.memoryState.debug_info.confidenceScore = scoreVal;
        if (scoreVal !== parsed.confidenceScore) schemaFixed = true;
      } else {
        schemaFixed = true;
      }
    }
    
    result.success = true;
    
    if (schemaFixed) {
      console.log("MEMORY_STATE_SCHEMA_FIXED");
    }
    console.log("MEMORY_STATE_PARSED", JSON.stringify(result.memoryState));
  } else {
    result.error = "Parsed result is not an object";
    console.error("MEMORY_STATE_PARSE_FAILED: " + result.error);
  }

  return result;
}

export function mergeRecommendationMemory(existingMemory, newMemory) {
  if (!existingMemory) existingMemory = {};
  if (!newMemory) newMemory = {};

  const merged = {
    advisedCareer: newMemory.advisedCareer || existingMemory.advisedCareer || null,
    advisedBusiness: newMemory.advisedBusiness || existingMemory.advisedBusiness || null,
    lastPrediction: newMemory.lastPrediction || existingMemory.lastPrediction || null,
    lastRemedy: newMemory.lastRemedy || existingMemory.lastRemedy || null,
    lastTimeline: newMemory.lastTimeline || existingMemory.lastTimeline || null,
    discouragedPaths: [...(existingMemory.discouragedPaths || [])],
    importantFacts: [...(existingMemory.importantFacts || [])]
  };

  if (Array.isArray(newMemory.discouragedPaths)) {
    for (const path of newMemory.discouragedPaths) {
      if (!merged.discouragedPaths.includes(path)) {
        merged.discouragedPaths.push(path);
      }
    }
  }

  if (Array.isArray(newMemory.importantFacts)) {
    for (const fact of newMemory.importantFacts) {
      if (!merged.importantFacts.includes(fact)) {
        merged.importantFacts.push(fact);
      }
    }
  }
  
  return merged;
}
