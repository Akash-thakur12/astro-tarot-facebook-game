import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. Initialize Firebase Admin
const apps = getApps();
if (!apps || apps.length === 0) {
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
  } catch (e) {
    if (!e.message?.includes('already exists')) throw e;
  }
}

const db = getFirestore();
const adminAuth = getAuth();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Server-Side Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let uid;

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken?.uid;
    if (!uid) throw new Error("No UID in token");
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const { orderId, paymentId, signature } = req.body;

  // 3. Mock Payment Verification Placeholder
  // In production, this would verify the signature with Razorpay/Stripe secret keys
  if (!orderId || !paymentId) {
    return res.status(400).json({ error: "Missing payment identifiers" });
  }

  const userRef = db.collection('users').doc(uid);

  try {
    // 4. Update Premium Status and Expiry
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    await userRef.update({
      premium: true,
      subscriptionExpiry: thirtyDaysFromNow,
      lastPurchaseDate: FieldValue.serverTimestamp()
    });

    return res.status(200).json({ 
      success: true, 
      status: 'Seeker',
      expiry: thirtyDaysFromNow.toISOString()
    });

  } catch (error) {
    console.error("Premium Update Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
