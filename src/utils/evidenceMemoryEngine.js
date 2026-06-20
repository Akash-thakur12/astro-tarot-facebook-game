export function appendEvidence(evidenceList, newEvidence) {
  const list = [...(evidenceList || [])];
  list.push(newEvidence);
  if (list.length > 20) {
    list.shift(); // keep max 20 evidence entries
  }
  return list;
}

export function calculateCurrentValue(evidenceList) {
  if (!evidenceList || evidenceList.length === 0) {
    return null;
  }

  // 1. Latest 3 streak agreement check
  if (evidenceList.length >= 3) {
    const last3 = evidenceList.slice(-3);
    const firstVal = last3[0].value;
    const allSame = last3.every(ev => ev.value === firstVal);
    if (allSame) {
      return firstVal;
    }
  }

  // 2. Fallback to majority rule
  const counts = new Map();
  evidenceList.forEach(ev => {
    const val = ev.value;
    counts.set(val, (counts.get(val) || 0) + 1);
  });

  let maxCount = 0;
  let candidates = [];
  counts.forEach((count, val) => {
    if (count > maxCount) {
      maxCount = count;
      candidates = [val];
    } else if (count === maxCount) {
      candidates.push(val);
    }
  });

  if (candidates.length === 1) {
    return candidates[0];
  }

  // Tie breaker: latest evidence (the last element in the array)
  return evidenceList[evidenceList.length - 1].value;
}

export function calculateReliability(evidenceList, currentValue) {
  if (currentValue === null || currentValue === undefined || !evidenceList || evidenceList.length === 0) {
    return 0;
  }
  const L = evidenceList.length;
  let totalWeight = 0;
  let supportingWeight = 0;

  for (let j = 0; j < L; j++) {
    const diff = L - 1 - j;
    let weight = 1;
    if (diff === 0) weight = 5;
    else if (diff === 1) weight = 4;
    else if (diff === 2) weight = 3;
    else if (diff === 3) weight = 2;

    totalWeight += weight;
    if (evidenceList[j].value === currentValue) {
      supportingWeight += weight;
    }
  }

  return Math.round((supportingWeight / totalWeight) * 100);
}

export function calculateConfidenceTrend(evidenceList, currentValue) {
  if (!evidenceList || evidenceList.length <= 1 || currentValue === null || currentValue === undefined) {
    return "stable";
  }

  const overallRel = calculateReliability(evidenceList, currentValue);
  
  const recentList = evidenceList.slice(-5);
  const recentRel = calculateReliability(recentList, currentValue);

  if (recentRel > overallRel) {
    return "strengthening";
  } else if (recentRel < overallRel) {
    return "weakening";
  } else {
    return "stable";
  }
}

export function migrateOldMemory(oldState) {
  const keys = ["married", "hasChildren", "hasJob", "hasBusiness", "gender"];
  const migrated = {};
  const now = Date.now();

  keys.forEach(key => {
    const field = oldState?.[key];
    if (field && Array.isArray(field.evidence)) {
      const currentValue = field.currentValue !== undefined ? field.currentValue : null;
      const evidence = field.evidence;
      const supportCount = evidence.filter(ev => ev.value === currentValue).length;
      const contradictionCount = evidence.filter(ev => ev.value !== currentValue).length;
      
      const recentList = evidence.slice(-5);
      const recentSupportCount = recentList.filter(ev => ev.value === currentValue).length;
      const recentContradictionCount = recentList.filter(ev => ev.value !== currentValue).length;

      const reliability = calculateReliability(evidence, currentValue);
      const confidenceTrend = calculateConfidenceTrend(evidence, currentValue);

      migrated[key] = {
        currentValue,
        reliability,
        supportCount,
        contradictionCount,
        recentSupportCount,
        recentContradictionCount,
        confidenceTrend,
        lastUpdated: field.lastUpdated || now,
        evidence
      };
    } else if (field && field.value !== null && field.value !== undefined) {
      const evidence = [
        {
          value: field.value,
          source: "migrated",
          text: "Migrated from legacy confidence structure",
          timestamp: now
        }
      ];
      migrated[key] = {
        currentValue: field.value,
        reliability: 100,
        supportCount: 1,
        contradictionCount: 0,
        recentSupportCount: 1,
        recentContradictionCount: 0,
        confidenceTrend: "stable",
        lastUpdated: now,
        evidence
      };
    } else {
      migrated[key] = {
        currentValue: null,
        reliability: 0,
        supportCount: 0,
        contradictionCount: 0,
        recentSupportCount: 0,
        recentContradictionCount: 0,
        confidenceTrend: "stable",
        lastUpdated: null,
        evidence: []
      };
    }
  });

  return migrated;
}

export function updateEvidenceMemory(state, newFacts, source = "user", text = "", customTimestamp = null) {
  const storedFacts = migrateOldMemory(state);
  let updated = false;
  const now = customTimestamp !== null ? customTimestamp : Date.now();
  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  const keys = ["married", "hasChildren", "hasJob", "hasBusiness", "gender"];
  keys.forEach(key => {
    if (newFacts[key] !== undefined) {
      const newValue = newFacts[key];
      const field = storedFacts[key];

      // Duplicate prevention: same value, source, and text within 24h
      const hasDuplicate = field.evidence.some(ev => 
        ev.value === newValue &&
        ev.source === source &&
        ev.text === text &&
        (now - ev.timestamp < DAY_IN_MS)
      );

      if (hasDuplicate) {
        return;
      }

      const newEvidence = {
        value: newValue,
        source,
        text,
        timestamp: now
      };

      const updatedEvidence = appendEvidence(field.evidence, newEvidence);
      const calculatedVal = calculateCurrentValue(updatedEvidence);
      
      const supportCount = updatedEvidence.filter(ev => ev.value === calculatedVal).length;
      const contradictionCount = updatedEvidence.filter(ev => ev.value !== calculatedVal).length;

      const recentList = updatedEvidence.slice(-5);
      const recentSupportCount = recentList.filter(ev => ev.value === calculatedVal).length;
      const recentContradictionCount = recentList.filter(ev => ev.value !== calculatedVal).length;

      const reliability = calculateReliability(updatedEvidence, calculatedVal);
      const confidenceTrend = calculateConfidenceTrend(updatedEvidence, calculatedVal);

      if (
        field.currentValue !== calculatedVal ||
        field.reliability !== reliability ||
        field.supportCount !== supportCount ||
        field.contradictionCount !== contradictionCount ||
        field.recentSupportCount !== recentSupportCount ||
        field.recentContradictionCount !== recentContradictionCount ||
        field.confidenceTrend !== confidenceTrend ||
        field.evidence.length !== updatedEvidence.length
      ) {
        updated = true;
      }

      storedFacts[key] = {
        currentValue: calculatedVal,
        reliability,
        supportCount,
        contradictionCount,
        recentSupportCount,
        recentContradictionCount,
        confidenceTrend,
        lastUpdated: now,
        evidence: updatedEvidence
      };
    }
  });

  return { storedFacts, updated };
}
