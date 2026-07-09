import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  return getFirestore();
}

export async function getProgress(uid) {
  try {
    const db = getDb();
    const doc = await db.collection("userProgress").doc(uid).get();
    if (!doc.exists) {
      return { score: 0, streak: 0, lastLogin: '', secrets: {}, recommendationMemory: {}, debug_info: {} };
    }
    const data = doc.data();
    return {
      score: data.score !== undefined ? data.score : 0,
      streak: data.streak !== undefined ? data.streak : 0,
      lastLogin: data.lastLogin || '',
      secrets: data.secrets || {},
      recommendationMemory: data.recommendationMemory || {},
      debug_info: data.debug_info || {}
    };
  } catch (err) {
    console.error("getProgress failed", err);
    return { score: 0, streak: 0, lastLogin: '', secrets: {}, recommendationMemory: {}, debug_info: {} };
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
    if (action === 'memory_update' && cachedProgress) {
      if (cachedProgress.recommendationMemory) {
        u.recommendationMemory = cachedProgress.recommendationMemory;
      }
      if (cachedProgress.debug_info) {
        u.debug_info = cachedProgress.debug_info;
      }
    }

    const db = getDb();
    await db.collection("userProgress").doc(uid).set(u, { merge: true });
    return u;
  } catch (err) {
    console.error("updateProgress failed", err);
    return { score: 0, streak: 0, lastLogin: '', secrets: {}, recommendationMemory: {}, debug_info: {} };
  }
}

export function getDailySecret(dob, today, category = 'General', pastHistory = [], llmSecret = "") {
  // If the AI generated a dynamic hyper-personalized secret, use it directly!
  if (llmSecret && llmSecret.trim().length > 0) {
    return llmSecret;
  }
  
  // Fallback to a single generic secret if AI failed to generate one
  return "Krodh aur jaldbazi se bachein, aaj ka din shubh rahega.";
}
