import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { verifyFacebookSignature } from '../_utils/verifyFacebookSignature.js';

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

  // 3. Provider Abstraction Mapping & Cryptographic Verification
  const provider = req.body.provider || 'razorpay';
  const payload = req.body.provider ? req.body.payload : req.body;

  let verified = false;
  let paymentId = '';
  let orderId = '';
  let amount = 9900; // default ₹99 in paise

  if (provider === 'meta') {
    if (!payload || !payload.signedRequest || !payload.paymentID) {
      return res.status(400).json({ error: "Missing Meta purchase identifiers" });
    }

    const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
    if (!APP_SECRET) {
      console.error("verify-purchase: FACEBOOK_APP_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Dev bypass for local testing
    let isMock = false;
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.VERCEL_ENV &&
      payload.signedRequest === 'mock.signature_payload'
    ) {
      isMock = true;
      console.warn("verify-purchase: Using mock signature for local development only");
    }

    if (isMock) {
      verified = true;
    } else {
      const verifiedPayload = verifyFacebookSignature(payload.signedRequest, APP_SECRET);
      if (!verifiedPayload) {
        return res.status(400).json({ error: "Meta signature verification failed" });
      }
      
      if (String(verifiedPayload.payment_id) !== String(payload.paymentID)) {
        return res.status(400).json({ error: "Meta Payment ID mismatch" });
      }
      verified = true;
      amount = verifiedPayload.amount ? parseFloat(verifiedPayload.amount) * 100 : 9900; 
    }
    
    paymentId = payload.paymentID;
    orderId = payload.purchaseToken || '';

  } else if (provider === 'razorpay') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing Razorpay payment identifiers" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signBody = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signBody.toString())
      .digest('hex');

    verified = (expectedSignature === razorpay_signature);
    if (!verified) {
      return res.status(400).json({ error: "Razorpay signature mismatch" });
    }

    paymentId = razorpay_payment_id;
    orderId = razorpay_order_id;
    amount = payload.amount || 9900;
  } else {
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }

  // 4. Authoritative Database Transaction
  const userRef = db.collection('users').doc(uid);
  const purchaseRef = db.collection('premiumPurchases').doc(paymentId);

  try {
    await db.runTransaction(async (t) => {
      // Check if purchase already processed
      const purchaseDoc = await t.get(purchaseRef);
      if (purchaseDoc.exists) {
        throw new Error("PURCHASE_ALREADY_PROCESSED");
      }

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Create purchase log document
      t.set(purchaseRef, {
        uid,
        provider,
        paymentId,
        orderId,
        amount,
        verified: true,
        createdAt: FieldValue.serverTimestamp()
      });

      // Update user status
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
