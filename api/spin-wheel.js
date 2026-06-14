import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

console.log("FUNCTION LOADED");
console.log("PROJECT_ID:", process.env.FIREBASE_PROJECT_ID ? "FOUND" : "MISSING");
console.log("CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL ? "FOUND" : "MISSING");
console.log("PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "FOUND" : "MISSING");

// 1. Robust Firebase Admin Initialization
const apps = getApps();
if (!apps || apps.length === 0) {
  console.log("FIREBASE INIT START");
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
    console.log("FIREBASE INIT SUCCESS");
  } catch (e) {
    console.log("FIREBASE INIT FAILED:", e.message);
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
  { id: 5, type: 'tarot', value: 1, weight: 8 },
  { id: 6, type: 'xp', value: 2, weight: 5 }, // e.g., 2x XP multiplier
  { id: 7, type: 'miss', value: 0, weight: 5 },
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
  console.log("REQUEST RECEIVED");
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
    console.log("AUTH VERIFY START");
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error("No UID in token");
    console.log("AUTH VERIFY SUCCESS");
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
      console.log("FIRESTORE READ START");
      const spinDoc = await t.get(spinRef);
      console.log("FIRESTORE READ SUCCESS");
      
      // Check if already spun
      if (spinDoc.exists) {
        return { alreadySpun: true };
      }

      // Generate Reward
      const wonReward = getWeightedReward();
      console.log("REWARD GENERATED:", wonReward.label);

      // Restore tracking for Daily Challenges (but NO rewards yet)
      t.set(userRef, {
        dailySpinUsed: true,
        lastSpinDate: FieldValue.serverTimestamp()
      }, { merge: true });

      // Save Spin Record (Reward is PENDING until /api/claim-reward is called)
      t.set(spinRef, {
        uid: uid,
        spinDate: todayStr,
        rewardType: wonReward.type,
        rewardValue: wonReward.value,
        rewardId: wonReward.id,
        claimed: false, // MANDATORY: Reward only granted after explicit claim
        createdAt: FieldValue.serverTimestamp()
      });

      console.log("FIRESTORE WRITE SUCCESS");

      return { 
        alreadySpun: false, 
        reward: wonReward 
      };
    });

    console.log("RESPONSE SENT");
    return res.status(200).json(result);

  } catch (error) {
    console.error("Spin Transaction Error:", error);
    return res.status(500).json({ error: 'Failed to process spin.' });
  }
}
