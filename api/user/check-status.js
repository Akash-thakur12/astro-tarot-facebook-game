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
  const body = req.body || {};
  const { displayName, photoURL, email, provider } = body;

  try {
    // 3. Unified Daily Reset & Profile Sync Logic
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      const now = new Date();
      
      // AUTO-CREATE if missing
      if (!userDoc.exists) {
        const newUser = {
          uid,
          displayName: displayName || null,
          photoURL: photoURL || null,
          email: email || null,
          provider: provider || 'anonymous',
          coins: 100, // Matching firestore.rules expected default
          xp: 0,
          streak: 1,
          premium: false,
          adsWatchedToday: 0,
          dailyQuestionUsed: false,
          dailyTarotUsed: false,
          dailySpinUsed: false,
          dailyChallengesClaimed: false,
          joinedAt: FieldValue.serverTimestamp(),
          lastLoginAt: FieldValue.serverTimestamp()
        };
        t.set(userRef, newUser);
        return { success: true, resetPerformed: true, created: true };
      }

      const user = userDoc.data();
      const updates = {
        lastLoginAt: FieldValue.serverTimestamp()
      };
      let needsUpdate = false;

      // Sync profile info if it's missing or if upgraded from anonymous
      if (displayName && !user.displayName) { updates.displayName = displayName; needsUpdate = true; }
      if (photoURL && !user.photoURL) { updates.photoURL = photoURL; needsUpdate = true; }
      if (email && !user.email) { updates.email = email; needsUpdate = true; }
      if (provider && user.provider === 'anonymous') { updates.provider = provider; needsUpdate = true; }

      const isNewDay = (lastDate) => {
        if (!lastDate) return true;
        const d = lastDate.toDate();
        return (
          d.getUTCDate() !== now.getUTCDate() ||
          d.getUTCMonth() !== now.getUTCMonth() ||
          d.getUTCFullYear() !== now.getUTCFullYear()
        );
      };

      // Check each usage flag for daily reset
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

      if (needsUpdate || updates.lastLoginAt) {
        t.update(userRef, updates);
        return { success: true, resetPerformed: needsUpdate };
      }

      return { success: true, resetPerformed: false };
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error("Check Status Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
