import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { updateEvidenceMemory } from "../utils/evidenceMemoryEngine.js";

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

/**
 * Retrieves the user profile from users/{uid}/profile/main
 */
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  try {
    const profileRef = doc(db, COLLECTION, uid, "profile", "main");
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      return profileSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile from Firestore:", error);
    return null;
  }
};

/**
 * Saves or updates user profile in users/{uid}/profile/main using merge:true
 */
export const saveUserProfile = async (uid, profileData, existingProfile = null) => {
  if (!uid || !profileData) return null;
  try {
    const profileRef = doc(db, COLLECTION, uid, "profile", "main");
    const createdAt = existingProfile?.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const dataToSave = {
      ...profileData,
      profileVersion: 1,
      profileCompleted: true,
      createdAt,
      updatedAt
    };

    await setDoc(profileRef, dataToSave, { merge: true });

    // Sync profile attributes to Evidence Memory Engine
    try {
      const factsRef = doc(db, COLLECTION, uid, "facts", "current");
      const factsSnap = await getDoc(factsRef);

      let facts = {
        married: { value: null, confidence: 0 },
        hasChildren: { value: null, confidence: 0 },
        hasJob: { value: null, confidence: 0 },
        hasBusiness: { value: null, confidence: 0 },
        gender: { value: null, confidence: 0 }
      };

      if (factsSnap.exists()) {
        facts = { ...facts, ...factsSnap.data() };
      }

      const newFacts = {};

      // Marital Status mapping
      if (profileData.maritalStatus === "Married") {
        newFacts.married = true;
      } else if (profileData.maritalStatus === "Single") {
        newFacts.married = false;
      }

      // Occupation mapping
      const jobTypes = [
        "Private Job",
        "Government Job",
        "Doctor",
        "Engineer",
        "Teacher",
        "Lawyer",
        "Army",
        "Police",
        "Student"
      ];
      const businessTypes = [
        "Business Owner",
        "Trader",
        "Freelancer",
        "Content Creator",
        "Self Employed"
      ];

      if (jobTypes.includes(profileData.occupation)) {
        newFacts.hasJob = true;
      } else if (businessTypes.includes(profileData.occupation)) {
        newFacts.hasBusiness = true;
      } else if (profileData.occupation === "Unemployed") {
        newFacts.hasJob = false;
      }

      if (Object.keys(newFacts).length > 0) {
        const { storedFacts, updated } = updateEvidenceMemory(
          facts,
          newFacts,
          "profile",
          "Sync from profile details"
        );
        if (updated) {
          await setDoc(factsRef, storedFacts, { merge: true });
        }
      }
    } catch (syncError) {
      console.error("Error syncing profile to evidence memory:", syncError);
    }

    return dataToSave;
  } catch (error) {
    console.error("Error saving user profile to Firestore:", error);
    throw error;
  }
};
