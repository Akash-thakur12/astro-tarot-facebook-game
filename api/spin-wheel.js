import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. Robust Firebase Admin Initialization
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
    if (!e.message?.includes('already exists')) {
      throw e;
    }
  }
}

const db = getFirestore();
const adminAuth = getAuth();

// Rate limiting map (in-memory, per Vercel instance)
const rateLimits = new Map();

// 2. Reward Definitions & Weights
// Matches the frontend ID order for seamless animation mapping
const REWARD_POOL = [
  { id: 0, type: 'coin', value: 5, weight: 30 },
  { id: 1, type: 'coin', value: 10, weight: 25 },
  { id: 2, type: 'coin', value: 20, weight: 15 },
  { id: 3, type: 'coin', value: 50, weight: 10 },
  { id: 4, type: 'coin', value: 100, weight: 2 },
  { id: 5, type: 'xp', value: 25, weight: 8 },
  { id: 6, type: 'miss', value: 0, weight: 10 },
];

const getWeightedReward = () => {
  const rand = Math.random() * 100;
  let sum = 0;
  for (const reward of REWARD_POOL) {
    sum += reward.weight;
    if (rand < sum) {
      return reward;
    }
  }
  return REWARD_POOL[0]; // Fallback to 5 coins
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. Server-Side Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error("No UID in token");
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // 4. Basic Rate Limiting
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

  // Date String for "Today" (UTC based to prevent local timezone bypassing)
  const todayStr = now.toISOString().split('T')[0];
  const spinDocId = `${uid}_${todayStr}`;
  const spinRef = db.collection('dailySpins').doc(spinDocId);
  const userRef = db.collection('users').doc(uid);

  try {
    // 5. Transaction to prevent double-spins via race conditions
    const result = await db.runTransaction(async (t) => {
      const spinDoc = await t.get(spinRef);
      const userDoc = await t.get(userRef);
      
      let userData;
      if (!userDoc.exists) {
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
          joinedAt: FieldValue.serverTimestamp(),
          extraSpinsAvailable: 0
        };
        t.set(userRef, userData);
      } else {
        userData = userDoc.data();
      }

      // Check if already spun and if extra spins are available
      if (spinDoc.exists) {
        if ((userData.extraSpinsAvailable || 0) <= 0) {
          return { alreadySpun: true };
        }
        // Use an extra spin
        t.update(userRef, { 
          extraSpinsAvailable: FieldValue.increment(-1) 
        });
      } else {
        // Normal daily spin
        t.update(userRef, {
          dailySpinUsed: true,
          lastSpinDate: FieldValue.serverTimestamp()
        });
      }

      // Generate Reward
      const wonReward = getWeightedReward();

      // Save Spin Record (Reward is PENDING until /api/claim-reward is called)
      // Note: If using an extra spin, we need a unique ID for the claim flow.
      // The current system uses {uid}_{todayStr} which only allows ONE claim per day.
      // To support extra spins, we should either:
      // 1. Change the claim flow to use a different ID strategy.
      // 2. Clear the 'claimed' flag and overwrite the dailySpin doc (simplest but loses history).
      // Let's go with option 2 for now to minimize changes to claim-reward.js.
      
      t.set(spinRef, {
        uid: uid,
        spinDate: todayStr,
        rewardType: wonReward.type,
        rewardValue: wonReward.value,
        rewardId: wonReward.id,
        claimed: false, // RESET so user can claim the new reward
        createdAt: FieldValue.serverTimestamp(),
        isExtraSpin: spinDoc.exists
      });

      return { 
        alreadySpun: false, 
        reward: wonReward,
        extraSpinsRemaining: (userData.extraSpinsAvailable || 0) - (spinDoc.exists ? 1 : 0)
      };
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error("Spin Transaction Error:", error);
    return res.status(500).json({ error: 'Failed to process spin.' });
  }
}
