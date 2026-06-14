import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";

/**
 * Signs in user anonymously
 * Provisioning is handled by backend check-status API
 */
export const signInAnonymous = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Authentication Error:", error);
    throw error;
  }
};
