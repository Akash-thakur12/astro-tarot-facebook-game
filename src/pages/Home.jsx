import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { checkPremiumExpiry } from '../services/userService';
import Button from '../components/ui/Button';
import CoinBar from '../components/CoinBar';
import DailyBonus from '../components/DailyBonus';
import RewardCenter from '../components/RewardCenter';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentLanguage, setLanguage } = useLanguage();

  useEffect(() => {
    if (user) {
      checkPremiumExpiry(user);
    }
  }, [user]);

  const isHindi = currentLanguage === 'Hindi';

  // Translations for Home Page
  const th = {
    heroTitle: isHindi ? 'आज आपके सितारे' : "Today's Cosmic",
    heroSubtitle: isHindi ? 'क्या कहते हैं?' : "Alignment",
    cosmicEnergy: isHindi ? 'आज की ब्रह्मांडीय ऊर्जा' : "Today's Cosmic Energy",
    alignment: isHindi ? 'दैनिक संरेखण' : 'Daily Alignment',
    horoscopeTitle: isHindi ? 'दैनिक राशिफल' : 'Daily Horoscope',
    viewFullHoroscope: isHindi ? 'पूरा राशिफल देखें' : 'View Full Horoscope',
    askPanditTitle: isHindi ? '🔮 पंडित जी से पूछें' : '🔮 Ask Pandit AI',
    askPanditSub: isHindi ? 'अपने भविष्य, प्रेम, विवाह और करियर के प्रश्न पूछें' : 'Ask about your future, love, marriage and career',
    popular: isHindi ? 'सबसे लोकप्रिय' : 'MOST POPULAR',
    askButton: isHindi ? 'पूछें' : 'Ask Now',
    freeQuestion: isHindi ? '1 मुफ्त प्रश्न उपलब्ध' : '1 Free Question Available',
    tarotTitle: isHindi ? '🃏 दैनिक टैरो रीडिंग' : '🃏 Daily Tarot Reading',
    tarotSub: isHindi ? 'आज का रहस्यमयी संदेश जानें' : 'Discover today\'s mystical message',
    pickCard: isHindi ? 'अपना कार्ड चुनें' : 'Pick Your Card',
    predictions: isHindi ? 'भविष्यवाणियां' : 'Predictions',
    kundaliTitle: isHindi ? '🕉️ वैदिक कुंडली' : '🕉️ Vedic Kundali',
    kundaliAnalysis: isHindi ? 'कुंडली विश्लेषण' : 'Kundali Analysis',
    detailedChart: isHindi ? 'विस्तृत जन्म कुंडली' : 'Detailed Birth Chart',
    generateKundali: isHindi ? 'कुंडली बनाएं' : 'Generate Kundali',
    monetization: isHindi ? 'मुद्रीकरण' : 'Monetization',
    unlockDestiny: isHindi ? 'अपना संपूर्ण भाग्य अनलॉक करें' : 'Unlock Your Complete Destiny',
    oneTimeAccess: isHindi ? 'एक बार पहुंच' : 'ONE TIME ACCESS',
    price: isHindi ? 'मात्र ₹49' : 'Only ₹49',
    madeInStars: isHindi ? 'तारों में निर्मित' : 'Made in Stars',
    love: isHindi ? 'प्रेम' : 'Love',
    career: isHindi ? 'करियर' : 'Career',
    money: isHindi ? 'धन' : 'Money',
    health: isHindi ? 'स्वास्थ्य' : 'Health',
    marriage: isHindi ? 'विवाह' : 'Marriage',
    teaserLove: isHindi ? 'नया संबंध संकेतित' : 'New connection indicated',
    teaserCareer: isHindi ? 'प्रमुख विकास चक्र' : 'Major growth cycle',
    teaserMoney: isHindi ? 'वित्तीय स्थिरता' : 'Financial stability',
    teaserMarriage: isHindi ? 'अनुकूल संरेखण' : 'Favorable alignment',
  };

  const zodiacs = [
    { symbol: '♈', name: isHindi ? 'मेष' : 'Mesh' },
    { symbol: '♉', name: isHindi ? 'वृषभ' : 'Vrishabh' },
    { symbol: '♊', name: isHindi ? 'मिथुन' : 'Mithun' },
    { symbol: '♋', name: isHindi ? 'कर्क' : 'Kark' },
    { symbol: '♌', name: isHindi ? 'सिंह' : 'Simha' },
    { symbol: '♍', name: isHindi ? 'कन्या' : 'Kanya' },
    { symbol: '♎', name: isHindi ? 'तुला' : 'Tula' },
    { symbol: '♏', name: isHindi ? 'वृश्चिक' : 'Vrishchik' },
    { symbol: '♐', name: isHindi ? 'धनु' : 'Dhanu' },
    { symbol: '♑', name: isHindi ? 'मकर' : 'Makar' },
    { symbol: '♒', name: isHindi ? 'कुंभ' : 'Kumbh' },
    { symbol: '♓', name: isHindi ? 'मीन' : 'Meen' },
  ];

  const cosmicScores = [
    { label: th.love, score: 85, icon: '❤️', color: 'bg-rose-500' },
    { label: th.career, score: 62, icon: '💼', color: 'bg-blue-500' },
    { label: th.money, score: 74, icon: '💰', color: 'bg-emerald-500' },
    { label: th.health, score: 91, icon: '🌿', color: 'bg-amber-500' },
  ];

  return (
    <div className="flex flex-col w-full pb-32 animate-fade-in kundali-grid bg-[#020617] relative">
      
      {/* LANGUAGE SELECTOR */}
      <div className="absolute top-4 right-4 z-[110]">
         <div className="flex glass-card rounded-full p-1 border-white/10 overflow-hidden shadow-2xl">
            <button 
              onClick={() => setLanguage('English')}
              className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${currentLanguage === 'English' ? 'bg-mystic-gold text-mystic-indigo shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('Hindi')}
              className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${currentLanguage === 'Hindi' ? 'bg-mystic-gold text-mystic-indigo shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              हिं
            </button>
         </div>
      </div>

      {/* 1. USER HEADER */}
      <CoinBar />

      <div className="px-5 pt-6 space-y-8">
        
        {/* 2. COSMIC SCORE CARD */}
        <div className="glass-card p-6 rounded-[2.5rem] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-mystic-gold font-black">{th.alignment}</span>
              <h3 className="text-xl font-black text-white/90">{th.cosmicEnergy}</h3>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-mystic-gold/20 flex items-center justify-center bg-mystic-gold/5 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
               <span className="text-xl">✨</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6 relative z-10">
            {cosmicScores.map((s) => (
              <div key={s.label} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                    <span>{s.icon}</span> {s.label}
                  </span>
                  <span className="text-xs font-black text-white/90">{s.score}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${s.color} rounded-full animate-progress glow-purple`}
                    style={{ '--progress-width': `${s.score}%`, width: `${s.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. DAILY HOROSCOPE CARD */}
        <div className="glass-card p-7 rounded-[2.5rem] border-white/10 space-y-6 relative overflow-hidden group hover:border-white/20 transition-all duration-500">
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 blur-[60px] rounded-full" />
           
           <h2 className="text-2xl font-black text-white text-center leading-tight">
             {th.heroTitle} <br/><span className="premium-gradient-text italic">{th.heroSubtitle}</span>
           </h2>

           <div className="flex overflow-x-auto gap-4 no-scrollbar py-2 snap-x">
             {zodiacs.map((z, i) => (
               <div key={i} className="flex-shrink-0 flex flex-col items-center space-y-2 snap-center">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl glass-card border transition-all duration-300 ${i === 0 ? 'border-mystic-gold bg-mystic-gold/10' : 'border-white/5'}`}>
                   {z.symbol}
                 </div>
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">{z.name}</span>
               </div>
             ))}
           </div>

           <div className="p-5 rounded-3xl bg-white/5 border border-white/5 relative">
              <p className="text-sm text-white/70 leading-relaxed italic text-center font-serif">
                {isHindi 
                  ? '"एक शक्तिशाली ग्रह गोचर आपके महत्वाकांक्षा के घर में हो रहा है। दीर्घकालिक विकास पर ध्यान केंद्रित करें।"'
                  : '"A powerful planetary transition is occurring in your house of ambition. Focus on long-term growth today."'
                }
              </p>
           </div>

           <Button fullWidth variant="primary" className="h-14 rounded-2xl font-black tracking-widest text-sm uppercase">
             {th.viewFullHoroscope}
           </Button>
        </div>

        {/* 4. ASK PANDIT AI HERO CARD */}
        <div 
          onClick={() => navigate('/ask-pandit')}
          className="glass-card p-8 rounded-[3rem] border-mystic-gold/20 bg-gradient-to-br from-mystic-purple/20 to-transparent relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all group hover:border-mystic-gold/40 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        >
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <span className="text-[120px] leading-none text-white">🔮</span>
           </div>
           
           <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                 <span className="inline-block px-3 py-1 bg-mystic-gold text-mystic-indigo text-[10px] font-black rounded-full shadow-lg mb-2">{th.popular}</span>
                 <h2 className="text-3xl font-black text-white tracking-tighter">{th.askPanditTitle}</h2>
                 <p className="text-white/60 text-xs leading-relaxed max-w-[200px] font-medium italic">
                   {th.askPanditSub}
                 </p>
              </div>

              <div className="flex items-center gap-4">
                 <Button variant="gold" className="px-10 h-14 rounded-2xl font-black text-lg shadow-[0_10px_40px_rgba(251,191,36,0.3)]">
                   {th.askButton}
                 </Button>
                 {!user?.dailyQuestionUsed && (
                   <span className="text-green-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                     {th.freeQuestion}
                   </span>
                 )}
              </div>
           </div>
        </div>

        {/* 5. DAILY TAROT CARD */}
        <div 
          onClick={() => navigate('/tarot')}
          className="glass-gold p-8 rounded-[3rem] border-mystic-gold/30 bg-gradient-to-br from-[#7e22ce]/20 to-[#fbbf24]/5 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all group shadow-xl"
        >
           <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 text-8xl opacity-10 blur-[2px] group-hover:scale-110 transition-transform duration-1000 text-white">🃏</div>
           <div className="relative z-10 space-y-5">
              <div className="space-y-1">
                 <h2 className="text-2xl font-black text-white tracking-tight">{th.tarotTitle}</h2>
                 <p className="text-mystic-gold/80 text-sm font-bold italic">
                   {th.tarotSub}
                 </p>
              </div>
              <Button variant="outline" className="border-mystic-gold/40 text-mystic-gold font-black px-8">
                 {th.pickCard}
              </Button>
           </div>
        </div>

        {/* 6. PREDICTION GRID */}
        <div className="grid grid-cols-2 gap-4">
           {[
             { title: isHindi ? 'प्रेम भविष्यवाणी' : 'Love Prediction', icon: '💖', score: 85, teaser: th.teaserLove },
             { title: isHindi ? 'करियर भविष्यवाणी' : 'Career Prediction', icon: '💼', score: 62, teaser: th.teaserCareer },
             { title: isHindi ? 'धन भविष्यवाणी' : 'Money Prediction', icon: '💰', score: 74, teaser: th.teaserMoney },
             { title: isHindi ? 'विवाह भविष्यवाणी' : 'Marriage Prediction', icon: '💍', score: 55, teaser: th.teaserMarriage },
           ].map((item, idx) => (
             <div key={idx} className="glass-card p-5 rounded-[2rem] border-white/5 space-y-3 hover:border-white/20 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                   <span className="text-2xl">{item.icon}</span>
                   <span className="text-[10px] font-black text-mystic-gold">{item.score}%</span>
                </div>
                <div>
                   <h4 className="text-[11px] font-black text-white/90 uppercase tracking-tight leading-tight">{item.title}</h4>
                   <p className="text-[9px] text-white/40 font-bold leading-tight mt-0.5">{item.teaser}</p>
                </div>
             </div>
           ))}
        </div>

        {/* 7. KUNDALI SECTION */}
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/60">{th.predictions}</h2>
              <div className="h-px flex-1 bg-white/5" />
           </div>
           
           <div 
             onClick={() => navigate('/kundali')}
             className="glass-card p-6 rounded-[2.5rem] border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all"
           >
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-3xl shadow-lg shadow-orange-900/20">
                    <span className="text-white">☸️</span>
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-white/90 tracking-tight">{th.kundaliAnalysis}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">{th.detailedChart}</p>
                 </div>
              </div>
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 group-hover:text-mystic-gold transition-colors">
                 →
              </button>
           </div>
           
           <Button 
            fullWidth 
            variant="primary" 
            onClick={() => navigate('/kundali')}
            className="h-14 rounded-2xl font-black bg-gradient-to-r from-orange-600 to-red-700 border-none shadow-orange-900/20 uppercase"
           >
             {th.generateKundali}
           </Button>
        </div>

        {/* 8. DAILY BONUS CARD */}
        <DailyBonus />

        {/* 9. EARN COINS SECTION */}
        <RewardCenter />

        {/* 10. PREMIUM SECTION */}
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/60">{th.monetization}</h2>
              <div className="h-px flex-1 bg-white/5" />
           </div>

           <div 
             onClick={() => navigate('/premium')}
             className="bg-gradient-to-br from-mystic-gold via-yellow-400 to-amber-700 p-8 rounded-[3rem] border border-white/20 shadow-[0_20px_50px_rgba(251,191,36,0.25)] relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
           >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
              
              <div className="relative z-10 space-y-6">
                 <div className="space-y-1 text-mystic-indigo">
                    <h2 className="text-3xl font-black tracking-tighter">{th.unlockDestiny}</h2>
                    <ul className="space-y-1.5 pt-3">
                       {[
                         isHindi ? 'असीमित पंडित प्रश्न' : 'Unlimited Ask Pandit', 
                         isHindi ? 'प्रीमियम टैरो' : 'Premium Tarot', 
                         isHindi ? 'पूर्ण कुंडली रिपोर्ट' : 'Full Kundali Report', 
                         isHindi ? 'प्रेम अनुकूलता' : 'Love Compatibility'
                       ].map((f) => (
                         <li key={f} className="text-[11px] font-black flex items-center gap-2 uppercase tracking-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-mystic-indigo" /> {f}
                         </li>
                       ))}
                    </ul>
                 </div>

                 <div className="flex items-center justify-between bg-black/10 backdrop-blur-md p-5 rounded-[2rem] border border-black/5">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-mystic-indigo/60 uppercase tracking-widest">{th.oneTimeAccess}</span>
                       <span className="text-2xl font-black text-mystic-indigo">{th.price}</span>
                    </div>
                    <div className="w-12 h-12 bg-mystic-indigo rounded-full flex items-center justify-center text-white shadow-lg animate-bounce text-xl">
                       💎
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="py-10 text-center opacity-30">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">AstroTarot • {th.madeInStars}</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
