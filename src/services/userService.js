import { 
  doc, 
  getDoc, 
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "users";

/**
 * Retrieves user data from Firestore (Read-only)
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
 * Retrieves the last 5 tarot readings for a user from their sub-collection (Read-only)
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
 * Helper to check if user can take a free tarot reading today (Read-only Logic)
 */
export const canReadTarotToday = (user) => {
  if (!user || user.isNewUser) return true;
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
