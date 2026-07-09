import re

with open('api/pandit-ai.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the boundaries of the code to extract
start_marker = "const SEMANTIC_CATEGORIES = {"
end_marker = "function getJaccardSimilarity(str1, str2) {"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find boundaries!")
    exit(1)

extracted_block = content[start_idx:end_idx]

# We need to extract the topic logic into topicEngine.js
topic_engine = f"""
// Extracted from pandit-ai.js
{extracted_block}

export function detectTopic(questionText) {{
  const classification = getTopicAndSubType(questionText);
  return {{
    activeTopic: classification.topic,
    secondaryTopic: (classification.secondary && classification.secondary.length > 0) ? classification.secondary[0] : null,
    confidence: classification.confidence || 0.8,
    detectedIntents: [classification.topic, ...(classification.secondary || [])]
  }};
}}

export function resolveMultiIntent(questionText) {{
  return detectTopic(questionText);
}}

export function shouldAdvanceLayer(isFollowUpWord, isSameQuestion, isSemanticContinuation) {{
  return isFollowUpWord || isSameQuestion || isSemanticContinuation;
}}

export function determineTargetLayer(activeTopic, shouldAdvance, topicProgress, revealedLayers = {{}}) {{
  const currentProgressVal = topicProgress[activeTopic] || 1;
  let target = shouldAdvance ? min(currentProgressVal + 1, 5) : currentProgressVal;
  
  const topicRevealed = revealedLayers[activeTopic] || [];
  while (topicRevealed.includes(target) && target < 5) {{
    target++;
    console.log(`LAYER_LOCKED for ${{activeTopic}}, advancing to ${{target}}`);
  }}
  
  return target;
}}

function min(a, b) {{ return a < b ? a : b; }}

function getJaccardSimilarity(str1, str2) {{
  if (!str1 || !str2) return 0;
  const words1 = str1.toLowerCase().split(/\\s+/).filter(w => w.trim().length > 0);
  const words2 = str2.toLowerCase().split(/\\s+/).filter(w => w.trim().length > 0);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}}

export function generateTopicState(questionText, lastActiveTopic, topicProgress, isFollowUpWord, lastUserMsgContent, savedMysteries = [], revealedLayers = {{}}) {{
  const qClean = (questionText || "").toLowerCase().trim();
  const isSameQuestion = lastUserMsgContent && getJaccardSimilarity(qClean, lastUserMsgContent.toLowerCase().trim()) > 0.70;
  
  const multiIntent = resolveMultiIntent(questionText);
  
  const topicMapping = {{
    marriage: 'marriage', love: 'love', career: 'career', money: 'money', finance: 'money', health: 'health',
    travel: 'travel', foreign: 'travel', foreign_travel: 'travel', children: 'children', family: 'family', daily: 'daily', future: 'daily', compatibility: 'compatibility'
  }};
  
  const matchedTopic = topicMapping[multiIntent.activeTopic] || multiIntent.activeTopic;
  
  const followUpWords = ['kab', 'kb', 'aur', 'fir', 'phir', 'batao', 'bataiye', 'detail'];
  const hasFollowUpWord = followUpWords.some(w => qClean.match(new RegExp(`\\\\b${{w}}\\\\b`))) || isFollowUpWord;
  const isSemanticContinuation = (matchedTopic && lastActiveTopic && matchedTopic === lastActiveTopic) || (hasFollowUpWord && lastActiveTopic);
  
  const shouldAdvance = shouldAdvanceLayer(hasFollowUpWord, isSameQuestion, isSemanticContinuation);
  
  let activeTopic = matchedTopic || lastActiveTopic || 'daily';
  
  if (shouldAdvance && lastActiveTopic) {{
    activeTopic = lastActiveTopic;
  }}
  
  if (activeTopic) {{
    console.log("TOPIC_DETECTED", activeTopic);
    console.log("TOPIC_CONFIDENCE", multiIntent.confidence);
  }}
  
  if (shouldAdvance) {{
    console.log("FOLLOW_UP_MODE_ENABLED");
  }}
  
  if (multiIntent.detectedIntents.length > 1) {{
    console.log("MULTI_INTENT_DETECTED", multiIntent.detectedIntents);
  }}
  
  const targetLayerNum = determineTargetLayer(activeTopic, shouldAdvance, topicProgress, revealedLayers);
  console.log("TARGET_LAYER_SELECTED", targetLayerNum);
  
  if (targetLayerNum > (topicProgress[activeTopic] || 1)) {{
    console.log("LAYER_ADVANCED", targetLayerNum);
  }}

  return {{
    activeTopic: activeTopic,
    secondaryTopic: multiIntent.secondaryTopic,
    targetLayer: targetLayerNum,
    followUpMode: shouldAdvance,
    shouldAdvance: shouldAdvance,
    previousTopic: lastActiveTopic,
    confidence: multiIntent.confidence,
    detectedIntents: multiIntent.detectedIntents
  }};
}}

export function updateTopicProgress(uid, topicState, currentProgress, currentRevealed = {{}}) {{
  const newProgress = {{ ...(currentProgress || {{}}) }};
  newProgress[topicState.activeTopic] = topicState.targetLayer;
  
  const newRevealed = {{ ...(currentRevealed || {{}}) }};
  if (!newRevealed[topicState.activeTopic]) {{
    newRevealed[topicState.activeTopic] = [];
  }}
  if (!newRevealed[topicState.activeTopic].includes(topicState.targetLayer)) {{
    newRevealed[topicState.activeTopic].push(topicState.targetLayer);
  }}
  
  return {{ topicProgress: newProgress, revealedLayers: newRevealed }};
}}
"""

with open('api/services/topicEngine.js', 'w', encoding='utf-8') as f:
    f.write(topic_engine)

print("topicEngine.js created!")

# Now remove the extracted block from pandit-ai.js
new_content = content.replace(extracted_block, "")

# Wait, we need to add import for generateTopicState at the top of pandit-ai.js
import_line = "import { generateTopicState, updateTopicProgress, getTopicAndSubType } from './services/topicEngine.js';\n"
if "generateTopicState" not in new_content:
    new_content = new_content.replace("import { generateAIResponse }", import_line + "import { generateAIResponse }")

# In pandit-ai.js, replace the ACTIVE_TOPIC logic with const topicState = generateTopicState(...)
old_logic_start = "    let classification = getTopicAndSubType(questionText);"
old_logic_end = "    targetLayerNum = shouldAdvance ? Math.min(currentProgressVal + 1, 5) : currentProgressVal;"

start_logic_idx = new_content.find(old_logic_start)
end_logic_idx = new_content.find(old_logic_end)

if start_logic_idx != -1 and end_logic_idx != -1:
    end_logic_idx += len(old_logic_end)
    old_logic_block = new_content[start_logic_idx:end_logic_idx]
    
    new_logic_block = """    const lastUserMsgContent = (lastUserMsg && lastUserMsg.content) ? lastUserMsg.content : "";
    const revealedLayers = userDataDoc.revealedLayers || {};
    
    const topicState = generateTopicState(
      questionText,
      lastActiveTopic,
      topicProgress,
      isFollowUp,
      lastUserMsgContent,
      savedMysteries,
      revealedLayers
    );
    
    activeTopic = topicState.activeTopic;
    targetLayerNum = topicState.targetLayer;
    shouldAdvance = topicState.shouldAdvance;
    
    if (topicState.secondaryTopic) {
      secondaryTopics = [topicState.secondaryTopic];
    }"""
    
    new_content = new_content.replace(old_logic_block, new_logic_block)

# Replace the topicProgress update
old_update = """          const currentProgressVal = latestTopicProgress[activeTopic] || 1;
          const newProgressVal = shouldAdvance ? Math.min(currentProgressVal + 1, 5) : currentProgressVal;

          const updatedTopicProgress = {
            ...latestTopicProgress,
            [activeTopic]: newProgressVal
          };"""
          
new_update = """          const engineUpdate = updateTopicProgress(progressUid, topicState, latestTopicProgress, userDataDoc.revealedLayers || {});
          const updatedTopicProgress = engineUpdate.topicProgress;
          progress.revealedLayers = engineUpdate.revealedLayers;"""

new_content = new_content.replace(old_update, new_update)

with open('api/pandit-ai.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("pandit-ai.js modified!")
