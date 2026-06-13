import React from 'react';

const DailyStreakCard = ({ currentStreak = 7, nextReward = 50 }) => {
  const milestones = [3, 7, 14, 30];
  const nextMilestone = milestones.find(m => m > currentStreak) || milestones[milestones.length - 1];
  const progress = Math.min((currentStreak / nextMilestone) * 100, 100);

  return (
    <div className="col-span-2 bg-gradient-to-br from-orange-900/40 via-[#18181b] to-red-900/20 p-6 rounded-[2.5rem] border border-orange-500/30 relative overflow-hidden group shadow-[0_10px_30px_rgba(249,115,22,0.15)]">
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-orange-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-orange-500/30 transition-all duration-700" />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-8xl opacity-10 drop-shadow-[0_0_20px_rgba(249,115,22,1)] animate-pulse pointer-events-none">🔥</div>

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-white/60 text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5">
            <span className="text-orange-500 text-sm animate-bounce">🔥</span> Daily Streak
          </h3>
          <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-[9px] text-orange-400 font-bold uppercase tracking-wider">
            Target: {nextMilestone} Days
          </div>
        </div>

        {/* Streak Number */}
        <div className="flex items-baseline gap-2">
          <span className="text-white font-black text-5xl drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">
            {currentStreak}
          </span>
          <span className="text-white/50 font-bold text-sm tracking-widest uppercase">Days</span>
        </div>

        {/* Milestone Progress Bar */}
        <div className="space-y-1.5 pt-2">
           <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px] shadow-inner">
             <div 
               className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-yellow-400 rounded-full relative shadow-[0_0_10px_rgba(249,115,22,0.8)] transition-all duration-1000 ease-out"
               style={{ width: `${progress}%` }}
             >
                <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite] skew-x-[-20deg] -translate-x-full" />
             </div>
           </div>
           <div className="flex justify-between px-1">
             {milestones.map(m => (
               <div key={m} className="flex flex-col items-center">
                 <div className={`w-1 h-1 rounded-full mb-1 ${currentStreak >= m ? 'bg-orange-400 shadow-[0_0_5px_rgba(249,115,22,1)]' : 'bg-white/20'}`} />
                 <span className={`text-[8px] font-black uppercase ${currentStreak >= m ? 'text-orange-400' : 'text-white/30'}`}>
                   {m}d
                 </span>
               </div>
             ))}
           </div>
        </div>

        {/* Reward Info */}
        <div className="mt-1 flex items-center justify-between bg-black/40 backdrop-blur-md p-4 rounded-[1.5rem] border border-white/5">
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] uppercase tracking-widest font-bold mb-0.5">Tomorrow's Reward</span>
            <span className="text-mystic-gold font-black text-sm flex items-center gap-1.5 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">
              +{nextReward} Coins <span className="text-lg">🪙</span>
            </span>
          </div>
          <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-[10px] text-white font-bold uppercase tracking-wider transition-all">
            View All
          </button>
        </div>

      </div>
    </div>
  );
};

export default DailyStreakCard;