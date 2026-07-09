const fs = require('fs');

const p = 'api/pandit-ai.js';
let content = fs.readFileSync(p, 'utf8');

const targetStr = "\\nFORMATTING RULE: At the absolute end of your response, on a new line, you MUST write:\nCLIFFHANGER: <the exact open loop question you asked under ${cliffhangerHeading}>";
const newStr = "\\nFORMATTING RULE: At the absolute end of your response, on new lines, you MUST write:\nDAILY_SECRET: <generate a hyper-personalized, hidden \"Daily Secret\" (1 short sentence) based on the user's current planetary transit/astrological data. This must not be repetitive.>\nCLIFFHANGER: <the exact open loop question you asked under ${cliffhangerHeading}>";

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(p, content);
  console.log("Success: Replaced prompt string.");
} else {
  console.error("Error: Could not find target string.");
}
