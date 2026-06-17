import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { verifyFacebookSignature } from '../_utils/verifyFacebookSignature.js';

// Restore Firebase Admin initialization
const apps = getApps();

if (!apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, signature } = req.body;
  const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

  // 1. Basic Request Validation
  if (!playerId || !signature) {
    return res.status(400).json({ error: 'Missing playerId or signature in request body' });
  }

  if (!APP_SECRET) {
    console.error("Bridge: FACEBOOK_APP_SECRET not configured.");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 2. Verify Facebook Signature
  const verifiedPayload = verifyFacebookSignature(signature, APP_SECRET);
  
  if (!verifiedPayload) {
    return res.status(401).json({ error: 'Invalid Facebook signature' });
  }

  // 3. Ensure Player ID matches signature (Hardened string comparison)
  if (String(verifiedPayload.player_id) !== String(playerId)) {
    console.error(`Bridge ID Mismatch: payload=${verifiedPayload.player_id}, body=${playerId}`);
    return res.status(401).json({ error: 'Player ID mismatch' });
  }

  try {
    // 4. Generate Firebase Custom Token
    const customToken = await getAuth().createCustomToken(playerId, {
      provider: 'fbinstant',
      fbPlayerId: playerId
    });

    console.log(`Bridge: Verified & Generated custom token for FB Player ${playerId}`);

    return res.status(200).json({
      success: true,
      customToken
    });

  } catch (error) {
    console.error("Bridge Error:", error);
    return res.status(500).json({ error: 'Failed to generate custom token' });
  }
}
