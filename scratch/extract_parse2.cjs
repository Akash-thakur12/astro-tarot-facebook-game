const fs = require('fs');

const panditPath = 'api/pandit-ai.js';
const execPath = 'api/services/aiExecution.js';

let panditContent = fs.readFileSync(panditPath, 'utf8');
let execContent = fs.readFileSync(execPath, 'utf8');

const lines = panditContent.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export function parseModelResponse(text) {')) {
        startIdx = i;
        break;
    }
}

if (startIdx !== -1) {
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].startsWith('}')) {
            // Need to find the exact end. We know sanitizePromptInput starts right after.
            if (lines[i+2] && lines[i+2].includes('function sanitizePromptInput(text) {')) {
                endIdx = i;
                break;
            }
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
    console.log('Successfully extracted parseModelResponse');
} else {
    console.log('Failed to extract', startIdx, endIdx);
}
