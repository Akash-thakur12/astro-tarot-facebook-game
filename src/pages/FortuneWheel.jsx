import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Button from '../components/ui/Button';

const REWARDS = [
  { id: 0, label: "5 Coins", icon: "🪙", bg: "#b45309", type: 'coin', value: 5 },
  { id: 1, label: "10 Coins", icon: "🪙", bg: "#d97706", type: 'coin', value: 10 },
  { id: 2, label: "20 Coins", icon: "🪙", bg: "#b45309", type: 'coin', value: 20 },
  { id: 3, label: "50 Coins", icon: "💰", bg: "#d97706", type: 'coin', value: 50 },
  { id: 4, label: "100 Coins", icon: "💎", bg: "#f59e0b", type: 'coin', value: 100 },
  { id: 5, label: "Bonus Tarot", icon: "🃏", bg: "#be185d", type: 'tarot', value: 0 },
  { id: 6, label: "2x XP", icon: "⭐", bg: "#7e22ce", type: 'xp', value: 0 },
  { id: 7, label: "Miss", icon: "💨", bg: "#334155", type: 'miss', value: 0 },
];

const FortuneWheel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Explicit State Management
  const [spinState, setSpinState] = useState('idle'); // 'idle' | 'spinning' | 'finished'
  const [rotation, setRotation] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [wonReward, setWonReward] = useState(null);
  const [showShower, setShowShower] = useState(false);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [localCoins, setLocalCoins] = useState(0);

  // Sync local coins with global user state initially
  useEffect(() => {
    if (user?.coins !== undefined) {
      setLocalCoins(user.coins);
    }
  }, [user?.coins]);

  // Generates the conic-gradient string for the wheel background
  const generateGradient = () => {
    let gradient = "conic-gradient(from -22.5deg, ";
    REWARDS.forEach((r, i) => {
      const startAngle = i * 45;
      const endAngle = (i + 1) * 45;
      gradient += `${r.bg} ${startAngle}deg ${endAngle}deg${i === REWARDS.length - 1 ? '' : ', '}`;
    });
    gradient += ")";
    return gradient;
  };

  const handleSpin = async () => {
    if (spinState === 'spinning' || hasSpunToday) return;
    
    setSpinState('fetching');
    setShowPopup(false);
    setShowShower(false);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/spin-wheel', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) throw new Error("Too many requests.");
        throw new Error(data.error || "Failed to spin");
      }

      if (data.alreadySpun) {
        setHasSpunToday(true);
        setSpinState('idle');
        return; // Handled visually by state
      }

      const targetId = data.reward.rewardId;
      const targetReward = REWARDS.find(r => r.id === targetId) || REWARDS[0];

      setSpinState('spinning');

      // Calculate rotation: 8 full spins + target slice offset
      const spins = 8; 
      const degreesPerSlice = 360 / REWARDS.length;
      const targetRotation = (360 - (targetId * degreesPerSlice));
      
      // Add extra spins to the current rotation
      const currentBase = Math.floor(rotation / 360) * 360;
      const finalRotation = currentBase + (spins * 360) + targetRotation;

      setRotation(finalRotation);

      // Animation Duration: 5 seconds
      setTimeout(() => {
        setSpinState('finished');
        setWonReward(targetReward);
        setShowPopup(true);
        setHasSpunToday(true); // Mark as spun today
        
        if (targetReward.type === 'coin') {
           setLocalCoins(prev => prev + targetReward.value);
        }

        if (targetReward.type !== 'miss') {
          setShowShower(true);
        }
      }, 5000);

    } catch (error) {
      console.error("Spin error:", error);
      setSpinState('idle');
      // Briefly show an error toast or just revert to idle
    }
  };

  const handleClaim = () => {
    setShowPopup(false);
    setShowShower(false);
  };

  // Generate coin particles for the shower effect
  const renderCoinShower = () => {
    if (!showShower) return null;
    const particles = Array.from({ length: 40 });
    return (
      <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
        {particles.map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 1.5;
          const duration = 2 + Math.random() * 2;
          const size = 20 + Math.random() * 20;
          return (
            <div
              key={i}
              className="absolute -top-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] coin-particle"
              style={{
                left: `${left}%`,
                fontSize: `${size}px`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`
              }}
            >
              {wonReward?.icon || '🪙'}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#09090b] relative overflow-hidden font-sans">
      
      {/* Dynamic Keyframes for Coin Shower */}
      <style>{`
        @keyframes coin-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .coin-particle {
          animation: coin-fall linear forwards;
        }
      `}</style>

      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-mystic-gold/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-mystic-purple/20 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex justify-between items-center relative z-10">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white active:scale-95 transition-all"
        >
          ←
        </button>
        <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-2xl border border-mystic-gold/30">
          <span className="text-lg">🪙</span>
          <span className="text-mystic-gold font-black text-sm">{user?.coins || 0}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 pb-20">
        
        {/* Title Area */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            Fortune <span className="text-mystic-gold">Wheel</span>
          </h1>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Spin daily for cosmic rewards</p>
        </div>

        {/* Wheel Container */}
        <div className="relative w-80 h-80 max-w-[90vw] max-h-[90vw]">
          
          {/* Outer Ring Glow */}
          <div className="absolute inset-[-10px] rounded-full bg-gradient-to-tr from-mystic-gold via-yellow-200 to-amber-600 animate-[spin_4s_linear_infinite] opacity-50 blur-[5px]" />
          
          {/* Main Wheel Wrapper */}
          <div className="absolute inset-0 rounded-full border-8 border-[#18181b] shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* The Spinning Wheel */}
            <div 
              className="w-full h-full rounded-full relative transition-transform ease-[cubic-bezier(0.15,0.85,0.2,1)]"
              style={{ 
                background: generateGradient(),
                transform: `rotate(${rotation}deg)`,
                transitionDuration: '4000ms'
              }}
            >
              {/* Slice Borders (SVG Lines) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                {REWARDS.map((_, i) => (
                  <line 
                    key={i} 
                    x1="50" y1="50" x2="50" y2="0" 
                    stroke="rgba(0,0,0,0.5)" 
                    strokeWidth="0.8" 
                    transform={`rotate(${i * 45 + 22.5} 50 50)`} 
                  />
                ))}
              </svg>

              {/* Reward Content inside slices */}
              {REWARDS.map((reward, i) => {
                const rot = i * 45; // Center of slice content
                return (
                  <div 
                    key={i} 
                    className="absolute w-full h-full flex justify-center pt-[15%] origin-center"
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    <div className="flex flex-col items-center">
                       <span className="text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{reward.icon}</span>
                       <span className="text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-1 max-w-[60px] text-center leading-tight">
                         {reward.label}
                       </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Center Spin Button / Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button 
              onClick={handleSpin}
              disabled={spinState === 'spinning'}
              className={`w-20 h-20 rounded-full border-4 border-mystic-gold bg-gradient-to-b from-[#18181b] to-black flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-transform ${spinState === 'spinning' ? 'opacity-80 scale-95' : 'hover:scale-105 active:scale-95'}`}
            >
              <span className="text-mystic-gold font-black uppercase tracking-widest text-xs">Spin</span>
            </button>
          </div>

          {/* Top Pointer Arrow */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 40L0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16L16 40Z" fill="url(#paint0_linear)"/>
              <path d="M16 38L2 16C2 8.26801 8.26801 2 16 2C23.732 2 30 8.26801 30 16L16 38Z" stroke="#FBBF24" strokeWidth="2"/>
              <defs>
                <linearGradient id="paint0_linear" x1="16" y1="0" x2="16" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FBBF24" />
                  <stop offset="1" stopColor="#B45309" />
                </linearGradient>
              </defs>
            </svg>
          </div>

        </div>

        {/* Daily Spin Status */}
        <div className="mt-12 text-center animate-fade-in">
          <div className={`px-6 py-2.5 rounded-full border ${hasSpunToday ? 'bg-white/5 border-white/10 text-white/40' : 'bg-mystic-gold/10 border-mystic-gold/30 text-mystic-gold'} inline-block shadow-lg`}>
            <span className="text-[11px] font-black uppercase tracking-widest">
              {hasSpunToday ? 'Already Spun Today' : 'Daily Free Spin Available'}
            </span>
          </div>
        </div>

      </div>

      {/* Reward Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-sm rounded-[3rem] p-8 border border-mystic-gold/30 text-center relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-mystic-gold/10 to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <h3 className="text-white/60 text-xs uppercase tracking-widest font-bold">
                {wonReward?.type === 'miss' ? 'Better luck next time' : 'You Won!'}
              </h3>
              
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-mystic-gold/20 to-amber-600/20 flex items-center justify-center text-6xl border border-mystic-gold/30 shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-bounce">
                {wonReward?.icon}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-mystic-gold uppercase tracking-tight">
                  {wonReward?.label}
                </h2>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                  {wonReward?.type === 'miss' ? 'Try again tomorrow' : 'Added to your account'}
                </p>
              </div>

              <Button 
                fullWidth 
                variant="gold" 
                onClick={handleClaim}
                className="h-14 rounded-2xl font-black text-sm tracking-widest uppercase mt-4"
              >
                {wonReward?.type === 'miss' ? 'Continue' : 'Claim Reward'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Render Falling Coins */}
      {renderCoinShower()}

    </div>
  );
};

export default FortuneWheel;