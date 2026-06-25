import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '../_utils/auth.js';
import { verifyFacebookSignature } from '../_utils/verifyFacebookSignature.js';

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Server-Side Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let uid;

  try {
    const decodedToken = await verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error("No UID in token");
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token', details: error.message });
  }

  const userRef = db.collection('users').doc(uid);
  const body = req.body || {};
  const { displayName, photoURL, email, provider } = body;

  // Process Meta IAP Active Purchases to auto-restore Premium state
  const activePurchases = body.activePurchases || [];
  let hasActiveMetaPremium = false;
  let metaPurchaseTime = null;
  const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

  if (activePurchases.length > 0 && APP_SECRET) {
    for (const purchase of activePurchases) {
      if (purchase.productID === 'premium_seeker_status' && purchase.signedRequest) {
        let isMock = false;
        if (
          (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') &&
          purchase.signedRequest === 'mock.signature_payload'
        ) {
          isMock = true;
        }

        let verifiedPayload = null;
        if (!isMock) {
          verifiedPayload = verifyFacebookSignature(purchase.signedRequest, APP_SECRET);
        }

        if (isMock || (verifiedPayload && String(verifiedPayload.payment_id) === String(purchase.paymentID))) {
          const purchaseTimeMs = parseInt(purchase.purchaseTime) || Date.now();
          // Active if within 30 days
          if (Date.now() - purchaseTimeMs < 30 * 24 * 60 * 60 * 1000) {
            hasActiveMetaPremium = true;
            metaPurchaseTime = new Date(purchaseTimeMs);
            break;
          }
        }
      }
    }
  }

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
          coins: 40, // Starting coins
          xp: 0,
          streak: 1,
          premium: hasActiveMetaPremium,
          subscriptionExpiry: hasActiveMetaPremium && metaPurchaseTime 
            ? new Date(metaPurchaseTime.getTime() + 30 * 24 * 60 * 60 * 1000) 
            : null,
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

      // Sync active Meta premium purchase if found
      if (hasActiveMetaPremium && metaPurchaseTime) {
        const expiryDate = new Date(metaPurchaseTime.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (!user.premium || !user.subscriptionExpiry || user.subscriptionExpiry.toDate() < expiryDate) {
          updates.premium = true;
          updates.subscriptionExpiry = expiryDate;
          needsUpdate = true;
        }
      }

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
          const targetExpiry = updates.subscriptionExpiry || expiryDate;
          if (now > targetExpiry) {
            updates.premium = false;
            updates.subscriptionExpiry = null;
            needsUpdate = true;
          }
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
