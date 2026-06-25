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

// Rate limiting map replaced by Firestore transaction rate limiter

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

  // Firestore transaction based rate limiter
  const now = new Date();
  const nowMs = now.getTime();
  const rateLimitRef = db.collection('rateLimits').doc(uid);
  let rateLimitHit = false;
  
  try {
    await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(rateLimitRef);
      let count = 0;
      let windowStart = nowMs;
      
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data && typeof data.count === 'number' && typeof data.windowStart === 'number') {
          count = data.count;
          windowStart = data.windowStart;
        }
      }
      
      if (nowMs - windowStart > 60000) {
        count = 0;
        windowStart = nowMs;
        console.log("RATE_LIMIT_RESET");
      }
      
      if (count >= 10) {
        rateLimitHit = true;
        console.log("RATE_LIMIT_HIT");
        return;
      }
      
      const newCount = count + 1;
      const updateData = { count: newCount, windowStart };
      
      if (docSnap.exists && typeof tx.update === 'function') {
        tx.update(rateLimitRef, updateData);
      } else if (typeof tx.set === 'function') {
        tx.set(rateLimitRef, updateData);
      } else {
        tx.update(rateLimitRef, updateData);
      }
    });
  } catch (error) {
    console.error("Rate limiter transaction failed:", error);
  }
  
  if (rateLimitHit) {
    return res.status(429).json({ error: 'Too many requests.' });
  }

  const { cardName, lovePrediction, careerPrediction, healthPrediction } = req.body;

  if (!cardName) {
    return res.status(400).json({ error: "Missing card details" });
  }

  const userRef = db.collection('users').doc(uid);
  const historyRef = userRef.collection('tarotHistory');

  try {
    // 3. Save History and Update User Status
    // We use a batch-like approach: Create the history doc first, then update user.
    // In Firestore Admin, we can just do these sequentially or use a transaction.
    
    await db.runTransaction(async (t) => {
      // 0. Check and AUTO-CREATE user if missing
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
          joinedAt: FieldValue.serverTimestamp()
        };
        t.set(userRef, userData);
      } else {
        userData = userDoc.data();
      }

      // Daily Limit Validation for Free Users
      if (!userData.premium) {
        const lastRead = userData.lastTarotReadingDate?.toDate();
        const now = new Date();
        const isSameDay = lastRead && 
          lastRead.getUTCDate() === now.getUTCDate() &&
          lastRead.getUTCMonth() === now.getUTCMonth() &&
          lastRead.getUTCFullYear() === now.getUTCFullYear();

        if (isSameDay && userData.dailyTarotUsed) {
          throw new Error("DAILY_LIMIT_REACHED");
        }
      }

      // 1. Create History Entry
      const newHistoryRef = historyRef.doc();
      t.set(newHistoryRef, {
        cardName,
        lovePrediction: lovePrediction || "",
        careerPrediction: careerPrediction || "",
        healthPrediction: healthPrediction || "",
        timestamp: FieldValue.serverTimestamp(),
        date: new Date().toLocaleDateString('en-US')
      });

      // 2. Update User Profile
      t.update(userRef, {
        lastTarotReadingDate: FieldValue.serverTimestamp(),
        dailyTarotUsed: true
      });
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Tarot Save Error:", error);
    if (error.message === "DAILY_LIMIT_REACHED") {
      return res.status(403).json({ error: "Daily tarot reading limit reached. Please come back tomorrow or upgrade to Premium." });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
