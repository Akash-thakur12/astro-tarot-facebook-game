import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { auth } from '../services/firebase';

const DailyBonus = () => {
  const { user, refreshUser } = useAuth();
  const { currentLanguage } = useLanguage();
  const [timeLeft, setTimeLeft] = useState('');
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const checkClaimStatus = () => {
      if (!user?.lastDailyClaim) {
        setCanClaim(true);
        return;
      }

      const lastClaim = user.lastDailyClaim.toDate();
      const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();

      if (now >= nextClaim) {
        setCanClaim(true);
      } else {
        setCanClaim(false);
        const diff = nextClaim - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    checkClaimStatus();
    const interval = setInterval(checkClaimStatus, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return;
    setIsClaiming(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'daily-bonus' })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim reward');
      }

      await refreshUser();
    } catch (error) {
      console.error("Claim Error:", error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const isHindi = currentLanguage === 'Hindi';

  return (
    <div className="w-full glass-card p-5 rounded-[2rem] border-white/5 space-y-4 relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-mystic-gold/10 blur-[40px] rounded-full group-hover:bg-mystic-gold/20 transition-all duration-1000" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] text-mystic-gold font-black mb-1">
            {isHindi ? 'दिव्य उपहार' : 'Celestial Gift'}
          </span>
          <h3 className="text-xl font-black tracking-tight text-white/90">
            {isHindi ? 'दैनिक बोनस' : 'Daily Bonus'}
          </h3>
        </div>
        <div className="flex flex-col items-end">
           <div className="px-3 py-1 bg-mystic-gold/10 rounded-full border border-mystic-gold/20">
              <span className="text-xs font-black text-mystic-gold">+25 🪙</span>
           </div>
           <span className="text-[8px] font-bold text-white/20 mt-1 uppercase tracking-widest">
             {isHindi ? 'अगला उपहार: 50 🪙' : 'Next reward: 50 🪙'}
           </span>
        </div>
      </div>

      <button
        disabled={!canClaim || isClaiming}
        onClick={handleClaim}
        className={`w-full h-14 rounded-2xl font-black transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group active:scale-[0.98] ${
          canClaim 
            ? 'bg-gradient-to-br from-mystic-gold via-yellow-400 to-amber-600 text-mystic-indigo shadow-[0_10px_30px_rgba(251,191,36,0.3)]' 
            : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
        }`}
      >
        {canClaim ? (
          <>
            <span className="text-2xl group-hover:animate-bounce transition-transform text-mystic-indigo">🎁</span>
            <span className="text-mystic-indigo">
              {isClaiming ? (isHindi ? 'सितारों का मिलन...' : 'Aligning Stars...') : (isHindi ? 'उपहार प्राप्त करें' : 'CLAIM REWARD')}
            </span>
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </>
        ) : (
          <>
            <span className="text-lg opacity-40">⌛</span>
            <span className="font-bold tracking-wider">
              {isHindi ? 'अगला उपहार ' : 'REFRESHING IN '} {timeLeft}
            </span>
          </>
        )}
      </button>
      
      <div className="flex justify-center items-center gap-4 opacity-50 grayscale transition-all group-hover:grayscale-0 group-hover:opacity-100">
         {[1, 2, 3, 4, 5].map((d) => (
           <div key={d} className={`w-1.5 h-1.5 rounded-full ${d <= (user?.streak % 5 || 5) ? 'bg-mystic-gold shadow-[0_0_8px_#fbbf24]' : 'bg-white/10'}`} />
         ))}
      </div>
    </div>
  );
};

export default DailyBonus;
