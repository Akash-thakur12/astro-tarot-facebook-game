import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { getTarotHistory, canReadTarotToday } from '../services/userService';
import { auth } from '../services/firebase';
import tarotData from '../data/tarot_data.json';
import Button from '../components/ui/Button';
import { playCardFlip } from '../services/audioService';
import { preloadRewardedAd, showRewardedAd } from '../services/fbAds';
import { preloadInterstitial, showInterstitial } from '../services/fbInterstitial';
import { preloadBanner, showBanner, hideBanner } from '../services/fbBanner';
import { 
  REWARDED_TAROT_UNLOCK_ID, 
  INTERSTITIAL_TAROT_ID, 
  BANNER_TAROT_ID 
} from '../config/adConfig';
import { ShareDestinyButton } from '../components/social/SocialButtons';

const Tarot = () => {
  const { user, refreshUser, getToken } = useAuth();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isMovingToCenter, setIsMovingToCenter] = useState(false);
  const [showGlowBurst, setShowGlowBurst] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [error, setError] = useState(null);
  const [isUnlockedByAd, setIsUnlockedByAd] = useState(false);
  const [history, setHistory] = useState([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [particlePositions] = useState(() => 
    Array.from({ length: 6 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`
    }))
  );

  const isHindi = currentLanguage === 'Hindi';

  const updateHistory = useCallback(async () => {
    if (user?.uid) {
      const h = await getTarotHistory(user.uid);
      setHistory(h);
    }
  }, [user]);

  useEffect(() => {
    // Preload Ads for FB Instant Games
    if (user?.uid && !canReadTarotToday(user)) {
       preloadRewardedAd(REWARDED_TAROT_UNLOCK_ID);
    }
    preloadInterstitial(INTERSTITIAL_TAROT_ID);
    preloadBanner(BANNER_TAROT_ID);

    const initializeTarot = async () => {
      if (user?.uid) {
        try {
          const idToken = await getToken();
          const response = await fetch('/api/user/check-status', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              provider: user.provider || 'firebase'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.resetPerformed) {
              await refreshUser();
            }
          }
        } catch (err) {
          console.error("Status Check Error:", err);
        }
        await updateHistory();
      }
    };
    
    initializeTarot();

    return () => {
      hideBanner();
    };
  }, [user?.uid, updateHistory, refreshUser, getToken]);

  const handleCardClick = async (index) => {
    if (selectedCard !== null || isFlipping || isMovingToCenter) return;
    
    const hasAccess = canReadTarotToday(user) || isUnlockedByAd;
    if (!hasAccess) return;

    setSelectedCard(index);
    setIsMovingToCenter(true);

    // eslint-disable-next-line react-hooks/purity
    const randomCard = tarotData[Math.floor(Math.random() * tarotData.length)];
    
    // Fire and forget backend operations
    (async () => {
      try {
        if (user?.uid) {
          const idToken = await getToken();
          const response = await fetch('/api/tarot/save-reading', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              cardName: randomCard.name,
              lovePrediction: randomCard.love_en,
              careerPrediction: randomCard.career_en,
              healthPrediction: randomCard.health_en
            })
          });

          if (!response.ok) {
            const data = await response.json();
            // Handle 403 specifically to force UI reset
            if (response.status === 403) {
              setSelectedCard(null);
              setShowResult(false);
              setIsMovingToCenter(false);
            }
            throw new Error(data.error || 'Failed to save reading');
          }

          await updateHistory();
          await refreshUser();
        }
      } catch (err) {
        console.error("Tarot Save Error:", err.message);
      } finally {
        setIsUnlockedByAd(false);
      }
    })();

    // Animation Pacing (Optimized for 1150ms total)
    setTimeout(() => {
      setIsFlipping(true);
      playCardFlip();
      setTimeout(() => {
        setSelectedCard({ ...randomCard, index });
        setShowGlowBurst(true);
        setTimeout(() => {
          setShowResult(true);
          setShowGlowBurst(false);
          setIsFlipping(false);
          setIsMovingToCenter(false);
          showInterstitial();
          showBanner();
        }, 350); // Reveal Wait (350ms)
      }, 450); // Flip (450ms)
    }, 350); // Move (350ms)
  };

  const handleWatchUnlock = async (method) => {
    if (!user?.uid) return;
    setIsWatchingAd(true);
    setError(null);

    try {
      let adSuccess = true;

      // Real Ad flow for FB Instant Games
      if (method === 'ad' && window.FBInstant) {
        adSuccess = await showRewardedAd();
        if (!adSuccess) {
           throw new Error('Ad was not completed or failed to load.');
        }
      } else if (method === 'ad') {
        // Fallback simulated delay for Web mode
        await new Promise(resolve => setTimeout(resolve, 2500));
      }

      const idToken = await getToken();
      const response = await fetch('/api/tarot/unlock-reading', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unlock reading');
      }

      await refreshUser();
      setIsUnlockedByAd(true);
      setSelectedCard(null);
      setShowResult(false);
      setIsMovingToCenter(false);
    } catch (err) {
      console.error(`Failed to unlock tarot via ${method}:`, err);
      setError(err.message);
    } finally {
      setIsWatchingAd(false);
      // Attempt to preload next ad
      if (window.FBInstant) preloadRewardedAd(REWARDED_TAROT_UNLOCK_ID);
    }
  };

  const canReadNow = canReadTarotToday(user) || isUnlockedByAd;

  const t = {
    title: isHindi ? 'दैनिक टैरो' : 'Daily Tarot Reading',
    subtitle: isHindi ? '"अपने भविष्य पर ध्यान केंद्रित करें और वह कार्ड चुनें जो आपको पुकारता है।"' : '"Focus on your destiny and choose the card that calls to you."',
    instruction: isHindi ? 'अपनी नियति को प्रकट करने के लिए एक कार्ड चुनें' : 'Choose one card to reveal your destiny',
    sessionLimit: isHindi ? 'सत्र सीमा' : 'Session Limit',
    unlockOptions: isHindi ? 'एक अतिरिक्त रीडिंग अनलॉक करने के लिए चुनें।' : 'Choose how to unlock an additional reading.',
    unlockAd: isHindi ? 'विज्ञापन देखें (मुफ्त)' : 'Watch Ad (Free)',
    unlockCoins: isHindi ? '40 सिक्के खर्च करें' : 'Spend 40 Coins',
    pastRevelations: isHindi ? 'पिछली भविष्यवाणियां' : 'Past Revelations',
    justNow: isHindi ? 'अभी' : 'Just now',
    backToTemple: isHindi ? 'मंदिर वापस जाएं' : 'Back to Temple',
    closeReading: isHindi ? 'रीडिंग बंद करें' : 'Close Reading',
    newReading: isHindi ? 'नई रीडिंग' : 'New Reading',
    cardMeaning: isHindi ? '🔮 कार्ड का अर्थ' : '🔮 Card Meaning',
    description: isHindi ? '📜 विवरण' : '📜 Description',
    love: isHindi ? '❤️ प्रेम भविष्यवाणी' : '❤️ Love Prediction',
    career: isHindi ? '💼 करियर भविष्यवाणी' : '💼 Career Prediction',
    health: isHindi ? '💚 स्वास्थ्य भविष्यवाणी' : '💚 Health Prediction',
    luckyColor: isHindi ? '🎨 शुभ रंग' : '🎨 Lucky Color',
    luckyNumber: isHindi ? '🔢 शुभ अंक' : '🔢 Lucky Number',
  };

  return (
    <div className="flex flex-col w-full pb-10 animate-fade-in kundali-grid min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[#020617]/80 pointer-events-none" />
      
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-mystic-gold rounded-full animate-ping opacity-20" />
         <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-10" />
      </div>

      <div className="px-6 pt-6 pb-4 text-center space-y-2 relative z-10">
        <h1 className="text-2xl md:text-3xl font-black premium-gradient-text tracking-tight uppercase text-white drop-shadow-lg">🔮 {t.title}</h1>
        <p className="text-white/30 text-[9px] max-w-[280px] mx-auto font-medium italic leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {!showResult ? (
        <div className="px-4 space-y-4 relative z-10">
          <p className="text-[8px] text-mystic-gold/60 uppercase tracking-[0.3em] font-black text-center mb-0">
            {t.instruction}
          </p>

          <div className="relative group">
            <div className="absolute -inset-4 bg-mystic-gold/5 blur-2xl rounded-[3rem] opacity-50 pointer-events-none" />
            <div className="glass-card p-6 rounded-[2.5rem] border border-mystic-gold/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-mystic-gold/20 rounded-full blur-sm" />
               
               <div className="flex justify-center items-center gap-3 h-[180px] perspective-1000 relative">
                 {[0, 1, 2].map((i) => {
                   const isSelected = selectedCard === i || (selectedCard?.index === i);
                   const isOtherSelected = selectedCard !== null && !isSelected;
                   
                   let moveTransform = '';
                   if (isSelected) {
                      if (i === 0) moveTransform = 'translateX(110px)';
                      if (i === 2) moveTransform = 'translateX(-110px)';
                   }

                   const finalTransform = moveTransform + (isFlipping && isSelected ? ' rotateY(180deg) scale(1.35)' : '');

                   return (
                     <div 
                       key={i}
                       onMouseEnter={() => !selectedCard && setHoveredIndex(i)}
                       onMouseLeave={() => setHoveredIndex(null)}
                       onClick={() => handleCardClick(i)}
                       className={`relative w-[90px] h-[155px] transition-all duration-400 preserve-3d cursor-pointer 
                         ${!selectedCard ? 'animate-card-float' : ''}
                         ${hoveredIndex === i && !selectedCard ? 'scale-105 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : ''}
                         ${isSelected ? 'scale-110 shadow-[0_0_40px_rgba(251,191,36,0.5)] z-50' : ''}
                         ${isOtherSelected ? 'opacity-20 grayscale scale-75 blur-[1px] pointer-events-none' : ''}
                       `}
                       style={{ 
                         animationDelay: `${i * 0.5}s`,
                         transform: finalTransform
                       }}
                     >
                       {isSelected && showGlowBurst && (
                         <div className="absolute inset-0 bg-mystic-gold rounded-xl animate-glow-burst z-50 pointer-events-none" />
                       )}

                       {hoveredIndex === i && !selectedCard && particlePositions.map((pos, p) => (
                         <div key={p} className="magical-particle" style={{ top: pos.top, left: pos.left, animationDelay: pos.delay }} />
                       ))}

                       <div className="absolute inset-0 w-full h-full preserve-3d">
                         <div className="absolute inset-0 backface-hidden glass rounded-xl border-2 border-mystic-gold/30 flex flex-col items-center justify-center overflow-hidden z-20 transition-colors duration-500">
                            <div className="absolute inset-1.5 border border-mystic-gold/10 rounded-lg" />
                            <div className="w-16 h-28 border border-mystic-gold/5 rounded-md flex items-center justify-center bg-gradient-to-br from-mystic-purple/20 to-transparent">
                               <span className={`text-3xl transition-all duration-500 ${hoveredIndex === i && !selectedCard ? 'opacity-100 scale-110' : 'opacity-20'}`}>🕉️</span>
                            </div>
                         </div>
                         
                         <div className="absolute inset-0 backface-hidden rotate-y-180 glass rounded-xl border-2 border-mystic-gold flex flex-col items-center justify-center z-10 bg-mystic-indigo/90 text-white shadow-2xl">
                            {selectedCard?.image ? (
                               <div className="flex flex-col items-center space-y-2">
                                  <span className="text-5xl drop-shadow-md">{selectedCard.image}</span>
                                  <span className="text-[9px] font-black text-mystic-gold uppercase tracking-widest">{selectedCard.name}</span>
                               </div>
                            ) : (
                               <span className="text-4xl animate-pulse text-white">🃏</span>
                            )}
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>

          {!canReadNow && (
            <div className="glass-card p-6 rounded-3xl border border-mystic-gold/20 text-center space-y-4 animate-fade-in">
               <h3 className="font-bold text-white uppercase tracking-wider text-sm">{t.sessionLimit}</h3>
               <p className="text-xs text-white/40 leading-relaxed italic">{t.unlockOptions}</p>
               <div className="grid grid-cols-1 gap-3">
                 <Button fullWidth variant="gold" onClick={() => handleWatchUnlock('ad')} disabled={isWatchingAd}>
                    {isWatchingAd ? '...' : t.unlockAd}
                 </Button>
                 <Button 
                   fullWidth 
                   variant="outline" 
                   onClick={() => handleWatchUnlock('coins')} 
                   disabled={isWatchingAd || (user?.coins || 0) < 30}
                   className="border-mystic-gold/30 text-mystic-gold"
                 >
                    {t.unlockCoins} (30 🪙)
                 </Button>
               </div>
               {error && <p className="text-[10px] text-red-400 font-bold mt-2 uppercase">⚠️ {error}</p>}
            </div>
          )}

          {history.length > 0 && !selectedCard && (
            <div className="space-y-4 pt-2">
               <div className="flex items-center gap-3">
                  <h3 className="text-[8px] uppercase tracking-[0.4em] font-black text-white/20">{t.pastRevelations}</h3>
                  <div className="h-px flex-1 bg-white/5" />
               </div>
               <div className="grid grid-cols-1 gap-2">
                  {history.slice(0, 3).map((h, i) => (
                    <div key={i} className="glass px-4 py-3 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-mystic-gold/20 transition-all">
                       <span className="text-[11px] font-bold text-white/60">{h.cardName}</span>
                       <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest">
                          {h.timestamp && typeof h.timestamp.toDate === 'function' ? h.timestamp.toDate().toLocaleDateString() : t.justNow}
                       </span>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 animate-fade-in pb-12 relative z-10">
           <div className="glass-card p-6 rounded-[40px] border border-mystic-gold/20 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-mystic-gold/10 blur-[60px] rounded-full pointer-events-none" />
              
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-32 h-52 glass rounded-2xl border-2 border-mystic-gold shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col items-center justify-center space-y-4 relative bg-mystic-indigo/40 text-white">
                    <span className="text-6xl drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">{selectedCard?.image}</span>
                    <h2 className="text-base font-black text-mystic-gold uppercase tracking-[0.1em]">{selectedCard?.name}</h2>
                 </div>
              </div>

              <div className="space-y-5">
                 <div className="space-y-3">
                    <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                       <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-mystic-gold">
                          {t.cardMeaning}
                       </h3>
                       <p className="text-[13px] text-white/90 leading-relaxed italic font-medium">
                          {isHindi ? selectedCard?.meaning_hi : selectedCard?.meaning_en}
                       </p>
                    </div>

                    <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                       <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-mystic-gold">
                          {t.description}
                       </h3>
                       <p className="text-[13px] text-white/70 leading-relaxed font-medium">
                          {isHindi ? selectedCard?.description_hi : selectedCard?.description_en}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-4 pl-1">
                    <div className="space-y-1">
                       <h4 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-wider text-rose-400">
                          {t.love}
                       </h4>
                       <p className="text-[13px] text-white/50 leading-relaxed pl-6 italic font-medium">
                          {isHindi ? selectedCard?.love_hi : selectedCard?.love_en}
                       </p>
                    </div>

                    <div className="space-y-1">
                       <h4 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-wider text-blue-400">
                          {t.career}
                       </h4>
                       <p className="text-[13px] text-white/50 leading-relaxed pl-6 italic font-medium">
                          {isHindi ? selectedCard?.career_hi : selectedCard?.career_en}
                       </p>
                    </div>

                    <div className="space-y-1">
                       <h4 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-wider text-emerald-400">
                          {t.health}
                       </h4>
                       <p className="text-[13px] text-white/50 leading-relaxed pl-6 italic font-medium">
                          {isHindi ? selectedCard?.health_hi : selectedCard?.health_en}
                       </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="glass p-3 rounded-xl border border-white/5 text-center">
                       <span className="block text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{t.luckyColor}</span>
                       <span className="text-xs font-bold text-mystic-gold">{isHindi ? selectedCard?.luckyColor_hi : selectedCard?.luckyColor_en}</span>
                    </div>
                    <div className="glass p-3 rounded-xl border border-white/5 text-center">
                       <span className="block text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{t.luckyNumber}</span>
                       <span className="text-xs font-bold text-mystic-gold">{selectedCard?.luckyNumber}</span>
                    </div>
                 </div>
              </div>

              <div className="pt-4">
                 <ShareDestinyButton cardName={selectedCard?.name} />
                 <Button variant="outline" fullWidth onClick={() => {setShowResult(false); setSelectedCard(null); hideBanner();}} className="rounded-2xl border-white/10 text-white/60 mt-3">
                    {t.closeReading}
                 </Button>
              </div>
           </div>
        </div>
      )}

      <div className="mt-8 px-8 relative z-10">
         <button 
           onClick={() => navigate('/')} 
           className="w-full py-4 bg-mystic-gold/5 backdrop-blur-md rounded-2xl border border-mystic-gold/40 text-[11px] font-black text-white tracking-[0.4em] hover:bg-mystic-gold/10 hover:border-mystic-gold/60 transition-all shadow-[0_0_20px_rgba(251,191,36,0.1)] active:scale-95 flex items-center justify-center gap-2"
         >
            <span className="text-mystic-gold opacity-60">✨</span>
            {t.backToTemple}
            <span className="text-mystic-gold opacity-60">✨</span>
         </button>
      </div>
    </div>
  );
};

export default Tarot;
