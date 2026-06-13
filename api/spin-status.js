import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

console.log("FUNCTION LOADED");
console.log("PROJECT_ID:", process.env.FIREBASE_PROJECT_ID ? "FOUND" : "MISSING");
console.log("CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL ? "FOUND" : "MISSING");
console.log("PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "FOUND" : "MISSING");

const apps = getApps();
if (!apps || apps.length === 0) {
  console.log("FIREBASE INIT START");
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
    } else {
      initializeApp();
    }
    console.log("FIREBASE INIT SUCCESS");
  } catch (e) {
    console.log("FIREBASE INIT FAILED:", e.message);
    if (!e.message?.includes('already exists')) {
      throw e;
    }
  }
}

const db = getFirestore();
const adminAuth = getAuth();

export default async function handler(req, res) {
  console.log("REQUEST RECEIVED");
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    console.log("AUTH VERIFY START");
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
    console.log("AUTH VERIFY SUCCESS");
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const spinDocId = `${uid}_${todayStr}`;
  const spinRef = db.collection('dailySpins').doc(spinDocId);

  try {
    console.log("FIRESTORE READ START");
    const spinDoc = await spinRef.get();
    console.log("FIRESTORE READ SUCCESS");
    console.log("RESPONSE SENT");
    return res.status(200).json({ hasSpunToday: spinDoc.exists });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check status' });
  }
}
