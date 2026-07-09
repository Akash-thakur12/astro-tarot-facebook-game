import sys

with open('api/pandit-ai.js', 'r', encoding='utf-8') as f:
    content = f.read()

bad1 = '''      greetingSuppressionInstruction = `
- CONVERSATION TURN IS SUBSEQUENT (Not first turn): You MUST NOT use any welcome greetings, introductions, or greeting phrases (like "Beta, aapka swagat hai", "Namaste Beta", "Aapka swagat hai") anywhere, especially not at the beginning of your response. Start directly with the answer to the user's follow-up question.`;
=== QUALITY, DIVERSITY & ANTI-REPETITION RULES ==='''

good1 = '''      greetingSuppressionInstruction = `
- CONVERSATION TURN IS SUBSEQUENT (Not first turn): You MUST NOT use any welcome greetings, introductions, or greeting phrases (like "Beta, aapka swagat hai", "Namaste Beta", "Aapka swagat hai") anywhere, especially not at the beginning of your response. Start directly with the answer to the user's follow-up question.`;
    }

    let dashaRepetitionInstruction = "";
    if (typeof dashaAlreadyMentioned !== 'undefined' && typeof astroData !== 'undefined') {
      dashaRepetitionInstruction = `
- DASHA REPETITION PREVENTION: The user's current Dasha (${astroData.mahadasha || 'Unknown'}/${astroData.antardasha || 'Unknown'}) has already been discussed in previous messages. Avoid repeating the full explanation or dasha names again unless the user explicitly asks about timing/dasha. You can refer to it concisely (e.g., "grah sthiti") or omit it entirely to avoid redundancy.`;
    }

    const priorityRulesBlock = `
=== PRIORITY & CONTEXT RULES ===
- The current question has the highest priority. Focus entirely on answering the user's specific question as the primary objective.
- GREETING & NAME BANS: Unless the user is only greeting you (isGreeting=true), you must NOT start your response with any greeting phrases (like "Ram Ram", "Namaste", "Pranam", "Kalyan ho") or address the user by name/beta at the very beginning of the response (e.g. do NOT start with "Ram Ram beta Akash" or "Akash Beta, ..."). Start the response directly with the answer/prediction.${greetingSuppressionInstruction}${dashaRepetitionInstruction}
- Do NOT repeat the user's chart summary (such as Sun Mahadasha, Mercury Antardasha, Government Job, Hamirpur, age, or birthplace) unless it is directly relevant to the specific question asked. Birth chart context should SUPPORT the answer, not replace it.
- FOLLOW-UP DETECTION: If the user asks a short follow-up query (e.g., "kab", "kis year", "kitne saal", "uska kya hoga", "phir", "aur", "when", "then", "what about", etc.), you MUST read the "Recent Conversation" history to understand the subject they are asking about, and answer using that context.

=== QUALITY, DIVERSITY & ANTI-REPETITION RULES ==='''

if bad1 in content:
    content = content.replace(bad1, good1)
    print("Fixed syntax block!")
elif bad1.replace('\\n', '\\r\\n') in content:
    content = content.replace(bad1.replace('\\n', '\\r\\n'), good1.replace('\\n', '\\r\\n'))
    print("Fixed syntax block! (CRLF)")
else:
    print("Could not find syntax block.")

bad2 = r'''\nFORMATTING RULE: At the absolute end of your response, on a new line, you MUST write:
CLIFFHANGER: <the exact open loop question you asked under ${cliffhangerHeading}>'''

good2 = r'''\nFORMATTING RULE: At the absolute end of your response, on new lines, you MUST write:
DAILY_SECRET: <generate a hyper-personalized, hidden "Daily Secret" (1 short sentence) based on the user's current planetary transit/astrological data. This must not be repetitive.>
CLIFFHANGER: <the exact open loop question you asked under ${cliffhangerHeading}>'''

if bad2 in content:
    content = content.replace(bad2, good2)
    print("Fixed daily secret!")
elif bad2.replace('\\n', '\\r\\n') in content:
    content = content.replace(bad2.replace('\\n', '\\r\\n'), good2.replace('\\n', '\\r\\n'))
    print("Fixed daily secret! (CRLF)")
else:
    print("Could not find daily secret block.")

with open('api/pandit-ai.js', 'w', encoding='utf-8') as f:
    f.write(content)
