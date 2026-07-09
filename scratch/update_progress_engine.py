import sys

with open('src/utils/progressEngine.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_get = '''    const data = doc.data();
    return {
      score: data.score !== undefined ? data.score : 0,
      streak: data.streak !== undefined ? data.streak : 0,
      lastLogin: data.lastLogin || '',
      secrets: data.secrets || {}
    };'''
new_get = '''    const data = doc.data();
    return {
      score: data.score !== undefined ? data.score : 0,
      streak: data.streak !== undefined ? data.streak : 0,
      lastLogin: data.lastLogin || '',
      secrets: data.secrets || {},
      recommendationMemory: data.recommendationMemory || {}
    };'''

old_update = '''    if (action === 'remedy_done') u.score += 20;

    const db = getDb();'''
new_update = '''    if (action === 'remedy_done') u.score += 20;
    if (action === 'memory_update' && cachedProgress && cachedProgress.recommendationMemory) {
      u.recommendationMemory = cachedProgress.recommendationMemory;
    }

    const db = getDb();'''

if old_get in content:
    content = content.replace(old_get, new_get)
elif old_get.replace('\\n', '\\r\\n') in content:
    content = content.replace(old_get.replace('\\n', '\\r\\n'), new_get.replace('\\n', '\\r\\n'))

if old_update in content:
    content = content.replace(old_update, new_update)
elif old_update.replace('\\n', '\\r\\n') in content:
    content = content.replace(old_update.replace('\\n', '\\r\\n'), new_update.replace('\\n', '\\r\\n'))

with open('src/utils/progressEngine.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("progressEngine updated!")
