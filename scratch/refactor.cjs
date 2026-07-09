const fs = require('fs');

const panditPath = 'api/pandit-ai.js';
let content = fs.readFileSync(panditPath, 'utf8');

const regex = /aiText\s*=\s*await\s*generateAIResponse\(fullPrompt\);[\s\S]*?console\.log\("AI SUCCESS"\);\s*success\s*=\s*true;/;

const replacement = `const aiResult = await executeAIWithRetries(
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
        updatedFacts,
        {
          extractAndRemoveCliffhanger,
          humanize,
          injectSecretAndScore,
          getSecretCategory,
          containsForbiddenPhrases,
          validateAstroResponse,
          getJaccardSimilarity,
          getFriendlyAstrologyFallback,
          removeDuplicateSentences,
          parseModelResponse,
          isGreeting: typeof isGreeting !== 'undefined' ? isGreeting : false,
          isVague: typeof isVague !== 'undefined' ? isVague : false
        }
      );

      if (aiResult.isFallback) {
        return res.status(200).json({ text: aiResult.fallbackText });
      }

      jsonResponse = aiResult.jsonResponse;
      aiText = aiResult.aiText;
      if (aiResult.cliffhangerText) {
        cliffhangerText = aiResult.cliffhangerText;
      }
      
      console.log("AI SUCCESS");
      success = true;`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    
    // Inject import
    if (!content.includes('./services/aiService.js')) {
        content = content.replace(
            "import { generateAIResponse } from '../services/aiService.js';",
            "import { generateAIResponse } from '../services/aiService.js';\\nimport { executeAIWithRetries } from './services/aiService.js';"
        );
    }
    
    fs.writeFileSync(panditPath, content);
    console.log("Refactor successful.");
} else {
    console.log("Could not find regex match.");
}
