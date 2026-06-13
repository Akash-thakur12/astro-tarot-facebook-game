import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "users";

/**
 * Creates a new user document with default values
 */
export const createUser = async (uid) => {
  const userRef = doc(db, COLLECTION, uid);
  const userData = {
    uid,
    coins: 100,
    premium: false,
    streak: 1,
    adsWatchedToday: 0,
    subscriptionExpiry: null,
    joinedAt: serverTimestamp(),
  };

  await setDoc(userRef, userData);
  return userData;
};

/**
 * Retrieves user data from Firestore
 */
export const getUser = async (uid) => {
  if (!uid) return null;
  const userRef = doc(db, COLLECTION, uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
};

/**
 * Updates user coin balance
 */
export const updateCoins = async (uid, amount) => {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    coins: increment(amount)
  });
};

/**
 * Updates premium status and expiry
 */
export const updatePremium = async (uid, isPremium, expiry = null) => {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    premium: isPremium,
    subscriptionExpiry: expiry
  });
};

/**
 * Increments ads watched count and rewards user with coins
 */
export const watchRewardAds = async (uid, rewardAmount = 50) => {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    adsWatchedToday: increment(1),
    coins: increment(rewardAmount)
  });
};

/**
 * Claims daily bonus using a secure Firestore transaction
 */
export const claimDailyBonus = async (uid, rewardAmount = 25) => {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("User does not exist");
      }

      const userData = userDoc.data();
      const lastClaim = userData.lastDailyClaim;

      if (lastClaim && typeof lastClaim.toDate === 'function') {
        const lastClaimDate = lastClaim.toDate();
        const now = new Date();

        const isSameDay = 
          lastClaimDate.getDate() === now.getDate() &&
          lastClaimDate.getMonth() === now.getMonth() &&
          lastClaimDate.getFullYear() === now.getFullYear();

        if (isSameDay) {
          throw new Error("Already claimed today");
        }
      }

      transaction.update(userRef, {
        coins: increment(rewardAmount),
        lastDailyClaim: serverTimestamp()
      });
    });
  } catch (error) {
    console.error("Secure Claim Error:", error.message);
    throw error;
  }
};

/**
 * Checks if premium has expired and updates Firestore if necessary
 */
export const checkPremiumExpiry = async (user) => {
  if (!user?.premium || !user?.subscriptionExpiry) return false;
  if (typeof user.subscriptionExpiry.toDate !== 'function') return true;

  const expiryDate = user.subscriptionExpiry.toDate();
  const now = new Date();

  if (now > expiryDate) {
    const userRef = doc(db, COLLECTION, user.uid);
    await updateDoc(userRef, {
      premium: false,
      subscriptionExpiry: null
    });
    return false;
  }
  return true;
};

/**
 * Handles the logic for using the daily free personal reading/compatibility check or deducting coins securely
 */
export const executePanditAI = async (uid, isFree = false, type = 'personal') => {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("User does not exist");
      }

      const userData = userDoc.data();
      if (userData.premium) return;

      if (isFree) {
        if (type === 'personal') {
          if (userData.dailyQuestionUsed) {
            throw new Error("Free personal reading already used today");
          }
          transaction.update(userRef, {
            dailyQuestionUsed: true,
            lastQuestionDate: serverTimestamp()
          });
        } else if (type === 'compatibility') {
          if (userData.dailyCompUsed) {
            throw new Error("Free compatibility reading already used today");
          }
          transaction.update(userRef, {
            dailyCompUsed: true,
            lastCompDate: serverTimestamp()
          });
        }
      } else {
        if ((userData.coins || 0) < 10) {
          throw new Error("Not enough coins");
        }
        transaction.update(userRef, {
          coins: increment(-10)
        });
      }
    });
  } catch (error) {
    console.error("AI Secure Deduction Error:", error.message);
    throw error;
  }
};

/**
 * Resets the daily question status if a new day has started
 */
export const resetDailyQuestionIfNewDay = async (user) => {
  if (!user?.uid) return;
  
  let needsUpdate = false;
  const updates = {};
  const now = new Date();

  if (user.lastQuestionDate && typeof user.lastQuestionDate.toDate === 'function') {
    const lastDate = user.lastQuestionDate.toDate();
    const isNewDay = 
      lastDate.getDate() !== now.getDate() || 
      lastDate.getMonth() !== now.getMonth() || 
      lastDate.getFullYear() !== now.getFullYear();

    if (isNewDay && user.dailyQuestionUsed) {
      updates.dailyQuestionUsed = false;
      needsUpdate = true;
    }
  }

  if (user.lastCompDate && typeof user.lastCompDate.toDate === 'function') {
    const lastDateComp = user.lastCompDate.toDate();
    const isNewDayComp = 
      lastDateComp.getDate() !== now.getDate() || 
      lastDateComp.getMonth() !== now.getMonth() || 
      lastDateComp.getFullYear() !== now.getFullYear();

    if (isNewDayComp && user.dailyCompUsed) {
      updates.dailyCompUsed = false;
      needsUpdate = true;
    }
  }

  if (user.lastSpinDate && typeof user.lastSpinDate.toDate === 'function') {
    const lastDateSpin = user.lastSpinDate.toDate();
    const isNewDaySpin = 
      lastDateSpin.getDate() !== now.getDate() || 
      lastDateSpin.getMonth() !== now.getMonth() || 
      lastDateSpin.getFullYear() !== now.getFullYear();

    if (isNewDaySpin && user.dailySpinUsed) {
      updates.dailySpinUsed = false;
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    const userRef = doc(db, COLLECTION, user.uid);
    await updateDoc(userRef, updates);
  }
};

/**
 * Upgrades user to premium
 * 
 * TODO: SECURITY RISK - CURRENTLY DEVELOPMENT ONLY
 * Premium must be granted only after verified payment on a secure backend.
 * The frontend must never be treated as trusted to write premium status directly.
 * 
 * Required Future Architecture:
 * 1. User clicks "Upgrade".
 * 2. Frontend calls Vercel Serverless Function to create a Checkout Session (e.g. Stripe/Razorpay).
 * 3. Payment Gateway processes payment.
 * 4. Payment Gateway sends a secure Webhook back to Vercel.
 * 5. Vercel backend securely verifies the signature and updates Firestore `premium: true`.
 */
export const purchasePremium = async (uid) => {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  await updateDoc(userRef, {
    premium: true,
    subscriptionExpiry: thirtyDaysFromNow
  });
};

/**
 * Saves a detailed tarot reading to the user's history sub-collection
 */
export const saveTarotReading = async (uid, readingData) => {
  if (!uid) return;
  try {
    const historyRef = collection(db, COLLECTION, uid, "tarotHistory");
    const docRef = await addDoc(historyRef, {
      cardName: readingData.cardName,
      date: new Date().toLocaleDateString(),
      timestamp: serverTimestamp(),
      lovePrediction: readingData.lovePrediction || "",
      careerPrediction: readingData.careerPrediction || "",
      healthPrediction: readingData.healthPrediction || "",
    });

    const userRef = doc(db, COLLECTION, uid);
    await updateDoc(userRef, {
      lastTarotReadingDate: serverTimestamp(),
      dailyTarotUsed: true
    });

    console.log("Tarot reading saved successfully! ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving tarot reading:", error);
    throw error;
  }
};

/**
 * Retrieves the last 5 tarot readings for a user from their sub-collection
 */
export const getTarotHistory = async (uid) => {
  if (!uid) return [];
  const historyRef = collection(db, COLLECTION, uid, "tarotHistory");
  const q = query(
    historyRef, 
    orderBy("timestamp", "desc"), 
    limit(5)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Unlocks one extra reading via ad
 */
export const unlockExtraTarotReading = async (uid) => {
  if (!uid) return;
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    dailyTarotUsed: false,
    adsWatchedToday: increment(1)
  });
};

/**
 * Helper to check if user can take a free tarot reading today
 */
export const canReadTarotToday = (user) => {
  if (!user) return false;
  if (user.premium) return true;
  if (!user.dailyTarotUsed) return true;
  if (!user.lastTarotReadingDate || typeof user.lastTarotReadingDate.toDate !== 'function') return false;

  const lastReadDate = user.lastTarotReadingDate.toDate();
  const now = new Date();

  return (
    lastReadDate.getDate() !== now.getDate() ||
    lastReadDate.getMonth() !== now.getMonth() ||
    lastReadDate.getFullYear() !== now.getFullYear()
  );
};

/**
 * Resets tarot daily status if new day
 */
export const resetTarotDailyIfNewDay = async (user) => {
  if (!user?.uid || !user.lastTarotReadingDate || typeof user.lastTarotReadingDate.toDate !== 'function') return;

  const lastDate = user.lastTarotReadingDate.toDate();
  const now = new Date();
  
  const isNewDay = 
    lastDate.getDate() !== now.getDate() || 
    lastDate.getMonth() !== now.getMonth() || 
    lastDate.getFullYear() !== now.getFullYear();

  if (isNewDay && user.dailyTarotUsed) {
    const userRef = doc(db, COLLECTION, user.uid);
    await updateDoc(userRef, {
      dailyTarotUsed: false
    });
  }
};
