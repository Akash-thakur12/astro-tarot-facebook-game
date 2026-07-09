const fs = require('fs');
const path = require('path');

const panditPath = 'api/pandit-ai.js';
const execPath = 'api/services/aiExecution.js';

let panditContent = fs.readFileSync(panditPath, 'utf8');
let execContent = fs.readFileSync(execPath, 'utf8');

// 1. Update import in pandit-ai.js
panditContent = panditContent.replace(
    /import \{ executeAIWithRetries \} from '\.\/services\/aiService\.js';/,
    "import { executeAIWithRetries } from './services/aiExecution.js';"
);

// 2. Refactor signature of executeAIWithRetries in aiExecution.js
execContent = execContent.replace(
    /export async function executeAIWithRetries\([\s\S]*?helpers\n\) \{/,
    `export async function executeAIWithRetries(options) {
  const {
    fullPrompt, history, astroData, mode, uid, userData, progress,
    detectedIntent, pastHistory, skipDashaPreservation, resolvedLanguage,
    isDevanagari, maritalStatus, updatedFacts
  } = options;`
);

// We must also remove `helpers.` calls inside aiExecution.js
execContent = execContent.replace(/helpers\./g, '');

// 3. Update the call site in pandit-ai.js
const oldCallRegex = /const aiResult = await executeAIWithRetries\([\s\S]*?isVague: typeof isVague !== 'undefined' \? isVague : false\n\s*\}\n\s*\);/;
const newCall = `const aiResult = await executeAIWithRetries({
        fullPrompt,
        history,
        astroData,
        mode,
        uid,
        userData,
        progress,
        detectedIntent,
        pastHistory,
        skipDashaPreservation,
        resolvedLanguage,
        isDevanagari,
        maritalStatus,
        updatedFacts
      });`;
panditContent = panditContent.replace(oldCallRegex, newCall);

// 4. Extract helpers from pandit-ai.js
const helpersToExtract = [
    'validateAstroResponse',
    'containsForbiddenPhrases',
    'parseModelResponse',
    'extractAndRemoveCliffhanger',
    'removeDuplicateSentences',
    'getFriendlyAstrologyFallback',
    'getSecretCategory',
    'injectSecretAndScore'
];

let extractedCode = "\n\n// Extracted Helpers\n";

for (const helper of helpersToExtract) {
    // Regex to match function definition: function name(args) { ... } or export function name(args) { ... }
    // Handles nested braces using simple counting or just an aggressive regex for known boundaries.
    // Since we know they are top level, we can match until the next top level function or end of file.
    // A simpler way for a script is to parse by lines.
    
    const lines = panditContent.split('\n');
    let startIdx = -1;
    let endIdx = -1;
    let braceCount = 0;
    let capturing = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!capturing) {
            if (line.match(new RegExp(`^(export )?(async )?function ${helper}\\s*\\(`))) {
                startIdx = i;
                capturing = true;
                braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
                if (braceCount === 0 && line.includes('}')) {
                    endIdx = i;
                    break;
                }
            }
        } else {
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;
            if (braceCount === 0) {
                endIdx = i;
                break;
            }
        }
    }
    
    if (startIdx !== -1 && endIdx !== -1) {
        const funcLines = lines.slice(startIdx, endIdx + 1);
        extractedCode += funcLines.join('\n') + '\n\n';
        // Remove from pandit
        lines.splice(startIdx, endIdx - startIdx + 1);
        panditContent = lines.join('\n');
        console.log(`Extracted ${helper}`);
    } else {
        console.log(`Could not extract ${helper}`);
    }
}

execContent += extractedCode;

fs.writeFileSync(panditPath, panditContent);
fs.writeFileSync(execPath, execContent);

console.log("Extraction complete.");
