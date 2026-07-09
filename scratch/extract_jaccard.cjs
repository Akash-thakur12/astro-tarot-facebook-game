const fs = require('fs');

const panditPath = 'api/pandit-ai.js';
const execPath = 'api/services/aiExecution.js';

let panditContent = fs.readFileSync(panditPath, 'utf8');
let execContent = fs.readFileSync(execPath, 'utf8');

const lines = panditContent.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function getJaccardSimilarity(')) {
        startIdx = i;
        break;
    }
}

if (startIdx !== -1) {
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].startsWith('}')) {
            endIdx = i;
            break;
        }
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    const funcLines = lines.slice(startIdx, endIdx + 1);
    execContent += '\n\n' + funcLines.join('\n') + '\n';
    lines.splice(startIdx, endIdx - startIdx + 1);
    panditContent = lines.join('\n');
    
    // Also inject import for humanize in aiExecution.js
    if (!execContent.includes("import { humanize }")) {
       execContent = "import { humanize } from '../../src/utils/humanizer.js';\n" + execContent;
    }
    
    fs.writeFileSync(panditPath, panditContent);
    fs.writeFileSync(execPath, execContent);
    console.log('Successfully extracted getJaccardSimilarity');
} else {
    console.log('Failed to extract', startIdx, endIdx);
}
