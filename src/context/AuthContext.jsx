import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { signInAnonymous } from '../services/authService';
import { getUser } from '../services/userService';
import { AuthContext } from './AuthContextInstance';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches the latest user data from Firestore
   */
  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      const userData = await getUser(auth.currentUser.uid);
      setUser(userData);
      return userData;
    }
    return null;
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      try {
        if (firebaseUser) {
          // Listen for real-time changes to the user document
          unsubscribeSnapshot = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              console.log("DEBUG: AuthContext - User data updated from onSnapshot:", data.dailySpinUsed);
              setUser(data);
              setLoading(false);
            } else {
              // User doc doesn't exist yet, wait for provisioning
              provisionUser(firebaseUser.uid);
            }
          });
        } else {
          // No user, attempt anonymous sign in
          await signInAnonymous();
        }
      } catch (error) {
        console.error("Auth Context Initialization Error:", error);
        setLoading(false);
      }
    });

    const provisionUser = async () => {
      try {
        const newUser = await signInAnonymous();
        setUser(newUser);
      } catch (err) {
        console.error("Provisioning Error:", err);
      } finally {
        setLoading(false);
      }
    };

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const value = {
    user,
    loading,
    refreshUser
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-mystic-gold/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-mystic-gold rounded-full animate-spin" />
          <div className="absolute inset-4 border-4 border-mystic-purple/20 rounded-full" />
          <div className="absolute inset-4 border-4 border-b-mystic-purple rounded-full animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
        </div>
        <h2 className="text-2xl font-bold premium-gradient-text animate-pulse">Consulting The Stars...</h2>
        <p className="text-white/40 text-sm mt-4 uppercase tracking-[0.4em] font-bold">Your destiny is being written</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
