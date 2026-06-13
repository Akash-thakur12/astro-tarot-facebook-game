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

  const userRef = db.collection('users').doc(uid);

  try {
    // 3. Unified Daily Reset Logic (UTC Based)
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        throw new Error("USER_NOT_FOUND");
      }

      const user = userDoc.data();
      const now = new Date();
      let needsUpdate = false;
      const updates = {};

      const isNewDay = (lastDate) => {
        if (!lastDate) return true;
        const d = lastDate.toDate();
        return (
          d.getUTCDate() !== now.getUTCDate() ||
          d.getUTCMonth() !== now.getUTCMonth() ||
          d.getUTCFullYear() !== now.getUTCFullYear()
        );
      };

      // Check each usage flag
      if (isNewDay(user.lastQuestionDate) && user.dailyQuestionUsed) {
        updates.dailyQuestionUsed = false;
        needsUpdate = true;
      }
      if (isNewDay(user.lastCompDate) && user.dailyCompUsed) {
        updates.dailyCompUsed = false;
        needsUpdate = true;
      }
      if (isNewDay(user.lastSpinDate) && user.dailySpinUsed) {
        updates.dailySpinUsed = false;
        needsUpdate = true;
      }
      if (isNewDay(user.lastChallengeClaimDate) && user.dailyChallengesClaimed) {
        updates.dailyChallengesClaimed = false;
        needsUpdate = true;
      }
      if (isNewDay(user.lastTarotReadingDate) && user.dailyTarotUsed) {
        updates.dailyTarotUsed = false;
        needsUpdate = true;
      }
      if (isNewDay(user.lastAdRewardDate) && (user.adsWatchedToday || 0) > 0) {
        updates.adsWatchedToday = 0;
        needsUpdate = true;
      }

      // Check Premium Expiry
      if (user.premium && user.subscriptionExpiry) {
        const expiryDate = user.subscriptionExpiry.toDate();
        if (now > expiryDate) {
          updates.premium = false;
          updates.subscriptionExpiry = null;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        t.update(userRef, updates);
        return { resetPerformed: true, updates };
      }

      return { resetPerformed: false };
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error("Check Status Error:", error);
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User profile not found" });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
