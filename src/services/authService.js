import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import { getUser, createUser } from "./userService";

/**
 * Signs in user anonymously and ensures their Firestore profile exists
 */
export const signInAnonymous = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    const { uid } = userCredential.user;

    // Check if user document already exists
    const userDoc = await getUser(uid);
    
    if (!userDoc) {
      // Create new user profile on first login
      const newUser = await createUser(uid);
      return newUser;
    }

    return userDoc;
  } catch (error) {
    console.error("Authentication Error:", error);
    throw error;
  }
};
