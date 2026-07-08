import fs from 'fs';
import path from 'path';

const searchDirs = ['./src', './api', './astrology-engine'];
const keywords = ['TODO', 'FIXME', 'MOCK', 'mocked', 'hardcoded', 'dummy'];

function scanDir(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
                results = results.concat(scanDir(fullPath));
            }
        } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.py') || file.endsWith('rules')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            let hasMatch = false;
            lines.forEach((line, i) => {
                for (const kw of keywords) {
                    if (line.includes(kw)) {
                        results.push({ file: fullPath, line: i + 1, content: line.trim() });
                        hasMatch = true;
                        break;
                    }
                }
            });
            // Also check for empty functions or return true blindly
        }
    }
    return results;
}

const allMatches = [];
for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
        allMatches.push(...scanDir(dir));
    }
}

console.log("=== TODOs & MOCKs ===");
const grouped = {};
for (const m of allMatches) {
    if (!grouped[m.file]) grouped[m.file] = [];
    grouped[m.file].push(`L${m.line}: ${m.content}`);
}
for (const [file, lines] of Object.entries(grouped)) {
    console.log(`\n${file}:`);
    lines.forEach(l => console.log('  ' + l));
}
