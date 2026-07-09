import sys

with open('api/services/memoryStateParser.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_repair = '''    // Missing quotes around string values (simple heuristic for words)
    repairedText = repairedText.replace(/:\\s*([a-zA-Z0-9_\\s\\-]+?)\\s*([,}])/g, ':"$1"$2');'''

new_repair = '''    // Missing quotes around string values (simple heuristic for words)
    repairedText = repairedText.replace(/:\\s*([a-zA-Z0-9_\\s\\-]+?)\\s*([,}])/g, ':"$1"$2');
    // Missing quotes around array string items
    repairedText = repairedText.replace(/\\[\\s*([a-zA-Z0-9_\\s\\-]+?)\\s*\\]/g, '["$1"]');'''

if old_repair in content:
    content = content.replace(old_repair, new_repair)
elif old_repair.replace('\\n', '\\r\\n') in content:
    content = content.replace(old_repair.replace('\\n', '\\r\\n'), new_repair.replace('\\n', '\\r\\n'))

with open('api/services/memoryStateParser.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Parser updated")
