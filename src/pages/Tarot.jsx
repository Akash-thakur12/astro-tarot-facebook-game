import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { recordTarotReading, resetTarotDailyIfNewDay, unlockExtraTarotReading, getTarotHistory } from '../services/userService';
import tarotData from '../data/tarot_data.json';
import Button from '../components/ui/Button';

const Tarot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isMovingToCenter, setIsMovingToCenter] = useState(false);
  const [showGlowBurst, setShowGlowBurst] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [history, setHistory] = useState([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const updateHistory = useCallback(async () => {
    if (user?.uid) {
      const h = await getTarotHistory(user.uid);
      setHistory(h);
    }
  }, [user]);

  useEffect(() => {
    const initializeTarot = async () => {
      if (user?.uid) {
        await resetTarotDailyIfNewDay(user);
        updateHistory();
      }
    };
    
    initializeTarot();
  }, [user, updateHistory]);

  const handleCardClick = async (index) => {
    if (selectedCard !== null || isFlipping || isMovingToCenter) return;
    
    const canRead = user?.premium || !user?.dailyTarotUsed;
    if (!canRead) return;

    // Phase 1: Card moves to center
    setSelectedCard(index);
    setIsMovingToCenter(true);

    // Random selection
    // eslint-disable-next-line react-hooks/purity
    const randomIndex = Math.floor(Math.random() * tarotData.length);
    const randomCard = tarotData[randomIndex];
    
    try {
      if (!user.premium) {
        await recordTarotReading(user.uid, randomCard.name);
      }
      updateHistory();
    } catch (err) {
      console.error(err);
    }

    // Step 2: After movement (approx 600ms), start 3D Flip
    setTimeout(() => {
      setIsFlipping(true);
      
      // Step 3: During flip revelation (approx 700ms), reveal front data
      setTimeout(() => {
        // We update the selected card state with the actual data now
        setSelectedCard({ ...randomCard, index });
        
        // Step 4: Show magical glow burst
        setShowGlowBurst(true);
        
        // Step 5: After glow burst and flip completion, show result screen
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
    setIsWatchingAd(true);
    setTimeout(async () => {
      try {
        await unlockExtraTarotReading(user.uid);
        setSelectedCard(null);
        setShowResult(false);
        setIsMovingToCenter(false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsWatchingAd(false);
      }
    }, 2000);
  };

  const canReadNow = user?.premium || !user?.dailyTarotUsed;

  return (
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen relative overflow-hidden">
      {/* Background Particles Decoration */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-mystic-gold rounded-full animate-ping opacity-20" />
         <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-10" />
         <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse opacity-20" />
      </div>

      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center space-y-4 relative z-10">
        <h1 className="text-4xl font-black premium-gradient-text tracking-tight uppercase">🃏 Daily Tarot</h1>
        <p className="text-white/60 text-sm max-w-[280px] mx-auto font-medium italic leading-relaxed">
          "Focus on your destiny and choose the card that calls to you."
        </p>
      </div>

      {!showResult ? (
        <div className="px-6 space-y-16 relative z-10">
          {/* 3 Tarot Cards */}
          <div className="flex justify-center items-center gap-4 h-64 perspective-1000 relative">
            {[0, 1, 2].map((i) => {
              const isSelected = selectedCard === i || (selectedCard?.index === i);
              const isOtherSelected = selectedCard !== null && !isSelected;
              
              // Move logic
              let moveTransform = '';
              if (isSelected) {
                 if (i === 0) moveTransform = 'translateX(112px)';
                 if (i === 2) moveTransform = 'translateX(-112px)';
              }

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
                    transform: moveTransform + (isFlipping && isSelected ? ' rotateY(180deg) scale(1.5)' : '')
                  }}
                >
                  {/* Magical Glow Burst Effect */}
                  {isSelected && showGlowBurst && (
                    <div className="absolute inset-0 bg-mystic-gold rounded-xl animate-glow-burst z-50 pointer-events-none" />
                  )}

                  {/* Hover Particles */}
                  {hoveredIndex === i && !selectedCard && [1,2,3,4,5].map(p => (
                    <div 
                      key={p} 
                      className="magical-particle"
                      style={{ 
                        // eslint-disable-next-line react-hooks/purity
                        top: `${Math.random() * 100}%`, 
                        // eslint-disable-next-line react-hooks/purity
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${p * 0.3}s`
                      }}
                    />
                  ))}

                  {/* TRUE 3D CARD - TWO SIDES */}
                  <div className="absolute inset-0 w-full h-full preserve-3d">
                    {/* BACK SIDE */}
                    <div className="absolute inset-0 backface-hidden glass rounded-xl border-2 border-mystic-gold/30 flex flex-col items-center justify-center overflow-hidden z-20 transition-colors duration-500">
                       <div className="absolute inset-1.5 border border-mystic-gold/10 rounded-lg" />
                       <div className="w-16 h-28 border border-mystic-gold/5 rounded-md flex items-center justify-center bg-gradient-to-br from-mystic-purple/20 to-transparent">
                          <span className="text-3xl opacity-30">🕉️</span>
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    </div>
                    
                    {/* FRONT SIDE (tarot card face) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 glass rounded-xl border-2 border-mystic-gold flex flex-col items-center justify-center z-10 bg-mystic-indigo/90">
                       {selectedCard?.image ? (
                          <div className="flex flex-col items-center space-y-2">
                             <span className="text-5xl">{selectedCard.image}</span>
                             <span className="text-[8px] font-black text-mystic-gold uppercase tracking-widest">{selectedCard.name}</span>
                          </div>
                       ) : (
                          <span className="text-4xl animate-pulse">🃏</span>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ad Gate */}
          {!canReadNow && (
            <div className="glass-card p-6 rounded-3xl border border-mystic-gold/20 text-center space-y-4 animate-fade-in">
               <h3 className="font-bold text-white uppercase tracking-wider">Session Limit</h3>
               <p className="text-xs text-white/40 leading-relaxed italic">The celestial energy needs time to reset. Watch a sacred message to unlock another reading.</p>
               <Button fullWidth variant="gold" onClick={handleWatchAd} disabled={isWatchingAd}>
                  {isWatchingAd ? 'Unlocking Path...' : 'Unlock Sacred Reading'}
               </Button>
               <button onClick={() => navigate('/premium')} className="text-xs font-black text-mystic-gold uppercase tracking-[0.2em] pt-2">
                  Go Pro for Unlimited Access
               </button>
            </div>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-3">
                  <h3 className="text-xs uppercase tracking-[0.3em] font-black text-white/30">Past Revelations</h3>
                  <div className="h-px flex-1 bg-white/10" />
               </div>
               <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="glass p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-mystic-gold/20 transition-all">
                       <span className="text-sm font-bold text-white/80">{h.cardName}</span>
                       <span className="text-[9px] text-white/20 font-bold">{h.timestamp?.toDate().toLocaleDateString()}</span>
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
                 <div className="w-40 h-60 glass rounded-2xl border-2 border-mystic-gold shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col items-center justify-center space-y-5 relative bg-mystic-indigo/40">
                    <span className="text-8xl drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">{selectedCard.image}</span>
                    <h2 className="text-xl font-black text-mystic-gold uppercase tracking-[0.1em]">{selectedCard.name}</h2>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest font-black text-mystic-gold mb-1">
                       🔮 Card Meaning
                    </h3>
                    <p className="text-sm text-white/90 leading-relaxed italic font-medium">
                       {selectedCard.meaning_en}
                    </p>
                 </div>

                 <div className="space-y-4 pl-1">
                    <div className="space-y-1.5">
                       <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center text-sm border border-rose-500/20">❤️</div>
                          <h4 className="font-black text-[11px] uppercase tracking-wider text-white/80">Love & Relations</h4>
                       </div>
                       <p className="text-sm text-white/50 leading-relaxed pl-9 italic font-medium">
                          {selectedCard.love_en}
                       </p>
                    </div>

                    <div className="space-y-1.5">
                       <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-sm border border-blue-500/20">💼</div>
                          <h4 className="font-black text-[11px] uppercase tracking-wider text-white/80">Career & Destiny</h4>
                       </div>
                       <p className="text-sm text-white/50 leading-relaxed pl-9 italic font-medium">
                          {selectedCard.career_en}
                       </p>
                    </div>

                    <div className="space-y-1.5">
                       <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm border border-emerald-500/20">🌿</div>
                          <h4 className="font-black text-[11px] uppercase tracking-wider text-white/80">Health & Energy</h4>
                       </div>
                       <p className="text-sm text-white/50 leading-relaxed pl-9 italic font-medium">
                          {selectedCard.health_en}
                       </p>
                    </div>
                 </div>
              </div>

              <div className="pt-6">
                 <Button variant="outline" fullWidth onClick={() => {setShowResult(false); setSelectedCard(null);}} className="rounded-2xl border-white/10 text-white/60">
                    Close Reading
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="mt-4 text-center">
         <button onClick={() => navigate('/')} className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] hover:text-white transition-all py-4">
            Back to Temple
         </button>
      </div>
    </div>
  );
};

export default Tarot;
