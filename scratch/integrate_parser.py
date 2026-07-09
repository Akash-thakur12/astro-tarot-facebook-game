import sys
import re

with open('api/services/aiExecution.js', 'r', encoding='utf-8') as f:
    exec_content = f.read()

# Add import
import_line = "import { safeParseMemoryState } from './memoryStateParser.js';\n"
if "safeParseMemoryState" not in exec_content:
    exec_content = import_line + exec_content

old_extract = '''  // Extract MEMORY_STATE
  const memoryMatch = text.match(/MEMORY_STATE:\\s*({[\\s\\S]*?})/);
  if (memoryMatch) {
    try {
      memoryState = JSON.parse(memoryMatch[1].trim());
    } catch(e) {
      console.error("Failed to parse MEMORY_STATE", e);
    }
    cleanText = cleanText.replace(/MEMORY_STATE:\\s*({[\\s\\S]*?})/g, "");
  }'''

new_extract = '''  // Extract MEMORY_STATE
  const memoryMatch = text.match(/MEMORY_STATE:\\s*([\\s\\S]*?)(?=DAILY_SECRET:|CLIFFHANGER:|$)/i);
  if (memoryMatch && memoryMatch[1].trim().length > 0) {
    console.log("MEMORY_STATE_FOUND");
    const rawMemory = memoryMatch[1].trim();
    const parseResult = safeParseMemoryState(rawMemory);
    if (parseResult.success) {
      memoryState = parseResult.memoryState;
    }
    cleanText = cleanText.replace(/MEMORY_STATE:\\s*([\\s\\S]*?)(?=DAILY_SECRET:|CLIFFHANGER:|$)/i, "");
  }'''

if old_extract in exec_content:
    exec_content = exec_content.replace(old_extract, new_extract)
elif old_extract.replace('\\n', '\\r\\n') in exec_content:
    exec_content = exec_content.replace(old_extract.replace('\\n', '\\r\\n'), new_extract.replace('\\n', '\\r\\n'))

with open('api/services/aiExecution.js', 'w', encoding='utf-8') as f:
    f.write(exec_content)
print("aiExecution integrated!")


with open('api/pandit-ai.js', 'r', encoding='utf-8') as f:
    pandit = f.read()

# Add import
import_line_pandit = "import { mergeRecommendationMemory } from './services/memoryStateParser.js';\n"
if "mergeRecommendationMemory" not in pandit:
    # Insert after import { executeAIWithRetries }
    pandit = re.sub(r"(import \{ executeAIWithRetries \} from '\./services/aiExecution\.js';)", r"\\1\n" + import_line_pandit, pandit)


old_pandit_block = '''          progress.recommendationMemory = { ...(progress.recommendationMemory || {}), ...aiResult.memoryState };
          await updateProgress(progressUid, 'memory_update', progress);'''

new_pandit_block = '''          progress.recommendationMemory = mergeRecommendationMemory(progress.recommendationMemory, aiResult.memoryState);
          await updateProgress(progressUid, 'memory_update', progress);
          console.log("MEMORY_STATE_SAVED");'''

if old_pandit_block in pandit:
    pandit = pandit.replace(old_pandit_block, new_pandit_block)
elif old_pandit_block.replace('\\n', '\\r\\n') in pandit:
    pandit = pandit.replace(old_pandit_block.replace('\\n', '\\r\\n'), new_pandit_block.replace('\\n', '\\r\\n'))

with open('api/pandit-ai.js', 'w', encoding='utf-8') as f:
    f.write(pandit)
print("pandit-ai integrated!")
