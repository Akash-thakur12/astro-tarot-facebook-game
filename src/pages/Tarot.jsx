import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { getTarotHistory, canReadTarotToday } from '../services/userService';
import { auth } from '../services/firebase';
import tarotData from '../data/tarot_data.json';
import Button from '../components/ui/Button';

const Tarot = () => {
  const { user, refreshUser } = useAuth();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isMovingToCenter, setIsMovingToCenter] = useState(false);
  const [showGlowBurst, setShowGlowBurst] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [isUnlockedByAd, setIsUnlockedByAd] = useState(false);
  const [history, setHistory] = useState([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const isHindi = currentLanguage === 'Hindi';

  const updateHistory = useCallback(async () => {
    if (user?.uid) {
      const h = await getTarotHistory(user.uid);
      setHistory(h);
    }
  }, [user]);

  useEffect(() => {
    const initializeTarot = async () => {
      if (user?.uid) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          // Unified Status Check & Daily Reset
          const response = await fetch('/api/user/check-status', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` }
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
  }, [user, updateHistory, refreshUser]);

  const handleCardClick = async (index) => {
    if (selectedCard !== null || isFlipping || isMovingToCenter) return;
    
    const hasAccess = canReadTarotToday(user) || isUnlockedByAd;
    if (!hasAccess) return;

    // Phase 1: Card moves to center
    setSelectedCard(index);
    setIsMovingToCenter(true);

    // Step 1: Select random card from our 78-card localized dataset
    // eslint-disable-next-line react-hooks/purity
    const randomCard = tarotData[Math.floor(Math.random() * tarotData.length)];
    
    try {
      if (user?.uid) {
        const idToken = await auth.currentUser.getIdToken();
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
          throw new Error(data.error || 'Failed to save reading');
        }

        await updateHistory();
        await refreshUser();
      }
      setIsUnlockedByAd(false);
    } catch (err) {
      console.error("Tarot Save Error:", err.message);
    }

    // Step 2: After movement (600ms), start 3D Flip
    setTimeout(() => {
      setIsFlipping(true);
      
      // Step 3: During flip revelation (approx 700ms), reveal data
      setTimeout(() => {
        setSelectedCard({ ...randomCard, index });
        setShowGlowBurst(true);
        
        // Step 4: After glow burst and flip completion, show result screen
        setTimeout(() => {
          setShowResult(true);
          setShowGlowBurst(false);
          setIsFlipping(false);
          setIsMovingToCenter(false);
        }, 800);
      }, 700);
    }, 600);
  };

  const handleWatchAd = async () => {
    if (!user?.uid) return;
    setIsWatchingAd(true);
    
    setTimeout(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch('/api/tarot/unlock-reading', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (!response.ok) throw new Error('Failed to unlock reading');

        await refreshUser();
        setIsUnlockedByAd(true);
        setSelectedCard(null);
        setShowResult(false);
        setIsMovingToCenter(false);
      } catch (err) {
        console.error("Failed to unlock tarot via ad:", err);
      } finally {
        setIsWatchingAd(false);
      }
    }, 2500);
  };

  const particlePositions = useMemo(() => {
    return Array.from({ length: 6 }).map(() => ({
      // eslint-disable-next-line react-hooks/purity
      top: `${Math.random() * 100}%`,
      // eslint-disable-next-line react-hooks/purity
      left: `${Math.random() * 100}%`,
      // eslint-disable-next-line react-hooks/purity
      delay: `${Math.random() * 2}s`
    }));
  }, []);

  const canReadNow = canReadTarotToday(user) || isUnlockedByAd;

  // Translation Helpers
  const t = {
    title: isHindi ? 'दैनिक टैरो' : 'Daily Tarot Reading',
    subtitle: isHindi ? '"अपने भविष्य पर ध्यान केंद्रित करें और वह कार्ड चुनें जो आपको पुकारता है।"' : '"Focus on your destiny and choose the card that calls to you."',
    sessionLimit: isHindi ? 'सत्र सीमा' : 'Session Limit',
    watchAd: isHindi ? 'एक अतिरिक्त रीडिंग के लिए विज्ञापन देखें।' : 'Watch a sacred message to unlock another reading.',
    unlockButton: isHindi ? 'रीडिंग अनलॉक करें' : 'Unlock Sacred Reading',
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
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-mystic-gold rounded-full animate-ping opacity-20" />
         <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-10" />
      </div>

      <div className="px-6 pt-12 pb-8 text-center space-y-4 relative z-10">
        <h1 className="text-4xl font-black premium-gradient-text tracking-tight uppercase text-white">{t.title}</h1>
        <p className="text-white/60 text-sm max-w-[280px] mx-auto font-medium italic leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {!showResult ? (
        <div className="px-6 space-y-16 relative z-10">
          <div className="flex justify-center items-center gap-4 h-64 perspective-1000 relative">
            {[0, 1, 2].map((i) => {
              const isSelected = selectedCard === i || (selectedCard?.index === i);
              const isOtherSelected = selectedCard !== null && !isSelected;
              
              let moveTransform = '';
              if (isSelected) {
                 if (i === 0) moveTransform = 'translateX(112px)';
                 if (i === 2) moveTransform = 'translateX(-112px)';
              }

              const finalTransform = moveTransform + (isFlipping && isSelected ? ' rotateY(180deg) scale(1.5)' : '');

              return (
                <div 
                  key={i}
                  onMouseEnter={() => !selectedCard && setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => handleCardClick(i)}
                  className={`relative w-24 h-40 transition-all duration-700 preserve-3d cursor-pointer 
                    ${!selectedCard ? 'animate-card-float' : ''}
                    ${hoveredIndex === i && !selectedCard ? 'scale-110' : ''}
                    ${isOtherSelected ? 'opacity-0 scale-75 pointer-events-none' : ''}
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
                          <span className={`text-3xl transition-all duration-500 ${hoveredIndex === i && !selectedCard ? 'opacity-100 scale-110' : 'opacity-30'}`}>🕉️</span>
                       </div>
                    </div>
                    
                    <div className="absolute inset-0 backface-hidden rotate-y-180 glass rounded-xl border-2 border-mystic-gold flex flex-col items-center justify-center z-10 bg-mystic-indigo/90 text-white">
                       {selectedCard?.image ? (
                          <div className="flex flex-col items-center space-y-2">
                             <span className="text-5xl">{selectedCard.image}</span>
                             <span className="text-[8px] font-black text-mystic-gold uppercase tracking-widest">{selectedCard.name}</span>
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

          {!canReadNow && (
            <div className="glass-card p-6 rounded-3xl border border-mystic-gold/20 text-center space-y-4 animate-fade-in">
               <h3 className="font-bold text-white uppercase tracking-wider text-sm">{t.sessionLimit}</h3>
               <p className="text-xs text-white/40 leading-relaxed italic">{t.watchAd}</p>
               <Button fullWidth variant="gold" onClick={handleWatchAd} disabled={isWatchingAd}>
                  {isWatchingAd ? '...' : t.unlockButton}
               </Button>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-3">
                  <h3 className="text-xs uppercase tracking-[0.3em] font-black text-white/30">{t.pastRevelations}</h3>
                  <div className="h-px flex-1 bg-white/10" />
               </div>
               <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="glass p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-mystic-gold/20 transition-all">
                       <span className="text-sm font-bold text-white/80">{h.cardName}</span>
                       <span className="text-[9px] text-white/20 font-bold">
                          {h.timestamp && typeof h.timestamp.toDate === 'function' ? h.timestamp.toDate().toLocaleDateString() : t.justNow}
                       </span>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      ) : (
        /* Result Screen */
        <div className="px-6 animate-fade-in pb-12">
           <div className="glass-card p-8 rounded-[40px] border border-mystic-gold/20 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-mystic-gold/10 blur-[60px] rounded-full pointer-events-none" />
              
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-40 h-60 glass rounded-2xl border-2 border-mystic-gold shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col items-center justify-center space-y-5 relative bg-mystic-indigo/40 text-white">
                    <span className="text-8xl drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">{selectedCard?.image}</span>
                    <h2 className="text-xl font-black text-mystic-gold uppercase tracking-[0.1em]">{selectedCard?.name}</h2>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                       <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-mystic-gold">
                          {t.cardMeaning}
                       </h3>
                       <p className="text-sm text-white/90 leading-relaxed italic font-medium">
                          {isHindi ? selectedCard?.meaning_hi : selectedCard?.meaning_en}
                       </p>
                    </div>

                    <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                       <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-mystic-gold">
                          {t.description}
                       </h3>
                       <p className="text-sm text-white/70 leading-relaxed font-medium">
                          {isHindi ? selectedCard?.description_hi : selectedCard?.description_en}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-4 pl-1">
                    <div className="space-y-1">
                       <h4 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-wider text-rose-400">
                          {t.love}
                       </h4>
                       <p className="text-sm text-white/50 leading-relaxed pl-6 italic font-medium">
                          {isHindi ? selectedCard?.love_hi : selectedCard?.love_en}
                       </p>
                    </div>

                    <div className="space-y-1">
                       <h4 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-wider text-blue-400">
                          {t.career}
                       </h4>
                       <p className="text-sm text-white/50 leading-relaxed pl-6 italic font-medium">
                          {isHindi ? selectedCard?.career_hi : selectedCard?.career_en}
                       </p>
                    </div>

                    <div className="space-y-1">
                       <h4 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-wider text-emerald-400">
                          {t.health}
                       </h4>
                       <p className="text-sm text-white/50 leading-relaxed pl-6 italic font-medium">
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

              <div className="pt-6">
                 <Button variant="outline" fullWidth onClick={() => {setShowResult(false); setSelectedCard(null);}} className="rounded-2xl border-white/10 text-white/60">
                    {t.closeReading}
                 </Button>
              </div>
           </div>
        </div>
      )}

      <div className="mt-4 text-center">
         <button onClick={() => navigate('/')} className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] hover:text-white transition-all py-4">
            {t.backToTemple}
         </button>
      </div>
    </div>
  );
};

export default Tarot;
