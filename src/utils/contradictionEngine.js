function getFactValue(field) {
  if (!field) return null;
  if (field.currentValue !== undefined) return field.currentValue;
  if (field.value !== undefined) return field.value;
  return null;
}

/**
 * Resolves intent contradictions against known user profile and stored facts.
 *
 * @param {string} intent - The detected intent.
 * @param {object|null} profile - The user's profile document.
 * @param {object} facts - Stored fact memory.
 * @param {string} question - The user's question text (reserved for future rules).
 * @returns {string} The resolved intent.
 */
export function resolveIntentContradiction(intent, profile, facts, question) {
  const isMarried =
    profile?.maritalStatus === 'Married' ||
    getFactValue(facts?.married) === true;

  if (isMarried && intent === 'marriage_when') {
    return 'married_life';
  }

  const hasChildren = getFactValue(facts?.hasChildren) === true;
  if (hasChildren && intent === 'child_when') {
    return 'general';
  }

  return intent;
}
