import * as adConfig from '../../../config/adConfig';

export const Placements = {
  REWARDED: {
    TAROT_UNLOCK: {
      id: adConfig.REWARDED_TAROT_UNLOCK_ID || 'PASTE_REWARDED_ID_HERE',
      dailyLimit: 5,
      cooldownMs: 30000,
      rewardCoins: 0, // Unlocks reading directly
      purpose: 'tarot-unlock'
    },
    COIN_PAYOUT: {
      id: adConfig.REWARDED_COIN_PAYOUT_ID || 'PASTE_REWARDED_ID_HERE_COIN',
      dailyLimit: 5,
      cooldownMs: 30000,
      rewardCoins: 50,
      purpose: 'coin-payout'
    }
  },
  INTERSTITIAL: {
    TAROT: {
      id: adConfig.INTERSTITIAL_TAROT_ID || 'PASTE_INTERSTITIAL_ID_HERE',
      cooldownMs: 60000,
      purpose: 'tarot-post-draw'
    },
    WHEEL: {
      id: adConfig.INTERSTITIAL_WHEEL_ID || 'PASTE_INTERSTITIAL_ID_HERE',
      cooldownMs: 60000,
      purpose: 'wheel-post-spin'
    },
    PANDIT: {
      id: adConfig.INTERSTITIAL_PANDIT_ID || 'PASTE_INTERSTITIAL_ID_HERE',
      cooldownMs: 60000,
      purpose: 'pandit-post-chat'
    }
  },
  BANNER: {
    HOME: {
      id: adConfig.BANNER_HOME_ID || 'PASTE_BANNER_ID_HERE'
    },
    TAROT: {
      id: adConfig.BANNER_TAROT_ID || 'PASTE_BANNER_ID_HERE'
    }
  }
};
