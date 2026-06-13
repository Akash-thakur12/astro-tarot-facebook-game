import React from 'react';

const DailyChallengesCard = ({ challenges = [], rewards = { coins: 50, xp: 20 }, onClaim, isClaimed = false }) => {
  const completedCount = challenges.filter(c => c.completed).length;
  const totalCount = challenges.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const canClaim = completedCount === totalCount && !isClaimed;

  return (
    <div className="col-span-2 bg-gradient-to-b from-[#18181b] to-[#09090b] p-6 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-lg">
      {/* Background Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-mystic-gold/5 blur-[50px] pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5">
        
        {/* Header & Progress Text */}
        <div className="flex justify-between items-center">
          <h3 className="text-white/80 text-[11px] uppercase tracking-[0.2em] font-black flex items-center gap-1.5">
            <span className="text-xl">🎯</span> Daily Challenges
          </h3>
          <span className="text-mystic-gold font-bold text-[10px] tracking-widest bg-mystic-gold/10 px-3 py-1 rounded-full border border-mystic-gold/20">
            {isClaimed ? 'CLAIMED' : `${completedCount} / ${totalCount}`}
          </span>
        </div>

        {/* Global Progress Bar */}
        <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px] shadow-inner">
          <div 
            className={`h-full ${isClaimed ? 'bg-mystic-gold' : 'bg-gradient-to-r from-emerald-500 to-emerald-300'} rounded-full relative transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]`}
            style={{ width: `${isClaimed ? 100 : progress}%` }}
          >
             <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite] skew-x-[-20deg] -translate-x-full" />
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3 pt-2">
          {challenges.map((challenge, idx) => (
            <div 
              key={challenge.id || idx} 
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 ${
                challenge.completed || isClaimed
                  ? 'bg-emerald-500/5 border border-emerald-500/20' 
                  : 'bg-white/5 border border-white/5'
              }`}
            >
              {/* Checkbox Icon */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                challenge.completed || isClaimed
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-110' 
                  : 'border-2 border-mystic-gold/50 bg-black/40'
              }`}>
                {(challenge.completed || isClaimed) && <span className="text-[10px] font-black">✓</span>}
              </div>
              
              {/* Task Title */}
              <div className="flex-1">
                <p className={`text-sm font-bold transition-colors ${
                  challenge.completed || isClaimed ? 'text-white/40 line-through' : 'text-white/90'
                }`}>
                  {challenge.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Rewards Summary */}
        <div className="mt-2 flex items-center justify-between bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5">
          <div className="flex flex-col">
             <span className="text-white/40 text-[9px] uppercase tracking-widest font-bold mb-1">Rewards</span>
             <div className="flex gap-3">
               <span className="text-mystic-gold font-black text-sm flex items-center gap-1 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">
                 +{rewards.coins} 🪙
               </span>
               <span className="text-mystic-purple font-black text-sm flex items-center gap-1 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                 +{rewards.xp} XP
               </span>
             </div>
          </div>
          
          <button 
            onClick={onClaim}
            disabled={!canClaim}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg ${
              canClaim
                ? 'bg-mystic-gold text-mystic-indigo hover:bg-yellow-400 active:scale-95 shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-bounce' 
                : isClaimed 
                  ? 'bg-white/10 text-mystic-gold/50 border border-mystic-gold/20 cursor-default'
                  : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
            }`}
          >
            {isClaimed ? 'Claimed' : 'Claim'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DailyChallengesCard;