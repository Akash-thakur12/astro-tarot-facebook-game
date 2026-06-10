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
  where,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "users";
const HISTORY_COLLECTION = "tarotHistory";

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
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    coins: increment(amount)
  });
};

/**
 * Updates premium status and expiry
 */
export const updatePremium = async (uid, isPremium, expiry = null) => {
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
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    adsWatchedToday: increment(1),
    coins: increment(rewardAmount)
  });
};

/**
 * Claims daily bonus
 */
export const claimDailyBonus = async (uid, rewardAmount = 25) => {
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    coins: increment(rewardAmount),
    lastDailyClaim: serverTimestamp()
  });
};

/**
 * Checks if premium has expired and updates Firestore if necessary
 */
export const checkPremiumExpiry = async (user) => {
  if (!user?.premium || !user?.subscriptionExpiry) return false;

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
 * Handles the logic for using the daily free question or deducting coins
 */
export const executePanditAI = async (uid, isFree = false) => {
  const userRef = doc(db, COLLECTION, uid);
  const updates = {};

  if (isFree) {
    updates.dailyQuestionUsed = true;
    updates.lastQuestionDate = serverTimestamp();
  } else {
    updates.coins = increment(-10);
  }

  await updateDoc(userRef, updates);
};

/**
 * Resets the daily question status if a new day has started
 */
export const resetDailyQuestionIfNewDay = async (user) => {
  if (!user?.uid) return;
  
  const lastDate = user.lastQuestionDate?.toDate();
  const now = new Date();
  
  const isNewDay = !lastDate || 
    lastDate.getDate() !== now.getDate() || 
    lastDate.getMonth() !== now.getMonth() || 
    lastDate.getFullYear() !== now.getFullYear();

  if (isNewDay && user.dailyQuestionUsed) {
    const userRef = doc(db, COLLECTION, user.uid);
    await updateDoc(userRef, {
      dailyQuestionUsed: false
    });
  }
};

/**
 * Upgrades user to premium
 */
export const purchasePremium = async (uid) => {
  const userRef = doc(db, COLLECTION, uid);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  await updateDoc(userRef, {
    premium: true,
    subscriptionExpiry: thirtyDaysFromNow
  });
};

/**
 * Records a tarot reading and sets the date
 */
export const recordTarotReading = async (uid, cardName) => {
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    lastTarotReadingDate: serverTimestamp(),
    dailyTarotUsed: true
  });

  // Save to history
  await addDoc(collection(db, HISTORY_COLLECTION), {
    userId: uid,
    cardName,
    timestamp: serverTimestamp()
  });
};

/**
 * Retrieves the last 5 tarot readings for a user
 */
export const getTarotHistory = async (uid) => {
  const historyRef = collection(db, HISTORY_COLLECTION);
  const q = query(
    historyRef, 
    where("userId", "==", uid), 
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
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    dailyTarotUsed: false, // Reset only for this session/day
    adsWatchedToday: increment(1)
  });
};

/**
 * Resets tarot daily status if new day
 */
export const resetTarotDailyIfNewDay = async (user) => {
  if (!user?.uid) return;
  
  const lastDate = user.lastTarotReadingDate?.toDate();
  const now = new Date();
  
  const isNewDay = !lastDate || 
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
