import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import Button from './ui/Button';

const STREAK_REWARDS = [
  { day: 1, coins: 3 },
  { day: 2, coins: 5 },
  { day: 3, coins: 8 },
  { day: 4, coins: 10 },
  { day: 5, coins: 12 },
  { day: 6, coins: 14 },
  { day: 7, coins: 15, extraSpin: true }
];

const DailyStreakCard = () => {
  const { user, refreshUser, getToken } = useAuth();
  const { currentLanguage } = useLanguage();
  const isHindi = currentLanguage === 'Hindi';
  const [loading, setLoading] = useState(false);
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    if (user) {
      const lastClaimDate = user.lastStreakClaimDate?.toDate();
      if (!lastClaimDate) {
        setCanClaim(true);
      } else {
        const now = new Date();
        const isSameDay = 
          lastClaimDate.getUTCDate() === now.getUTCDate() &&
          lastClaimDate.getUTCMonth() === now.getUTCMonth() &&
          lastClaimDate.getUTCFullYear() === now.getUTCFullYear();
        setCanClaim(!isSameDay);
      }
    }
  }, [user]);

  const handleClaim = async () => {
    if (!canClaim || loading) return;
    setLoading(true);
    try {
      const idToken = await getToken();
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'daily-streak' })
      });
      const data = await response.json();
      if (data.success) {
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to claim streak reward:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentStreakDay = user?.streakDay || 0;
  // If missed a day (not today, not yesterday), UI should show Day 1 target
  // but let's keep it simple and show where they are.

  const t = {
    title: isHindi ? '7-दिवसीय लकी स्ट्रीक' : '7-Day Lucky Streak',
    subtitle: isHindi ? 'हर दिन लॉग इन करें और भव्य पुरस्कार जीतें!' : 'Login daily to unlock mystic rewards!',
    claim: isHindi ? 'अभी दावा करें' : 'Claim Reward',
    claimed: isHindi ? 'कल वापस आएं' : 'Come back tomorrow',
    day: isHindi ? 'दिन' : 'Day'
  };

  return (
    <div className="col-span-2 bg-gradient-to-br from-indigo-900/40 via-[#18181b] to-purple-900/20 p-6 rounded-[2.5rem] border border-mystic-purple/30 relative overflow-hidden group shadow-[0_10px_30px_rgba(99,102,241,0.15)]">
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-mystic-purple/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-mystic-purple/30 transition-all duration-700" />
      
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-white/60 text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5">
              <span className="text-mystic-purple">✨</span> {t.title}
            </h3>
            <p className="text-white font-black text-xl tracking-tight drop-shadow-lg">
              {t.day} {currentStreakDay === 7 && !canClaim ? 7 : (canClaim ? (currentStreakDay % 7) + 1 : currentStreakDay)}
            </p>
          </div>
          
          <div className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
             <span className="text-mystic-gold text-xs">🔥</span>
             <span className="text-white font-black text-xs">{currentStreakDay}</span>
          </div>
        </div>

        {/* 7 Day Grid */}
        <div className="grid grid-cols-7 gap-2">
          {STREAK_REWARDS.map((reward, i) => {
            const isCompleted = reward.day <= currentStreakDay && (!canClaim || reward.day < (currentStreakDay % 7) + 1);
            const isCurrent = canClaim ? reward.day === (currentStreakDay % 7) + 1 : false;
            
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`
                  w-full aspect-square rounded-xl flex items-center justify-center text-[10px] font-bold transition-all duration-500
                  ${isCompleted ? 'bg-mystic-gold text-mystic-indigo shadow-[0_0_10px_rgba(251,191,36,0.4)]' : 
                    isCurrent ? 'bg-white/10 text-mystic-gold border border-mystic-gold/50 animate-pulse' : 
                    'bg-white/5 text-white/20 border border-white/5'}
                `}>
                  {isCompleted ? '✓' : reward.coins}
                </div>
                <span className={`text-[8px] font-black uppercase ${isCurrent ? 'text-mystic-gold' : 'text-white/30'}`}>
                  D{reward.day}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 mt-2">
          <p className="text-[10px] text-white/40 font-bold leading-relaxed max-w-[140px]">
            {t.subtitle}
          </p>
          
          <Button 
            onClick={handleClaim} 
            disabled={!canClaim || loading}
            variant={canClaim ? "gold" : "primary"}
            className={`flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest ${!canClaim ? 'opacity-50 grayscale' : ''}`}
          >
            {loading ? '...' : (canClaim ? t.claim : t.claimed)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyStreakCard;
