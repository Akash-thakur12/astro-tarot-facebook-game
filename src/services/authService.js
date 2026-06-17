import { 
  signInAnonymously, 
  signInWithPopup, 
  signInWithCustomToken,
  signOut,
  linkWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "./firebase";

/**
 * Signs in with a custom token (Bridge mode)
 */
export const signInWithFBBridge = async (customToken) => {
  try {
    const userCredential = await signInWithCustomToken(auth, customToken);
    return userCredential.user;
  } catch (error) {
    console.error("Custom Token Authentication Error:", error);
    throw error;
  }
};

/**
 * Signs in user anonymously
 * Provisioning is handled by backend check-status API
 */
export const signInAnonymous = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Anonymous Authentication Error:", error);
    throw error;
  }
};

/**
 * Signs in with Google
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

/**
 * Signs in with Facebook
 */
export const signInWithFacebook = async () => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    return result.user;
  } catch (error) {
    console.error("Facebook Sign-In Error:", error);
    throw error;
  }
};

/**
 * Signs out current user
 */
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-Out Error:", error);
    throw error;
  }
};

/**
 * Links an existing anonymous account with a permanent provider
 */
export const linkAccount = async (providerName) => {
  if (!auth.currentUser) throw new Error("No user to link");
  
  let provider;
  if (providerName === 'google') provider = googleProvider;
  else if (providerName === 'facebook') provider = facebookProvider;
  else throw new Error("Invalid provider");

  try {
    const result = await linkWithPopup(auth.currentUser, provider);
    return result.user;
  } catch (error) {
    console.error("Account Linking Error:", error);
    throw error;
  }
};
