import fs from 'fs';
const DB = './user_progress.json';

export function getUserProgress(uid) {
  const db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : {};
  if (!db[uid]) db[uid] = { score: 0, streak: 0, lastLogin: '', secrets: {} };
  return db[uid];
}

export function updateProgress(uid, action) {
  const db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : {};
  const u = db[uid] || { score: 0, streak: 0, lastLogin: '', secrets: {} };
  const today = new Date().toISOString().split('T')[0];

  if (action === 'checkin') {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    u.streak = u.lastLogin === yesterday ? u.streak + 1 : 1;
    u.lastLogin = today;
    u.score += 5;
  }
  if (action === 'remedy_done') u.score += 20;

  db[uid] = u;
  fs.writeFileSync(DB, JSON.stringify(db));
  return u;
}

export function getDailySecret(dob, today) {
  const hash = (dob + today).split('').reduce((a,b)=>a+b.charCodeAt(0),0);
  const secrets = [
    "Aaj 3-4 PM lucky time hai",
    "Kaale kapde avoid karo",
    "Laal rang pehne, confidence badhega",
    "Pani ka daan karein",
    "Dakshin disha me na baithen",
    "Namak ka paani ghar me chhidkein"
  ];
  return secrets[hash % secrets.length];
}
