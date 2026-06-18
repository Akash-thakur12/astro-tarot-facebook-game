import { 
  doc, 
  getDoc, 
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp
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

/**
 * Saves a pandit message to user's history collection
 */
export const savePanditMessage = async (uid, role, content) => {
  if (!uid || !content) return null;
  try {
    const historyRef = collection(db, COLLECTION, uid, "panditHistory");
    const newDoc = await addDoc(historyRef, {
      role,
      content,
      timestamp: serverTimestamp()
    });
    return newDoc.id;
  } catch (error) {
    console.error("Error saving pandit message to Firestore:", error);
    return null;
  }
};

/**
 * Retrieves the latest 100 messages from pandit history
 */
export const getPanditHistory = async (uid) => {
  if (!uid) return null;
  try {
    const historyRef = collection(db, COLLECTION, uid, "panditHistory");
    const q = query(
      historyRef, 
      orderBy("timestamp", "desc"), 
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp
      };
    });
    // Reverse to return ascending order for chat UI
    return docs.reverse();
  } catch (error) {
    console.error("Error getting pandit history from Firestore:", error);
    return null;
  }
};
