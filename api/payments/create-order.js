import Razorpay from 'razorpay';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin for auth check
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

const adminAuth = getAuth();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verify Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken?.uid) throw new Error("No UID in token");
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.warn("create-order: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing. Returning mock order details.");
    return res.status(200).json({
      id: `mock_order_${Date.now()}`,
      amount: 9900,
      currency: "INR",
      key: "mock_key_id"
    });
  }

  // 2. Initialize Razorpay
  const razorpay = new Razorpay({
    key_id,
    key_secret,
  });

  // 3. Create Order (₹99 = 9900 paise)
  const options = {
    amount: 9900, 
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
    notes: {
      description: "AstroTarot Premium - Seeker Status"
    }
  };

  try {
    const order = await razorpay.orders.create(options);
    return res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: key_id
    });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
}
