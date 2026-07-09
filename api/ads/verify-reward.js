import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '../../lib/auth.js';
import { verifyFacebookSignature } from '../../lib/verifyFacebookSignature.js';

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Authenticate Request
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error('No UID in token');
  } catch (error) {
    console.error('[Verify Reward] Auth failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const { placementId, playerId, signature } = req.body;
  if (!placementId || !signature) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // 2. Validate Facebook Signature
  const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  let isMock = false;

  // Allow mock signature for local dev context
  if (
    process.env.NODE_ENV === 'development' &&
    !process.env.VERCEL_ENV &&
    signature === 'mock.signature'
  ) {
    isMock = true;
    console.warn('[Verify Reward] Using mock signature for local development only');
  }

  if (!isMock) {
    if (!APP_SECRET) {
      console.error('[Verify Reward] FACEBOOK_APP_SECRET is not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const verifiedPayload = verifyFacebookSignature(signature, APP_SECRET);
    if (!verifiedPayload) {
      console.error('[Verify Reward] Signature verification failed');
      return res.status(401).json({ error: 'Invalid Facebook signature' });
    }

    // Ensure player ID matches
    if (String(verifiedPayload.player_id) !== String(playerId)) {
      console.error('[Verify Reward] Player ID mismatch in signature');
      return res.status(401).json({ error: 'Player ID mismatch' });
    }

    // Verify placement ID and timestamp in signed request metadata
    let metadata = {};
    try {
      metadata = JSON.parse(verifiedPayload.request_payload || '{}');
    } catch (e) {
      console.error('[Verify Reward] Failed to parse signature payload metadata:', e);
    }

    if (metadata.placementId !== placementId) {
      console.error('[Verify Reward] Placement ID mismatch in payload metadata');
      return res.status(400).json({ error: 'Placement ID mismatch' });
    }

    // Verify timestamp age (tolerance: 5 minutes / 300000ms)
    const age = Date.now() - (metadata.timestamp || 0);
    if (age > 300000 || age < -300000) {
      console.error('[Verify Reward] Signature expired, age:', age);
      return res.status(400).json({ error: 'Signature expired' });
    }
  }

  // 3. Database Transaction & Reward Granting
  const userRef = db.collection('users').doc(uid);
  const cleanSignatureHash = signature.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  const claimRef = db.collection('users').doc(uid).collection('rewardClaims').doc(cleanSignatureHash);

  try {
    const result = await db.runTransaction(async (t) => {
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check for Replay Attack
      const claimSnap = await t.get(claimRef);
      if (claimSnap.exists) {
        throw new Error('DUPLICATE_REWARD');
      }

      const userData = userSnap.data();
      const now = new Date();
      let adsWatchedToday = userData.adsWatchedToday || 0;
      const lastAdDate = userData.lastAdRewardDate ? userData.lastAdRewardDate.toDate() : null;

      if (lastAdDate) {
        const isNewDay =
          lastAdDate.getUTCDate() !== now.getUTCDate() ||
          lastAdDate.getUTCMonth() !== now.getUTCMonth() ||
          lastAdDate.getUTCFullYear() !== now.getUTCFullYear();
        if (isNewDay) {
          adsWatchedToday = 0;
        }
      }

      // Daily limit validation
      if (adsWatchedToday >= 5) {
        throw new Error('DAILY_LIMIT');
      }

      // Update User Profile autoritatively
      const isCoinPayout = placementId.includes('coin') || placementId === 'coin-payout' || placementId.includes('COIN');
      const userUpdates = {
        adsWatchedToday: adsWatchedToday + 1,
        lastAdRewardDate: FieldValue.serverTimestamp()
      };

      if (isCoinPayout) {
        userUpdates.coins = FieldValue.increment(50);
      } else {
        userUpdates.dailyTarotUsed = false;
        userUpdates.lastTarotUnlockDate = FieldValue.serverTimestamp();
      }

      t.update(userRef, userUpdates);

      // Write claims log to prevent replay attacks
      t.set(claimRef, {
        placementId,
        playerId: playerId || 'mock',
        isMock,
        claimedAt: FieldValue.serverTimestamp()
      });

      return {
        success: true,
        adsWatchedToday: adsWatchedToday + 1,
        rewardCoins: isCoinPayout ? 50 : 0
      };
    });

    console.log('[Verify Reward] Transaction successful, reward granted for UID:', uid);
    return res.status(200).json(result);

  } catch (error) {
    console.error('[Verify Reward] Transaction failed:', error.message);
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User profile not found' });
    }
    if (error.message === 'DUPLICATE_REWARD') {
      return res.status(400).json({ error: 'Reward already claimed.' });
    }
    if (error.message === 'DAILY_LIMIT') {
      return res.status(403).json({ error: 'Daily ad limit reached' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
