import fs from 'fs';
import { detectMultiIntent } from './api/pandit-ai.js';
import { describe, it } from 'vitest';

async function runAudit() {
  const fileContent = fs.readFileSync('./api/pandit-ai.js', 'utf-8');
  
  // 1. Total supported intents
  // Find PRIORITY_ORDER length or SEMANTIC_CATEGORIES keys
  const priorityMatch = fileContent.match(/const PRIORITY_ORDER = \[([\s\S]*?)\];/);
  let totalIntents = 0;
  if (priorityMatch) {
    totalIntents = priorityMatch[1].split(',').filter(x => x.trim()).length;
  }
  
  // 2. Total typo mappings
  const typoMatch = fileContent.match(/const TYPO_DICTIONARY = \{([\s\S]*?)\};/);
  let totalTypos = 0;
  if (typoMatch) {
    const lines = typoMatch[1].split('\n').filter(l => l.includes(':'));
    for (const line of lines) {
      const arrMatch = line.match(/\[(.*?)\]/);
      if (arrMatch) {
        totalTypos += arrMatch[1].split(',').length;
      }
    }
  }

  // 3. Total semantic patterns
  const semanticMatch = fileContent.match(/const SEMANTIC_CATEGORIES = \{([\s\S]*?)\};/);
  let totalPatterns = 0;
  if (semanticMatch) {
      // Very naive counting of "phrase:" or just doing it via regex
  }
  // Let's actually import SEMANTIC_CATEGORIES if we can. Wait, it's not exported.
  // Let's just count occurrences of `phrase:`
  const phraseMatches = fileContent.match(/phrase\s*:/g);
  if (phraseMatches) {
      totalPatterns = phraseMatches.length;
  }

  // 4. Total tests
  let totalTests = 0;
  try {
      const testFiles = fs.readdirSync('./tests');
      for (const t of testFiles) {
          if (t.endsWith('.js')) {
              const content = fs.readFileSync('./tests/' + t, 'utf-8');
              const itMatches = content.match(/it\s*\(/g);
              if (itMatches) totalTests += itMatches.length;
          }
      }
  } catch(e) {}

  console.log("=== AUDIT STATS ===");
  console.log("Total Supported Intents:", totalIntents);
  console.log("Total Typo Mappings:", totalTypos);
  console.log("Total Semantic Patterns:", totalPatterns);
  console.log("Total Tests:", totalTests);

  const simulations = [
    "meri job kab hogi",
    "meri shaadi kab hogi aur love marriage hogi ya arrange",
    "meri job kab hogi aur shaadi kab hogi aur bacha kab hoga",
    "meri job kab hogi, shaadi kab hogi, love hogi ya arrange, bacha kab hoga, paisa kab aayega, foreign kab jaunga",
    "meri health kaisi rahegi, paisa kab aayega, ghar kab banega, foreign kab jaunga, shaadi kab hogi, bacha kab hoga, career kaisa rahega"
  ];

  console.log("\n=== SIMULATIONS ===");
  for (let i=0; i<simulations.length; i++) {
    console.log(`\nSimulation ${String.fromCharCode(65+i)}: ${simulations[i]}`);
    const res = detectMultiIntent(simulations[i]);
    console.log(JSON.stringify(res, null, 2));
  }
}

runAudit();
