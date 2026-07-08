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

export async function updateProgress(uid, action, cachedProgress = null) {
  try {
    const u = cachedProgress ? { ...cachedProgress } : await getProgress(uid);
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

export function getDailySecret(dob, today, category = 'General', pastHistory = []) {
  const secretsMap = {
    Love: [
      "Prem sambandho me aaj madhurta rahegi",
      "Krodh par niyantran rakhein, sambandh bachenge",
      "Pani me thoda gulab jal dalkar snan karein",
      "Safed vastra dharan karein, aakarshan badhega",
      "Sukra dev ke mantra ka jaap karein"
    ],
    Marriage: [
      "Vivaah ke yog ban rahe hain",
      "Dampatya jeevan me shanti banaye rakhein",
      "Guru grah ki pooja karein",
      "Haldi ka tilak mathay par lagayein",
      "Peeli cheezon ka daan karein"
    ],
    Career: [
      "Naye rozgar ke avsar prapt honge",
      "Karyakshetra me prashansa milegi",
      "Surya ko arghya dena shuru karein",
      "Koyla behte paani me bahayein",
      "Nele kapde avoid karein"
    ],
    Business: [
      "Aaj naya nivesh karne se bachein",
      "Vyapaar me vridhi ke sanket hain",
      "Budh ke beej mantra ka jaap karein",
      "Hari moong ki daal ka daan karein",
      "Gau seva karein, labh hoga"
    ],
    Health: [
      "Swasthya par vishesh dhyan dein",
      "Subah ki sair labhdayak rahegi",
      "Pranayam aur dhyan karein",
      "Mahamrityunjaya mantra ka jaap karein",
      "Hari sabziyon ka sevan badhayein"
    ],
    General: [
      "Aaj 3-4 PM lucky time hai",
      "Kaale kapde avoid karo",
      "Laal rang pehne, confidence badhega",
      "Pani ka daan karein",
      "Dakshin disha me na baithen",
      "Namak ka paani ghar me chhidkein"
    ]
  };

  const secrets = secretsMap[category] || secretsMap.General;
  
  const recentSecrets = [];
  if (Array.isArray(pastHistory)) {
    const last3 = pastHistory.slice(-3).filter(m => m.role === 'assistant');
    for (const msg of last3) {
      if (msg.content) {
        for (const sec of secrets) {
          if (msg.content.includes(sec)) {
            recentSecrets.push(sec);
          }
        }
      }
    }
  }

  const availableSecrets = secrets.filter(s => !recentSecrets.includes(s));
  const pool = availableSecrets.length > 0 ? availableSecrets : secrets;

  const hashStr = dob + today + category;
  const hash = hashStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const dayOffset = new Date(today).getDate() || 1;
  const index = (hash + dayOffset) % pool.length;

  return pool[index];
}
