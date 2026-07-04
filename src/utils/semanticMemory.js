import { generateAIResponse } from '../../services/aiService.js';

export const FACT_PATH_MAP = {
  wifeAlive: 'relationship.wifeAlive',
  spouseStatus: 'relationship.spouseStatus',
  relationshipStatus: 'relationship.relationshipStatus',
  girlfriendStatus: 'relationship.girlfriendStatus',
  spouseName: 'relationship.spouseName',
  childrenCount: 'family.childrenCount',
  childrenNames: 'family.childrenNames',
  occupation: 'career.occupation',
  targetExam: 'career.targetExam',
  previousTargetExam: 'career.previousTargetExam',
  dreamJob: 'career.dreamJob',
  age: 'career.age',
  financialStatus: 'finance.status',
  healthIssues: 'health.issues',
  healthConcerns: 'health.concerns',
  awaitingClarification: 'relationship.awaitingClarification',
  clarificationType: 'relationship.clarificationType'
};

/**
 * Retrieves a fact from memory by path, supporting flat/nested lookups.
 */
export function getFact(factMemory, path) {
  if (!factMemory) return null;
  
  const mappedPath = FACT_PATH_MAP[path] || path;
  const root = factMemory.facts || factMemory;
  const parts = mappedPath.split('.');
  let current = root;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      current = null;
      break;
    }
    current = current[part];
  }
  
  if (current !== null && current !== undefined) {
    return current;
  }
  
  if (parts.length > 1) {
    const flatKey = parts[parts.length - 1];
    if (factMemory[flatKey] !== undefined && factMemory[flatKey] !== null) {
      return factMemory[flatKey];
    }
  }
  
  if (factMemory[path] !== undefined && factMemory[path] !== null) {
    return factMemory[path];
  }
  
  return null;
}

/**
 * Sets a fact in memory by path, synchronizing nested and flat layouts.
 */
export function setFact(factMemory, path, value) {
  if (!factMemory) return;
  if (!factMemory.facts) {
    factMemory.facts = {};
  }
  
  const mappedPath = FACT_PATH_MAP[path] || path;
  const parts = mappedPath.split('.');
  let current = factMemory.facts;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
  
  // Backward compatibility: store flat on root
  factMemory[lastPart] = value;
  
  // Synchronize spouse status fields
  if (lastPart === 'wifeAlive' && value === false) {
    factMemory.spouseStatus = 'deceased';
    if (!factMemory.facts.relationship) factMemory.facts.relationship = {};
    factMemory.facts.relationship.spouseStatus = 'deceased';
  }
  if (lastPart === 'spouseStatus' && value === 'deceased') {
    factMemory.wifeAlive = false;
    if (!factMemory.facts.relationship) factMemory.facts.relationship = {};
    factMemory.facts.relationship.wifeAlive = false;
  }
}

/**
 * Automatically migrates flat/legacy documents to canonical V2 nested schema with array history.
 */
export function migrateFactMemory(docData) {
  if (!docData) {
    return { facts: {}, history: [], version: 2, updatedAt: new Date().toISOString() };
  }
  
  let migrated = { ...docData };
  if (!migrated.facts) {
    migrated.facts = {};
  }
  
  // Set up categories if missing
  const relationship = {
    wifeAlive: docData.wifeAlive !== undefined ? docData.wifeAlive : null,
    spouseStatus: docData.spouseStatus || null,
    relationshipStatus: docData.relationshipStatus || null,
    girlfriendStatus: docData.girlfriendStatus || null,
    spouseName: docData.spouseName || null,
    awaitingClarification: docData.awaitingClarification !== undefined ? docData.awaitingClarification : null,
    clarificationType: docData.clarificationType || null,
    ...(docData.relationship || {}),
    ...(migrated.facts.relationship || {})
  };

  const family = {
    childrenCount: docData.childrenCount !== undefined ? docData.childrenCount : null,
    childrenNames: docData.childrenNames || [],
    ...(docData.family || {}),
    ...(migrated.facts.family || {})
  };

  const career = {
    occupation: docData.occupation || null,
    targetExam: docData.targetExam || null,
    previousTargetExam: docData.previousTargetExam || null,
    dreamJob: docData.dreamJob || null,
    age: docData.age || null,
    ...(docData.career || {}),
    ...(migrated.facts.career || {})
  };

  const finance = {
    status: docData.financialStatus || null,
    ...(docData.finance || {}),
    ...(migrated.facts.finance || {})
  };

  const health = {
    issues: docData.healthIssues || (docData.healthConcerns ? ["general"] : []),
    ...(docData.health || {}),
    ...(migrated.facts.health || {})
  };

  migrated.facts = {
    relationship,
    family,
    career,
    finance,
    health
  };

  // Convert legacy object history to array history
  let historyArray = [];
  if (docData.history) {
    if (Array.isArray(docData.history)) {
      historyArray = [...docData.history];
    } else {
      for (const [field, entry] of Object.entries(docData.history)) {
        historyArray.push({
          field,
          previous: entry.previousValue !== undefined ? entry.previousValue : entry.previous,
          current: entry.newValue !== undefined ? entry.newValue : entry.current,
          confidence: entry.confidence !== undefined ? entry.confidence : 1.0,
          updatedAt: entry.updatedAt || new Date().toISOString()
        });
      }
    }
  }
  migrated.history = historyArray;
  migrated.version = 2;
  migrated.updatedAt = docData.updatedAt || new Date().toISOString();

  // Ensure root level has flat copies
  migrated.wifeAlive = relationship.wifeAlive;
  migrated.spouseStatus = relationship.spouseStatus;
  migrated.relationshipStatus = relationship.relationshipStatus;
  migrated.girlfriendStatus = relationship.girlfriendStatus;
  migrated.spouseName = relationship.spouseName;
  migrated.awaitingClarification = relationship.awaitingClarification;
  migrated.clarificationType = relationship.clarificationType;
  migrated.childrenCount = family.childrenCount;
  migrated.childrenNames = family.childrenNames;
  migrated.occupation = career.occupation;
  migrated.targetExam = career.targetExam;
  migrated.previousTargetExam = career.previousTargetExam;
  migrated.dreamJob = career.dreamJob;
  migrated.age = career.age;
  migrated.financialStatus = finance.status;
  migrated.healthIssues = health.issues;

  return migrated;
}

/**
 * Extracts structured facts from the user's question, existing facts, and user profile.
 */
export async function extractSemanticFacts({ question, existingFacts, userProfile }) {
  const schema = {
    "relationship": {
      "wifeAlive": null,
      "relationshipStatus": null,
      "girlfriendStatus": null,
      "spouseName": null
    },
    "family": {
      "childrenCount": null,
      "childrenNames": []
    },
    "career": {
      "occupation": null,
      "targetExam": null,
      "dreamJob": null
    },
    "finance": {
      "status": null
    },
    "health": {
      "issues": []
    },
    "confidence": 0.0
  };

  const prompt = `Extract ONLY structured facts from the user's question, existing facts, and user profile.
Never predict.
Never answer the user.
Return JSON only.
If unknown use null (or empty array for names/issues).

Inputs:
Latest Question: "${question || ''}"
Existing Facts: ${JSON.stringify(existingFacts || {})}
User Profile: ${JSON.stringify(userProfile || {})}

Schema:
${JSON.stringify(schema, null, 2)}

Return JSON only.`;

  try {
    const rawResponse = await generateAIResponse(prompt, { purpose: "semantic-memory", jsonMode: true });
    if (!rawResponse) {
      return { ...schema, confidence: 0.0 };
    }

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      console.warn("WARNING: Semantic extraction returned invalid JSON. Falling back to {}.", error);
      parsed = {};
    }

    return {
      relationship: {
        wifeAlive: parsed.relationship?.wifeAlive !== undefined ? parsed.relationship.wifeAlive : null,
        relationshipStatus: parsed.relationship?.relationshipStatus || null,
        girlfriendStatus: parsed.relationship?.girlfriendStatus || null,
        spouseName: parsed.relationship?.spouseName || null,
      },
      family: {
        childrenCount: parsed.family?.childrenCount !== undefined ? parsed.family.childrenCount : null,
        childrenNames: parsed.family?.childrenNames || [],
      },
      career: {
        occupation: parsed.career?.occupation || null,
        targetExam: parsed.career?.targetExam || null,
        dreamJob: parsed.career?.dreamJob || null,
      },
      finance: {
        status: parsed.finance?.status || null,
      },
      health: {
        issues: parsed.health?.issues || [],
      },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.0
    };
  } catch (error) {
    console.error("Semantic extraction failed:", error);
    return { ...schema, confidence: 0.0 };
  }
}

/**
 * Merges newly extracted semantic facts into existing facts, tracking history in an array.
 */
export function mergeSemanticFacts(existingFacts = {}, semanticFacts = {}) {
  // Automatically migrate existingFacts first
  const migrated = migrateFactMemory(existingFacts);

  // Map semantic categories to flat values for updates
  const flatExtracted = {};

  if (semanticFacts.relationship) {
    if (semanticFacts.relationship.wifeAlive !== null && semanticFacts.relationship.wifeAlive !== undefined) {
      flatExtracted.wifeAlive = semanticFacts.relationship.wifeAlive;
    }
    if (semanticFacts.relationship.relationshipStatus) {
      flatExtracted.relationshipStatus = semanticFacts.relationship.relationshipStatus;
    }
    if (semanticFacts.relationship.girlfriendStatus) {
      flatExtracted.girlfriendStatus = semanticFacts.relationship.girlfriendStatus;
    }
    if (semanticFacts.relationship.spouseName) {
      flatExtracted.spouseName = semanticFacts.relationship.spouseName;
    }
  }

  if (semanticFacts.family) {
    if (semanticFacts.family.childrenCount !== null && semanticFacts.family.childrenCount !== undefined) {
      flatExtracted.childrenCount = semanticFacts.family.childrenCount;
    }
    if (semanticFacts.family.childrenNames && semanticFacts.family.childrenNames.length > 0) {
      flatExtracted.childrenNames = semanticFacts.family.childrenNames;
    }
  }

  if (semanticFacts.career) {
    if (semanticFacts.career.occupation) {
      flatExtracted.occupation = semanticFacts.career.occupation;
    }
    if (semanticFacts.career.targetExam) {
      flatExtracted.targetExam = semanticFacts.career.targetExam;
      const oldExam = getFact(migrated, 'career.targetExam');
      if (oldExam && oldExam !== semanticFacts.career.targetExam) {
        flatExtracted.previousTargetExam = oldExam;
      }
    }
    if (semanticFacts.career.dreamJob) {
      flatExtracted.dreamJob = semanticFacts.career.dreamJob;
    }
  }

  if (semanticFacts.finance) {
    if (semanticFacts.finance.status) {
      flatExtracted.financialStatus = semanticFacts.finance.status;
    }
  }

  if (semanticFacts.health) {
    if (semanticFacts.health.issues && semanticFacts.health.issues.length > 0) {
      flatExtracted.healthConcerns = true;
      flatExtracted.healthIssues = semanticFacts.health.issues;
    }
  }

  const confidence = typeof semanticFacts.confidence === 'number' ? semanticFacts.confidence : 0.95;
  const history = [...(migrated.history || [])];

  for (const [key, newVal] of Object.entries(flatExtracted)) {
    if (newVal === null || newVal === undefined) {
      continue;
    }

    const oldVal = getFact(migrated, key);
    if (oldVal !== undefined && oldVal !== null && oldVal !== newVal) {
      // Get the most recent confidence from history array for this specific field
      const fieldHistory = history.filter(h => h.field === key);
      const oldConfidence = fieldHistory.length > 0 ? fieldHistory[fieldHistory.length - 1].confidence : 0.80;
      
      if (confidence >= oldConfidence) {
        setFact(migrated, key, newVal);
        history.push({
          field: key,
          previous: oldVal,
          current: newVal,
          confidence,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      setFact(migrated, key, newVal);
    }
  }

  migrated.history = history;
  migrated.updatedAt = new Date().toISOString();

  // Run final re-migration to align both flat and nested schemas
  return migrateFactMemory(migrated);
}

/**
 * Sanitizes the fact memory to prevent memory fact poisoning (production hardening).
 */
export function sanitizeFactMemory(facts) {
  if (!facts || typeof facts !== 'object') {
    console.log("FACT_SANITIZED");
    return {};
  }

  const whitelist = new Set([
    'wifeAlive',
    'wifeName',
    'spouseName',
    'childrenCount',
    'childrenNames',
    'relationshipStatus',
    'girlfriendStatus',
    'occupation',
    'targetExam',
    'previousTargetExam',
    'dreamJob',
    'financialStatus',
    'healthIssues',
    'healthConcerns',
    'spouseStatus',
    'age',
    'city',
    'awaitingClarification',
    'clarificationType'
  ]);

  const approvedCategories = new Set([
    'relationship',
    'family',
    'career',
    'finance',
    'health'
  ]);

  function sanitize(obj, isRoot = false, parentKey = null) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'function') {
      console.log("FACT_REJECTED");
      return null;
    }

    if (Array.isArray(obj)) {
      const arr = obj.slice(0, 10).map(item => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
        }
        if (item && typeof item === 'object') {
          return sanitize(item, false, null);
        }
        return item;
      });
      return arr;
    }

    if (typeof obj === 'object') {
      const sanitizedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        // Prototype pollution check
        if (key === '__proto__' || key === 'constructor' || key === 'prototype' ||
            key.includes('proto') || key.includes('constructor') || key.includes('prototype')) {
          console.log("FACT_REJECTED");
          continue;
        }

        // Reject functions
        if (typeof value === 'function') {
          console.log("FACT_REJECTED");
          continue;
        }

        if (isRoot) {
          if (key === 'history') {
            if (Array.isArray(value)) {
              sanitizedObj.history = value.slice(0, 100).map(h => {
                if (h && typeof h === 'object') {
                  const cleanH = {};
                  for (const [hk, hv] of Object.entries(h)) {
                    if (hk === '__proto__' || hk === 'constructor' || hk === 'prototype') continue;
                    if (typeof hv === 'function') continue;
                    if (typeof hv === 'string') {
                      const trimmed = hv.trim();
                      cleanH[hk] = trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
                    } else {
                      cleanH[hk] = hv;
                    }
                  }
                  return cleanH;
                }
                return h;
              });
            }
            continue;
          }
          if (key === 'version') {
            sanitizedObj.version = value;
            continue;
          }
          if (key === 'updatedAt') {
            if (typeof value === 'string') {
              sanitizedObj.updatedAt = value.trim().slice(0, 100);
            } else {
              sanitizedObj.updatedAt = value;
            }
            continue;
          }

          if (key === 'facts') {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              sanitizedObj.facts = {};
              for (const [catKey, catValue] of Object.entries(value)) {
                if (catKey === '__proto__' || catKey === 'constructor' || catKey === 'prototype') continue;
                if (approvedCategories.has(catKey)) {
                  sanitizedObj.facts[catKey] = sanitize(catValue, false, catKey);
                } else {
                  console.log("FACT_REJECTED");
                }
              }
            }
            continue;
          }

          if (whitelist.has(key)) {
            const sanitizedVal = sanitizeValue(key, value);
            if (sanitizedVal !== undefined) {
              sanitizedObj[key] = sanitizedVal;
            }
          } else {
            console.log("FACT_REJECTED");
          }
        } else {
          let isKeyAllowed = false;
          if (whitelist.has(key)) {
            isKeyAllowed = true;
          } else {
            if (parentKey === 'finance' && key === 'status') isKeyAllowed = true;
            if (parentKey === 'health' && (key === 'issues' || key === 'concerns')) isKeyAllowed = true;
            if (parentKey === 'relationship' && key === 'spouseName') isKeyAllowed = true;
          }

          if (isKeyAllowed) {
            const sanitizedVal = sanitizeValue(key, value);
            if (sanitizedVal !== undefined) {
              sanitizedObj[key] = sanitizedVal;
            }
          } else {
            console.log("FACT_REJECTED");
          }
        }
      }
      return sanitizedObj;
    }

    return obj;
  }

  function sanitizeValue(key, val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'function') {
      console.log("FACT_REJECTED");
      return null;
    }

    if (key === 'childrenCount') {
      const parsedInt = parseInt(val, 10);
      if (!isNaN(parsedInt) && Number.isInteger(parsedInt) && parsedInt >= 0 && parsedInt <= 20) {
        return parsedInt;
      }
      console.log("FACT_REJECTED");
      return null;
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
    }

    if (Array.isArray(val)) {
      return val.slice(0, 10).map(item => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
        }
        return item;
      });
    }

    if (typeof val === 'object') {
      console.log("FACT_REJECTED");
      return null;
    }

    return val;
  }

  const result = sanitize(facts, true);
  console.log("FACT_SANITIZED");
  return result;
}
