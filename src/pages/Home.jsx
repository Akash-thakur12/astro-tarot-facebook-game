import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { checkPremiumExpiry } from '../services/userService';
import Button from '../components/ui/Button';
import LevelProgress from '../components/LevelProgress';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentLanguage, setLanguage } = useLanguage();
  
  // State structure for Level Progression (Mock Data)
  // Formula: L1=0, L2=100, L3=250, L4=500, L5=800
  // Simulating user is at Level 4, current XP is 420. Next level (L5) requires 500 XP total, but relative to level it's usually current / next threshold.
  // The example requested: 420 / 600 XP (L4 to L5 requires 800 - 500 = 300? Let's use the explicit example: 420 / 600)
  const [levelInfo, setLevelInfo] = useState({ 
    level: 5, 
    xp: 420, 
    nextLevelXp: 600 
  });
  const [streak, setStreak] = useState(3);

  useEffect(() => {
    if (user) {
      checkPremiumExpiry(user);
    }
  }, [user]);

  const isHindi = currentLanguage === 'Hindi';

  // Translations for Gamified Home Page
  const th = {
    level: isHindi ? 'स्तर' : 'Level',
    xp: 'XP',
    streakTitle: isHindi ? 'दैनिक स्ट्रीक' : 'Daily Streak',
    days: isHindi ? 'दिन' : 'Days',
    nextReward: isHindi ? 'अगला इनाम: 50 🪙' : 'Next Reward: 50 🪙',
    dailyReward: isHindi ? 'दैनिक इनाम' : 'Daily Reward',
    claim: isHindi ? 'दावा करें' : 'Claim',
    tarotTitle: isHindi ? 'आज का टैरो' : "Today's Tarot",
    drawCard: isHindi ? 'कार्ड निकालें' : 'Draw Card',
    fortuneWheel: isHindi ? 'भाग्य का पहिया' : 'Fortune Wheel',
    spinNow: isHindi ? 'अभी घुमाएं' : 'Spin Now',
    askPandit: isHindi ? 'पंडित एआई से पूछें' : 'Ask Pandit AI',
    continueChat: isHindi ? 'चैट जारी रखें' : 'Continue Chat',
    challenges: isHindi ? 'दैनिक चुनौतियां' : 'Daily Challenges',
    challenge1: isHindi ? '1 टैरो कार्ड पढ़ें' : 'Read 1 Tarot Card',
    challenge2: isHindi ? 'पंडित जी से 1 प्रश्न पूछें' : 'Ask Pandit 1 Question',
    premium: isHindi ? 'प्रीमियम' : 'Premium',
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-32 animate-fade-in bg-[#09090b] relative overflow-hidden font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-mystic-gold/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-mystic-purple/10 blur-[100px] pointer-events-none" />

      {/* LANGUAGE SELECTOR */}
      <div className="absolute top-4 right-4 z-[110]">
         <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-2xl">
            <button 
              onClick={() => setLanguage('English')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${currentLanguage === 'English' ? 'bg-mystic-gold text-[#09090b] shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'text-white/40 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('Hindi')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${currentLanguage === 'Hindi' ? 'bg-mystic-gold text-[#09090b] shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'text-white/40 hover:text-white'}`}
            >
              हिं
            </button>
         </div>
      </div>

      <div className="px-5 pt-8 space-y-6 relative z-10">
        
        {/* TOP HEADER: Avatar, Name, Coins */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-3xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-mystic-gold to-amber-600 p-[2px] shadow-[0_0_15px_rgba(251,191,36,0.3)]">
              <div className="w-full h-full rounded-full bg-[#09090b] flex items-center justify-center text-xl overflow-hidden border border-black">
                {user?.photoURL ? <img src={user.photoURL} alt="User" /> : '👤'}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm tracking-wide">
                {user?.displayName || (isHindi ? 'अतिथि' : 'Guest')}
              </span>
              {user?.premium && (
                <span className="text-[9px] uppercase tracking-widest text-mystic-gold font-black flex items-center gap-1">
                  ⭐ {th.premium}
                </span>
              )}
            </div>
          </div>
          <div 
            onClick={() => navigate('/premium')}
            className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-mystic-gold/30 cursor-pointer active:scale-95 transition-transform"
          >
            <span className="text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse">🪙</span>
            <span className="text-mystic-gold font-black text-lg">{user?.coins || 0}</span>
          </div>
        </div>

        {/* LEVEL & XP PROGRESS */}
        <div className="px-2">
          <div className="flex justify-between items-end mb-2">
            <span className="text-white/80 font-bold text-xs uppercase tracking-wider">{th.level} <span className="text-mystic-gold text-lg">{levelInfo.level}</span></span>
            <span className="text-white/40 text-[10px] font-bold">{levelInfo.xp} / {levelInfo.maxXp} {th.xp}</span>
          </div>
          <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <div 
              className="h-full bg-gradient-to-r from-mystic-purple to-mystic-gold rounded-full relative"
              style={{ width: `${(levelInfo.xp / levelInfo.maxXp) * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] skew-x-[-20deg] -translate-x-full" />
            </div>
          </div>
        </div>

        {/* MAIN CARDS GRID */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* 1. DAILY STREAK */}
          <div className="col-span-2 bg-gradient-to-br from-orange-500/10 to-red-500/5 p-5 rounded-[2rem] border border-orange-500/20 flex justify-between items-center relative overflow-hidden group">
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-7xl opacity-20 drop-shadow-[0_0_15px_rgba(249,115,22,1)]">🔥</div>
            <div>
              <h3 className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-1">{th.streakTitle}</h3>
              <div className="text-white font-black text-3xl flex items-baseline gap-1">
                {streak} <span className="text-sm font-bold text-white/50 mb-1">{th.days}</span>
              </div>
              <p className="text-orange-400 text-[10px] font-bold mt-1">{th.nextReward}</p>
            </div>
            <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center border border-orange-500/30 text-2xl shadow-[0_0_20px_rgba(249,115,22,0.2)]">
              🔥
            </div>
          </div>

          {/* 2. ASK PANDIT */}
          <div 
            onClick={() => navigate('/ask-pandit')}
            className="col-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-900/20 p-6 rounded-[2.5rem] border border-indigo-500/30 relative overflow-hidden shadow-[0_10px_30px_rgba(79,70,229,0.15)] cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/20 blur-[40px] rounded-full" />
            <div className="flex items-center gap-4 relative z-10 mb-4">
              <div className="text-4xl drop-shadow-lg">🔮</div>
              <div>
                <h3 className="text-white font-black text-xl">{th.askPandit}</h3>
                <p className="text-indigo-300/80 text-[10px] uppercase tracking-widest font-bold">AI Astrologer</p>
              </div>
            </div>
            <Button variant="primary" className="w-full bg-indigo-600 hover:bg-indigo-500 border-none shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              {th.continueChat}
            </Button>
          </div>

          {/* 3. TODAY'S TAROT */}
          <div 
            onClick={() => navigate('/tarot')}
            className="bg-[#18181b]/80 p-5 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center text-center gap-3 cursor-pointer active:scale-95 transition-all hover:border-mystic-gold/50 shadow-lg"
          >
            <div className="text-4xl drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">🃏</div>
            <h3 className="text-white font-bold text-sm leading-tight">{th.tarotTitle}</h3>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-mystic-gold font-bold w-full uppercase tracking-wider">
              {th.drawCard}
            </button>
          </div>

          {/* 4. FORTUNE WHEEL */}
          <div 
            className="bg-[#18181b]/80 p-5 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center text-center gap-3 cursor-pointer active:scale-95 transition-all hover:border-mystic-gold/50 shadow-lg"
          >
            <div className="text-4xl drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">🎡</div>
            <h3 className="text-white font-bold text-sm leading-tight">{th.fortuneWheel}</h3>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-mystic-purple font-bold w-full uppercase tracking-wider">
              {th.spinNow}
            </button>
          </div>

          {/* 5. DAILY REWARD */}
          <div className="col-span-2 bg-gradient-to-r from-emerald-900/30 to-teal-900/10 p-5 rounded-[2rem] border border-emerald-500/20 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/30">
                🎁
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">{th.dailyReward}</h3>
                <p className="text-emerald-400/80 text-[10px] uppercase tracking-widest font-bold">Ready to claim</p>
              </div>
            </div>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all">
              {th.claim}
            </button>
          </div>

          {/* 6. DAILY CHALLENGES */}
          <div className="col-span-2 bg-[#18181b] p-6 rounded-[2.5rem] border border-white/5 space-y-5">
            <h3 className="text-white/60 text-[10px] uppercase tracking-[0.2em] font-black">{th.challenges}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs">
                  0/1
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">{th.challenge1}</p>
                  <div className="h-1.5 w-full bg-black mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-white/20 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div className="text-mystic-gold font-bold text-xs">10 🪙</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-mystic-gold/20 border border-mystic-gold/30 flex items-center justify-center text-xs text-mystic-gold">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="text-white/50 text-sm font-bold line-through">{th.challenge2}</p>
                  <div className="h-1.5 w-full bg-black mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-mystic-gold rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="text-mystic-gold/50 font-bold text-xs line-through">15 🪙</div>
              </div>
            </div>
          </div>

        </div>
        
        <div className="h-10"></div> {/* Bottom Padding */}
      </div>
    </div>
  );
};

export default Home;