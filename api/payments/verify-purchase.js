import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

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

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

  // 3. Cryptographic Signature Verification
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing Razorpay payment identifiers" });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');

  const isVerified = expectedSignature === razorpay_signature;

  if (!isVerified) {
    console.error("Payment Signature Mismatch!");
    return res.status(400).json({ error: "Payment verification failed: Signature mismatch" });
  }

  const userRef = db.collection('users').doc(uid);
  const purchaseRef = db.collection('premiumPurchases').doc(razorpay_payment_id);

  try {
    await db.runTransaction(async (t) => {
      // Check if purchase already processed
      const purchaseDoc = await t.get(purchaseRef);
      if (purchaseDoc.exists) {
        throw new Error("PURCHASE_ALREADY_PROCESSED");
      }

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // 4. Create premiumPurchases record
      t.set(purchaseRef, {
        uid,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: amount || 4900, 
        verified: true,
        createdAt: FieldValue.serverTimestamp()
      });

      // 5. Update User Document (THE ONLY AUTHORITATIVE SOURCE)
      t.update(userRef, {
        premium: true,
        subscriptionExpiry: thirtyDaysFromNow,
        lastPurchaseDate: FieldValue.serverTimestamp()
      });
    });

    return res.status(200).json({ 
      success: true, 
      status: 'Premium Seeker',
      expiry: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error("Premium Verification Transaction Error:", error);
    if (error.message === "PURCHASE_ALREADY_PROCESSED") {
      return res.status(400).json({ error: "This payment has already been processed." });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
