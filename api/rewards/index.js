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

// Shared Rate Limiting Map
const rateLimits = new Map();

// Helper: Verify Auth
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED_MISSING_TOKEN');
  }

  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const uid = decodedToken?.uid;
  if (!uid) throw new Error("UNAUTHORIZED_NO_UID");
  return uid;
}

// Helper: Rate Limit
function checkRateLimit(uid) {
  const now = new Date();
  const nowMs = now.getTime();
  const userRate = rateLimits.get(uid) || { count: 0, resetTime: nowMs + 60000 };
  if (nowMs > userRate.resetTime) {
    userRate.count = 0;
    userRate.resetTime = nowMs + 60000;
  }
  if (userRate.count >= 15) { // Slightly increased since it's a consolidated endpoint
    return false;
  }
  userRate.count++;
  rateLimits.set(uid, userRate);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Missing action' });
  }

  let uid;
  try {
    uid = await verifyAuth(req);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!checkRateLimit(uid)) {
    return res.status(429).json({ error: 'Too many requests.' });
  }

  switch (action) {
    case 'daily-bonus':
      return handleDailyBonus(uid, res);
    case 'challenges':
      return handleChallenges(uid, res);
    case 'ad-payout':
      return handleAdPayout(uid, res);
    case 'claim-reward':
      return handleClaimReward(uid, res);
    case 'daily-streak':
      return handleDailyStreak(uid, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

// --- HANDLERS ---

async function handleDailyBonus(uid, res) {
  const userRef = db.collection('users').doc(uid);
  try {
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

      const userData = userDoc.data();
      const lastClaim = userData.lastDailyClaim;
      const now = new Date();

      if (lastClaim) {
        const lastClaimDate = lastClaim.toDate();
        const isSameDay = 
          lastClaimDate.getUTCDate() === now.getUTCDate() &&
          lastClaimDate.getUTCMonth() === now.getUTCMonth() &&
          lastClaimDate.getUTCFullYear() === now.getUTCFullYear();

        if (isSameDay) return { success: false, error: "Already claimed today" };
      }

      const rewardAmount = 10;
      t.update(userRef, {
        coins: FieldValue.increment(rewardAmount),
        lastDailyClaim: FieldValue.serverTimestamp()
      });

      return { success: true, reward: rewardAmount, newBalance: (userData.coins || 0) + rewardAmount };
    });

    if (!result.success) return res.status(403).json(result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Daily Bonus Error:", error);
    return res.status(error.message === "USER_NOT_FOUND" ? 404 : 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function handleChallenges(uid, res) {
  const userRef = db.collection('users').doc(uid);
  try {
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      let userData = userDoc.exists ? userDoc.data() : null;
      
      if (!userDoc.exists) {
        userData = {
          uid, coins: 0, xp: 0, streak: 1, premium: false, adsWatchedToday: 0,
          dailyQuestionUsed: false, dailyTarotUsed: false, dailySpinUsed: false,
          dailyChallengesClaimed: false, joinedAt: FieldValue.serverTimestamp()
        };
        t.set(userRef, userData);
      }

      const now = new Date();
      const isToday = (timestamp) => {
        if (!timestamp) return false;
        const d = timestamp.toDate();
        return d.getUTCDate() === now.getUTCDate() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear();
      };

      const tarotDone = isToday(userData.lastTarotReadingDate) && userData.dailyTarotUsed;
      const spinDone = isToday(userData.lastSpinDate) && userData.dailySpinUsed;
      const questionDone = isToday(userData.lastQuestionDate) && userData.dailyQuestionUsed;

      if (!tarotDone || !spinDone || !questionDone) {
        return { success: false, error: "Challenges not complete", status: { tarotDone, spinDone, questionDone } };
      }

      if (userData.dailyChallengesClaimed && isToday(userData.lastChallengeClaimDate)) {
        return { success: false, error: "Already claimed today" };
      }

      const coinReward = 20;
      const xpReward = 50;

      t.update(userRef, {
        coins: FieldValue.increment(coinReward),
        xp: FieldValue.increment(xpReward),
        dailyChallengesClaimed: true,
        lastChallengeClaimDate: FieldValue.serverTimestamp()
      });

      return { success: true, reward: { coins: coinReward, xp: xpReward }, newBalance: (userData.coins || 0) + coinReward };
    });

    if (!result.success) return res.status(403).json(result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Challenges Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleAdPayout(uid, res) {
  const userRef = db.collection('users').doc(uid);
  const MAX_ADS_PER_DAY = 5;
  const AD_REWARD_COINS = 50;

  try {
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("USER_NOT_FOUND");

      const userData = userDoc.data();
      const now = new Date();
      let adsWatchedToday = userData.adsWatchedToday || 0;
      const lastAdDate = userData.lastAdRewardDate ? userData.lastAdRewardDate.toDate() : null;

      if (lastAdDate) {
        const isNewDay = lastAdDate.getUTCDate() !== now.getUTCDate() || lastAdDate.getUTCMonth() !== now.getUTCMonth() || lastAdDate.getUTCFullYear() !== now.getUTCFullYear();
        if (isNewDay) adsWatchedToday = 0;
      }

      if (adsWatchedToday >= MAX_ADS_PER_DAY) return { success: false, error: "Daily ad limit reached" };

      const newAdsCount = adsWatchedToday + 1;
      t.update(userRef, {
        coins: FieldValue.increment(AD_REWARD_COINS),
        adsWatchedToday: newAdsCount,
        lastAdRewardDate: FieldValue.serverTimestamp()
      });

      return { success: true, reward: AD_REWARD_COINS, newBalance: (userData.coins || 0) + AD_REWARD_COINS, adsRemaining: MAX_ADS_PER_DAY - newAdsCount };
    });

    if (!result.success) return res.status(403).json(result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Ad Payout Error:", error);
    return res.status(error.message === "USER_NOT_FOUND" ? 404 : 500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function handleClaimReward(uid, res) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const spinDocId = `${uid}_${todayStr}`;
  const spinRef = db.collection('dailySpins').doc(spinDocId);
  const userRef = db.collection('users').doc(uid);

  try {
    const result = await db.runTransaction(async (t) => {
      const spinDoc = await t.get(spinRef);
      if (!spinDoc.exists) return { error: 'No spin record found for today.' };

      const spinData = spinDoc.data();
      if (spinData.claimed) return { error: 'Reward already claimed.' };

      const userUpdates = { lastRewardClaimed: FieldValue.serverTimestamp() };
      const { rewardType, rewardValue } = spinData;

      if (rewardType === 'coin') userUpdates.coins = FieldValue.increment(rewardValue);
      else if (rewardType === 'xp') userUpdates.xp = FieldValue.increment(rewardValue);

      t.set(userRef, userUpdates, { merge: true });
      t.update(spinRef, { claimed: true, claimedAt: FieldValue.serverTimestamp() });

      return { success: true, rewardType, rewardValue };
    });

    if (result.error) return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Claim Reward Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleDailyStreak(uid, res) {
  const STREAK_REWARDS = { 1: { coins: 5 }, 2: { coins: 7 }, 3: { coins: 10 }, 4: { coins: 12 }, 5: { coins: 15 }, 6: { coins: 20 }, 7: { coins: 25, extraSpin: true } };
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
        streakDay = 1; canClaim = true;
      } else {
        const isSameDay = lastClaimDate.getUTCDate() === now.getUTCDate() && lastClaimDate.getUTCMonth() === now.getUTCMonth() && lastClaimDate.getUTCFullYear() === now.getUTCFullYear();
        if (isSameDay) return { success: false, error: "ALREADY_CLAIMED_TODAY", streakDay };

        const yesterday = new Date(now);
        yesterday.setUTCDate(now.getUTCDate() - 1);
        const isYesterday = lastClaimDate.getUTCDate() === yesterday.getUTCDate() && lastClaimDate.getUTCMonth() === yesterday.getUTCMonth() && lastClaimDate.getUTCFullYear() === yesterday.getUTCFullYear();

        if (isYesterday) streakDay = (streakDay % 7) + 1;
        else streakDay = 1;
        canClaim = true;
      }

      if (canClaim) {
        const reward = STREAK_REWARDS[streakDay];
        const updates = { streakDay, lastStreakClaimDate: FieldValue.serverTimestamp(), coins: FieldValue.increment(reward.coins) };
        if (reward.extraSpin) updates.extraSpinsAvailable = FieldValue.increment(1);
        t.update(userRef, updates);
        return { success: true, streakDay, reward };
      }
      return { success: false, error: "UNKNOWN_ERROR" };
    });

    if (!result.success) return res.status(400).json(result);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Streak Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

