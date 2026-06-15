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

const STREAK_REWARDS = {
  1: { coins: 10 },
  2: { coins: 15 },
  3: { coins: 20 },
  4: { coins: 25 },
  5: { coins: 30 },
  6: { coins: 40 },
  7: { coins: 50, extraSpin: true }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userRef = db.collection('users').doc(uid);

  try {
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

      const userData = userDoc.data();
      const now = new Date();
      const lastClaimDate = userData.lastStreakClaimDate?.toDate();
      
      let streakDay = userData.streakDay || 0;
      let canClaim = false;

      if (!lastClaimDate) {
        // First time claiming
        streakDay = 1;
        canClaim = true;
      } else {
        const diffMs = now.getTime() - lastClaimDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        // Check if same day (UTC)
        const isSameDay = 
          lastClaimDate.getUTCDate() === now.getUTCDate() &&
          lastClaimDate.getUTCMonth() === now.getUTCMonth() &&
          lastClaimDate.getUTCFullYear() === now.getUTCFullYear();

        if (isSameDay) {
          return { success: false, error: "ALREADY_CLAIMED_TODAY", streakDay };
        }

        // Check if yesterday (UTC)
        const yesterday = new Date(now);
        yesterday.setUTCDate(now.getUTCDate() - 1);
        const isYesterday = 
          lastClaimDate.getUTCDate() === yesterday.getUTCDate() &&
          lastClaimDate.getUTCMonth() === yesterday.getUTCMonth() &&
          lastClaimDate.getUTCFullYear() === yesterday.getUTCFullYear();

        if (isYesterday) {
          streakDay = (streakDay % 7) + 1;
        } else {
          // Missed a day
          streakDay = 1;
        }
        canClaim = true;
      }

      if (canClaim) {
        const reward = STREAK_REWARDS[streakDay];
        const updates = {
          streakDay,
          lastStreakClaimDate: FieldValue.serverTimestamp(),
          coins: FieldValue.increment(reward.coins)
        };

        if (reward.extraSpin) {
          // Grant extra spin by clearing the dailySpinUsed flag if it was from today
          // or simply ensure it's false for the next check.
          // However, spin-wheel.js checks 'dailySpins' collection for {uid}_{todayStr}.
          // To give an EXTRA spin on Day 7, we need a way to allow a second spin today.
          // Let's add an 'extraSpinsAvailable' field to the user doc.
          updates.extraSpinsAvailable = FieldValue.increment(1);
        }

        t.update(userRef, updates);
        return { success: true, streakDay, reward };
      }

      return { success: false, error: "UNKNOWN_ERROR" };
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Streak Transaction Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
