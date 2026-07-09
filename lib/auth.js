import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

const initializeFirebaseAdmin = () => {
  const apps = getApps();
  if (apps.length > 0) return apps[0];

  const projectId = process.env.FIREBASE_PROJECT_ID || 'astrotarot-3bc2a';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      })
    });
  } else {
    // Local development fallback
    return initializeApp({
      projectId: projectId
    });
  }
};

const adminAuth = getAuth(initializeFirebaseAdmin());

export async function verifyIdToken(idToken) {
  try {
    // If we are in local development and missing keys, we might want to mock.
    // However, let's try real verification first.
    return await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Auth Verification Error:", error.message);
    
    // MOCK FOR LOCAL DEV if specifically enabled
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') {
        console.warn("MOCK AUTH ENABLED: Returning guest UID");
        if (idToken.startsWith('mock_')) {
            return { uid: idToken.replace('mock_', '') };
        }
        // If it's a real Firebase token but we can't verify it because of missing keys,
        // we might still want to allow it for testing if it "looks" like a token.
        if (idToken.length > 100) {
             // Extract UID from unverified token if possible (unsafe, but okay for local test)
             try {
                const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                return { uid: payload.user_id || payload.sub };
             } catch (e) {
                return { uid: 'guest_test_user' };
             }
        }
    }
    throw error;
  }
}
