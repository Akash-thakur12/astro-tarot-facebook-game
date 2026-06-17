import crypto from 'crypto';

/**
 * Verifies a Facebook Instant Games Signed Player Information signature.
 * 
 * @param {string} signedRequest - The dot-separated signature and payload from FBInstant.
 * @param {string} appSecret - Your Facebook App Secret.
 * @returns {object|null} The verified payload or null if invalid.
 */
export function verifyFacebookSignature(signedRequest, appSecret) {
  if (!signedRequest || !appSecret) {
    console.error('VerifyFB: Missing signature or app secret');
    return null;
  }

  try {
    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      console.error('VerifyFB: Invalid signature format (expected 2 parts)');
      return null;
    }

    const [encodedSig, payload] = parts;

    // 1. Decode signature
    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    // 2. Verify HMAC SHA-256
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest();

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      console.error('VerifyFB: Signature mismatch');
      return null;
    }

    // 3. Decode payload
    const decodedPayload = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    return decodedPayload;
  } catch (error) {
    console.error('VerifyFB: Verification failed', error);
    return null;
  }
}
