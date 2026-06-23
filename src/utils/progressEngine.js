import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  return getFirestore();
}

export async function getProgress(uid) {
  try {
    const db = getDb();
    const doc = await db.collection("userProgress").doc(uid).get();
    if (!doc.exists) {
      return { score: 0, streak: 0, lastLogin: '', secrets: {} };
    }
    const data = doc.data();
    return {
      score: data.score !== undefined ? data.score : 0,
      streak: data.streak !== undefined ? data.streak : 0,
      lastLogin: data.lastLogin || '',
      secrets: data.secrets || {}
    };
  } catch (err) {
    console.error("getProgress failed", err);
    return { score: 0, streak: 0, lastLogin: '', secrets: {} };
  }
}

export async function updateProgress(uid, action) {
  try {
    const u = await getProgress(uid);
    const today = new Date().toISOString().split('T')[0];

    if (action === 'checkin') {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      u.streak = u.lastLogin === yesterday ? u.streak + 1 : 1;
      u.lastLogin = today;
      u.score += 5;
    }
    if (action === 'remedy_done') u.score += 20;

    const db = getDb();
    await db.collection("userProgress").doc(uid).set(u, { merge: true });
    return u;
  } catch (err) {
    console.error("updateProgress failed", err);
    return { score: 0, streak: 0, lastLogin: '', secrets: {} };
  }
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
