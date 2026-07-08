import fs from 'fs';
import path from 'path';

function inspectFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const functions = [];
    
    // Naive function extraction for js/ts/py
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|def\s+([a-zA-Z0-9_]+)\s*\(/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
        functions.push(match[1] || match[2] || match[3]);
    }
    
    return {
        file: filePath,
        lines: lines.length,
        functions: Array.from(new Set(functions))
    };
}

function inspectDir(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    const results = [];
    const files = fs.readdirSync(dirPath);
    for (const f of files) {
        const full = path.join(dirPath, f);
        if (fs.statSync(full).isDirectory()) {
            results.push(...inspectDir(full));
        } else if (f.endsWith('.js') || f.endsWith('.py') || f.endsWith('.jsx')) {
            const res = inspectFile(full);
            if (res) results.push(res);
        }
    }
    return results;
}

const targets = {
    'AskPandit AI': ['api/pandit-ai.js'],
    'Progression Engine': ['src/utils/progressEngine.js'],
    'Intent Engine': ['src/utils/intentDetector.js'],
    'Memory System': ['src/utils/memoryEngine.js', 'src/utils/evidenceMemoryEngine.js', 'src/utils/semanticMemory.js'],
    'Tarot Engine': ['api/tarot', 'src/components/Tarot'],
    'Kundali Engine': ['astrology-engine'],
    'Coin Economy': ['api/user', 'api/rewards'],
    'Reward Ads': ['api/ads', 'src/services/fbAds.js'],
    'Premium Payments': ['api/payments', 'src/services/fbPayments.js'],
    'Security': ['firestore.rules'],
    'Firestore Data Model': ['firestore.rules', 'src/services/firebase.js'],
    'FB Instant Games': ['src/services/fbinstant.js']
};

for (const [sys, paths] of Object.entries(targets)) {
    console.log(`\n=== ${sys} ===`);
    for (const p of paths) {
        if (!fs.existsSync(p)) {
            console.log(`MISSING: ${p}`);
            continue;
        }
        if (fs.statSync(p).isDirectory()) {
            const res = inspectDir(p);
            res.forEach(r => console.log(`FILE: ${r.file} | LINES: ${r.lines} | FUNCS: ${r.functions.join(', ')}`));
        } else {
            const r = inspectFile(p);
            if (p === 'firestore.rules') {
                console.log(`FILE: ${r.file} | LINES: ${r.lines}`);
            } else {
                console.log(`FILE: ${r.file} | LINES: ${r.lines} | FUNCS: ${r.functions.join(', ')}`);
            }
        }
    }
}
