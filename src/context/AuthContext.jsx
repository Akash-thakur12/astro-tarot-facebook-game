import { useEffect, useState, useCallback, useMemo } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { getUser } from '../services/userService';
import { AuthContext } from './AuthContextInstance';
import { isFBInstant, getFBPlayer } from '../services/fbinstant';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authSource, setAuthSource] = useState(isFBInstant() ? 'fbinstant' : 'firebase');

  /**
   * Abstracted token retrieval
   * Prioritizes Firebase ID Token once bridge is active.
   */
  const getToken = useCallback(async () => {
    try {
      // Highest priority: Firebase session established by bridge or standard login
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken(true);
      }

      // Fallback only before bridge completes or in unique FB contexts
      if (authSource === 'fbinstant' && window.FBInstant) {
        const signedInfo = await window.FBInstant.player.getSignedPlayerInfoAsync('bridge_auth');
        return signedInfo.getSignature();
      }

      return null;
    } catch (error) {
      console.error('Token retrieval failed:', error);
      return null;
    }
  }, [authSource]);

  /**
   * Fetches the latest user data from Firestore
   */
  const refreshUser = useCallback(async () => {
    const uid = authSource === 'fbinstant' ? getFBPlayer()?.id : auth.currentUser?.uid;
    if (uid) {
      const userData = await getUser(uid);
      setUser(prev => ({ ...prev, ...userData }));
      return userData;
    }
    return null;
  }, [authSource]);

  useEffect(() => {
    const handleBridgeLogin = async () => {
      if (authSource === 'fbinstant') {
        const fbPlayer = getFBPlayer();
        if (fbPlayer && window.FBInstant) {
          try {
            // Get cryptographic signature from Facebook
            const signedInfo = await window.FBInstant.player.getSignedPlayerInfoAsync('bridge_auth');
            const signature = signedInfo.getSignature();

            // Call our hardened Bridge API
            const response = await fetch('/api/auth/fb-bridge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                playerId: fbPlayer.id,
                signature: signature
              })
            });
            const data = await response.json();
            
            if (data.success && data.customToken) {
              await signInWithCustomToken(auth, data.customToken);
              
              const firebaseUser = auth.currentUser;
              console.log('Bridge Success', {
                uid: firebaseUser?.uid,
                provider: authSource,
              });

              const jwt = await auth.currentUser?.getIdToken();
              console.log('Firebase JWT acquired:', !!jwt);
            }
          } catch (e) {
            console.error("Bridge Login Failed:", e);
            // Fallback: Map FB Player to UI state even if Firebase login fails
            setUser({
              uid: fbPlayer.id,
              displayName: fbPlayer.name,
              photoURL: fbPlayer.photo,
              provider: 'fbinstant'
            });
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    };

    handleBridgeLogin();

    // Unified Firebase Auth Flow
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      try {
        if (firebaseUser) {
          unsubscribeSnapshot = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
            const baseUser = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              provider: authSource // 'fbinstant' or 'firebase'
            };

            if (docSnap.exists()) {
              setUser({ ...baseUser, ...docSnap.data() });
            } else {
              setUser({ ...baseUser, isNewUser: true });
            }
            setLoading(false);
          });
        } else if (authSource !== 'fbinstant') {
          // Only clear user if not in FB mode (FB mode handles its own fallback)
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth Context Initialization Error:", error);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [authSource]);

  const value = useMemo(() => ({
    user,
    loading,
    refreshUser,
    getToken,
    authSource
  }), [user, loading, refreshUser, getToken, authSource]);

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
