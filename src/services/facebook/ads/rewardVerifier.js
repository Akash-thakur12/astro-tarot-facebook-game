import { isFBInstant } from '../../fbinstant';

/**
 * Client-side helper that requests signed proof of ad completion from the Facebook SDK,
 * and calls the server-side verify-reward endpoint to securely grant rewards.
 * 
 * @param {function} getToken - Function that returns the Firebase Auth ID Token.
 * @param {string} placementId - The ad placement ID completed by the user.
 * @returns {Promise<object>} The server response containing updated balance or status.
 */
export async function verifyRewardOnServer(getToken, placementId) {
  const idToken = await getToken();
  if (!idToken) {
    throw new Error('UNAUTHORIZED_MISSING_TOKEN');
  }
  
  let playerId = null;
  let signature = null;
  
  if (isFBInstant() && window.FBInstant) {
    try {
      // Get signed payload from Facebook Instant SDK containing verification proof
      const signedInfo = await window.FBInstant.player.getSignedPlayerInfoAsync(
        JSON.stringify({
          placementId,
          timestamp: Date.now()
        })
      );
      playerId = signedInfo.getPlayerID();
      signature = signedInfo.getSignature();
    } catch (error) {
      console.error('[Reward Verifier] Failed to get signed player info from Facebook:', error);
      throw new Error('SIGNATURE_FAILED');
    }
  } else {
    // Local / Dev Fallback values for browser environment testing
    playerId = 'mock_fb_player_id';
    signature = 'mock.signature';
  }
  
  const response = await fetch('/api/ads/verify-reward', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      placementId,
      playerId,
      signature
    })
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'SERVER_ERROR');
  }
  
  return data;
}
