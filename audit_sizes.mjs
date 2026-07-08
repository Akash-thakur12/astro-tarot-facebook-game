import fs from 'fs';

const filesToCheck = [
    'api/pandit-ai.js',
    'src/utils/progressEngine.js',
    'src/utils/intentDetector.js',
    'src/utils/memoryEngine.js',
    'api/tarot',
    'astrology-engine/main.py',
    'api/rewards',
    'src/services/fbAds.js',
    'src/services/fbPayments.js',
    'firestore.rules',
    'src/services/fbinstant.js'
];

for (const path of filesToCheck) {
    try {
        const stat = fs.statSync(path);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(path);
            let size = 0;
            for (const f of files) {
                size += fs.statSync(path + '/' + f).size;
            }
            console.log(`DIR ${path}: ${files.length} files, ${size} bytes`);
        } else {
            console.log(`FILE ${path}: ${stat.size} bytes`);
        }
    } catch(e) {
        console.log(`MISSING: ${path}`);
    }
}
