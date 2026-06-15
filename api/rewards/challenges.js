import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. Initialize Firebase Admin
const apps = getApps();
if (!apps || apps.length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
    } else {
      initializeApp();
    }
  } catch (e) {
    if (!e.message?.includes('already exists')) throw e;
  }
}

const db = getFirestore();
const adminAuth = getAuth();

// Rate limiting map (in-memory, per Vercel instance)
const rateLimits = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Server-Side Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let uid;

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error("No UID in token");
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // Basic Rate Limiting
  const now = new Date();
  const nowMs = now.getTime();
  const userRate = rateLimits.get(uid) || { count: 0, resetTime: nowMs + 60000 };
  if (nowMs > userRate.resetTime) {
    userRate.count = 0;
    userRate.resetTime = nowMs + 60000;
  }
  if (userRate.count >= 10) {
    return res.status(429).json({ error: 'Too many requests.' });
  }
  userRate.count++;
  rateLimits.set(uid, userRate);

  const userRef = db.collection('users').doc(uid);

  try {
    // 3. Atomic Transaction for Challenge Reward
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      
      let userData;
      if (!userDoc.exists) {
        // AUTO-CREATE
        userData = {
          uid,
          coins: 0,
          xp: 0,
          streak: 1,
          premium: false,
          adsWatchedToday: 0,
          dailyQuestionUsed: false,
          dailyTarotUsed: false,
          dailySpinUsed: false,
          dailyChallengesClaimed: false,
          joinedAt: FieldValue.serverTimestamp()
        };
        t.set(userRef, userData);
      } else {
        userData = userDoc.data();
      }

      // Verify Requirements using Server Timestamps (Reliable)
      const now = new Date();
      const isToday = (timestamp) => {
        if (!timestamp) return false;
        const d = timestamp.toDate();
        return (
          d.getUTCDate() === now.getUTCDate() &&
          d.getUTCMonth() === now.getUTCMonth() &&
          d.getUTCFullYear() === now.getUTCFullYear()
        );
      };

      const tarotDone = isToday(userData.lastTarotReadingDate) && userData.dailyTarotUsed;
      const spinDone = isToday(userData.lastSpinDate) && userData.dailySpinUsed;
      const questionDone = isToday(userData.lastQuestionDate) && userData.dailyQuestionUsed;

      if (!tarotDone || !spinDone || !questionDone) {
        return { 
          success: false, 
          error: "Challenges not complete",
          status: { tarotDone, spinDone, questionDone }
        };
      }

      // Verify Not Already Claimed Today
      if (userData.dailyChallengesClaimed && isToday(userData.lastChallengeClaimDate)) {
        return { success: false, error: "Already claimed today" };
      }

      // Apply Reward
      const coinReward = 20;
      const xpReward = 50;

      t.update(userRef, {
        coins: FieldValue.increment(coinReward),
        xp: FieldValue.increment(xpReward),
        dailyChallengesClaimed: true,
        lastChallengeClaimDate: FieldValue.serverTimestamp()
      });

      return { 
        success: true, 
        reward: { coins: coinReward, xp: xpReward }, 
        newBalance: (userData.coins || 0) + coinReward 
      };
    });

    if (!result.success) {
      return res.status(403).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Daily Challenges Transaction Error:", error);
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User profile not found" });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
