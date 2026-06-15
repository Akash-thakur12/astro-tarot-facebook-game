import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

  const { method } = req.body;
  const userRef = db.collection('users').doc(uid);

  try {
    // 3. Unlock Reading
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("USER_NOT_FOUND");
      
      const userData = userDoc.data();

      if (method === 'coins') {
        if ((userData.coins || 0) < 30) {
          return { success: false, error: "INSUFFICIENT_COINS" };
        }
        t.update(userRef, { 
          coins: FieldValue.increment(-30),
          dailyTarotUsed: false,
          lastTarotUnlockDate: FieldValue.serverTimestamp()
        });
      } else {
        // Default to 'ad' method
        t.update(userRef, {
          dailyTarotUsed: false,
          lastTarotUnlockDate: FieldValue.serverTimestamp()
        });
      }

      return { success: true };
    });

    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Tarot Unlock Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
