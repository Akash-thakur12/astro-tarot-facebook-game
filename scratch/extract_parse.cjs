const fs = require('fs');

const panditPath = 'api/pandit-ai.js';
const execPath = 'api/services/aiExecution.js';

let panditContent = fs.readFileSync(panditPath, 'utf8');
let execContent = fs.readFileSync(execPath, 'utf8');

const lines = panditContent.split('\n');
let startIdx = -1;
let endIdx = -1;
let braceCount = 0;
let capturing = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!capturing) {
        if (line.includes('function parseModelResponse(')) {
            startIdx = i;
            capturing = true;
            braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (braceCount === 0 && line.includes('}')) {
                endIdx = i;
                break;
            }
        }
    } else {
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        if (braceCount === 0) {
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
    fs.writeFileSync(panditPath, panditContent);
    fs.writeFileSync(execPath, execContent);
    console.log('Extracted parseModelResponse');
} else {
    console.log('Could not extract');
}
