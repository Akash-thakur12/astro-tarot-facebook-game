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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Server-Side Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error("No UID in token");
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const spinDocId = `${uid}_${todayStr}`;
  const spinRef = db.collection('dailySpins').doc(spinDocId);
  const userRef = db.collection('users').doc(uid);

  try {
    const result = await db.runTransaction(async (t) => {
      const spinDoc = await t.get(spinRef);
      
      if (!spinDoc.exists) {
        return { error: 'No spin record found for today.' };
      }

      const spinData = spinDoc.data();
      if (spinData.claimed) {
        return { error: 'Reward already claimed.' };
      }

      // Apply Reward
      const userUpdates = {
        lastRewardClaimed: FieldValue.serverTimestamp()
      };

      const { rewardType, rewardValue } = spinData;

      if (rewardType === 'coin') {
        userUpdates.coins = FieldValue.increment(rewardValue);
      } else if (rewardType === 'tarot') {
        userUpdates.bonusTarot = FieldValue.increment(rewardValue);
      } else if (rewardType === 'xp') {
        // Based on existing logic: 50 XP
        userUpdates.xp = FieldValue.increment(50);
      }

      t.set(userRef, userUpdates, { merge: true });

      // Mark as Claimed
      t.update(spinRef, {
        claimed: true,
        claimedAt: FieldValue.serverTimestamp()
      });

      return { success: true, rewardType, rewardValue };
    });

    if (result.error) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Claim Transaction Error:", error);
    return res.status(500).json({ error: 'Failed to process claim.' });
  }
}
