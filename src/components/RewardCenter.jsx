import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { auth } from '../services/firebase';
import { showRewardedAd } from '../services/fbAds';
import { Placements } from '../services/facebook/ads/placements';

const RewardCenter = () => {
  const { user, refreshUser, getToken } = useAuth();
  const { currentLanguage } = useLanguage();
  const [isWatching, setIsWatching] = useState(false);
  
  const adsWatched = user?.adsWatchedToday || 0;
  const maxAds = 5;
  const canWatch = adsWatched < maxAds;

  const handleWatchAd = async () => {
    if (!canWatch || isWatching) return;
    
    setIsWatching(true);
    
    try {
      // Trigger actual Facebook SDK rewarded ad with server-side validation
      await showRewardedAd(Placements.REWARDED.COIN_PAYOUT.id);
      await refreshUser();
    } catch (error) {
      console.error("Ad Reward Error:", error.message);
    } finally {
      setIsWatching(false);
    }
  };

  const isHindi = currentLanguage === 'Hindi';

  // Translations
  const tr = {
    title: isHindi ? 'निःशुल्क सिक्के कमाएं' : 'Earn Free Coins',
    subtitle: isHindi ? 'आध्यात्मिक ऊर्जा' : 'Spirit Boost',
    energy: isHindi ? 'ऊर्जा:' : 'ENERGY:',
    watchButton: isHindi ? 'देखें और 50 सिक्के कमाएं' : 'WATCH & EARN 50 🪙',
    transmitting: isHindi ? 'प्रसारण हो रहा है...' : 'TRANSMITTING...',
    limit: isHindi ? 'आज की सीमा समाप्त' : 'LIMIT REACHED TODAY',
  };

  const setIsWatchingAd = (val) => setIsWatching(val);

  return (
    <div className="w-full glass-card p-5 rounded-[2rem] border-white/5 space-y-4 relative overflow-hidden group">
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/10 blur-[40px] rounded-full group-hover:bg-blue-600/20 transition-all duration-1000" />

      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-black mb-1">
            {tr.subtitle}
          </span>
          <h3 className="text-xl font-black tracking-tight text-white/90">
            {tr.title}
          </h3>
        </div>
        <div className="flex flex-col items-end">
           <div className="px-2 py-0.5 glass rounded-md border border-white/10 bg-white/5">
             <span className={`text-[10px] font-black tracking-tighter ${canWatch ? 'text-blue-400' : 'text-red-400/80'}`}>
               {tr.energy} {adsWatched} / {maxAds}
             </span>
           </div>
        </div>
      </div>

      <button
        disabled={!canWatch || isWatching}
        onClick={handleWatchAd}
        className={`w-full h-14 rounded-2xl font-black transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group active:scale-[0.98] ${
          canWatch 
            ? 'bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 text-white shadow-[0_10px_30px_rgba(37,99,235,0.25)]' 
            : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
        }`}
      >
        {isWatching ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="tracking-widest text-sm">{tr.transmitting}</span>
          </div>
        ) : canWatch ? (
          <>
            <span className="text-2xl transition-transform group-hover:scale-110 group-hover:rotate-12">📺</span>
            <span className="tracking-tight uppercase">{tr.watchButton}</span>
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </>
        ) : (
          <>
            <span className="text-xl opacity-40">🚫</span>
            <span className="uppercase font-bold tracking-widest text-xs">{tr.limit}</span>
          </>
        )}
      </button>

      <div className="flex justify-center items-center gap-1.5 pt-1">
         {[1, 2, 3, 4].map((i) => (
           <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= adsWatched ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-white/5'}`} />
         ))}
      </div>
    </div>
  );
};

export default RewardCenter;
