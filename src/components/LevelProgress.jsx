import React from 'react';

const LevelProgress = ({ level, currentXp, nextLevelXp, progressPercentage }) => {
  return (
    <div className="px-2 py-2">
      {/* Header Info */}
      <div className="flex justify-between items-end mb-2">
        <div className="flex flex-col">
          <span className="text-white/50 font-black text-[9px] uppercase tracking-[0.2em] mb-0.5">Current Level</span>
          <span className="text-white font-black text-2xl drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
            <span className="text-mystic-gold text-lg">Lvl</span> {level}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-mystic-gold/80 font-black text-[9px] uppercase tracking-widest mb-0.5 animate-pulse">Next Level</span>
          <div className="flex items-baseline gap-1">
            <span className="text-white font-black text-sm">{currentXp}</span>
            <span className="text-white/40 font-bold text-[10px]">/ {nextLevelXp} XP</span>
          </div>
        </div>
      </div>
      
      {/* Animated Progress Bar */}
      <div className="relative h-4 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner p-[2px]">
        <div 
          className="h-full bg-gradient-to-r from-mystic-purple via-mystic-gold to-yellow-300 rounded-full relative transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(251,191,36,0.6)]"
          style={{ width: `${Math.max(5, Math.min(100, progressPercentage))}%` }}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-[shimmer_2s_infinite] skew-x-[-20deg] -translate-x-full" />
        </div>
      </div>
    </div>
  );
};

export default LevelProgress;