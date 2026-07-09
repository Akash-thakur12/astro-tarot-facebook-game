import sys

with open('api/pandit-ai.js', 'r', encoding='utf-8') as f:
    content = f.read()

vague_old = '''VAGUE MODE RULES:
- The user wants to begin a conversation but has not yet asked a specific astrology question.
- Encourage them warmly to continue and ask their specific question about career, marriage, health, finance, or family.
- Do NOT generate any predictions, dasha details, planet positions, lagna, or nakshatra.
- Keep the reply welcoming, charismatic, and invite them to ask their question.'''

vague_new = '''VAGUE MODE RULES:
- The user has sent a vague or short query (e.g. "Tum btao kya krna chahiye" or "Family").
- DO NOT ask the user to choose a topic or crash.
- You must synthesize the last 2 exchanges from the chat history, summarize the pending bottleneck in their life, and offer a concrete astrological remedy.'''

quality_old = '''=== QUALITY, DIVERSITY & ANTI-REPETITION RULES ===
- Do NOT repeat the same remedy/remediations across unrelated questions in the chat session.'''

quality_new = '''=== QUALITY, DIVERSITY & ANTI-REPETITION RULES ===
- ANTI-OVERFITTING & PLACEHOLDER BAN: Dates (like "May 2027") and fields (like "Trading") in prompt examples are STRICTLY placeholders. You MUST calculate years and fields mathematically based ONLY on the user's actual birth details and current year (2026). Do not predict major events for arbitrary years without planetary dasha logic.
- CHAT MEMORY CONSISTENCY (ANTI-CONTRADICTION): Before generating a response, evaluate the conversation history. If you previously discouraged a path (e.g., "Fashion Designing"), you are STRICTLY FORBIDDEN from recommending it later unless the user explicitly forces a pivot. Maintain a consistent stance across the session.
- DIVERSE CAREER MATRIX: Expand your response matrix to evaluate all planetary signatures naturally (e.g., creative arts, technology, public service, healthcare). Do NOT treat "Trading/Finance" as a universal default.
- Do NOT repeat the same remedy/remediations across unrelated questions in the chat session.'''

if vague_old in content:
    content = content.replace(vague_old, vague_new)
    print("Vague block updated!")
elif vague_old.replace('\\n', '\\r\\n') in content:
    content = content.replace(vague_old.replace('\\n', '\\r\\n'), vague_new.replace('\\n', '\\r\\n'))
    print("Vague block updated! (CRLF)")
else:
    print("Vague block NOT found!")

if quality_old in content:
    content = content.replace(quality_old, quality_new)
    print("Quality block updated!")
elif quality_old.replace('\\n', '\\r\\n') in content:
    content = content.replace(quality_old.replace('\\n', '\\r\\n'), quality_new.replace('\\n', '\\r\\n'))
    print("Quality block updated! (CRLF)")
else:
    print("Quality block NOT found!")

with open('api/pandit-ai.js', 'w', encoding='utf-8') as f:
    f.write(content)
