import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { executePanditAI, resetDailyQuestionIfNewDay } from '../services/userService';
import Button from '../components/ui/Button';

const AskPandit = () => {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [showLowCoinsModal, setShowLowCoinsModal] = useState(false);

  useEffect(() => {
    if (user) {
      resetDailyQuestionIfNewDay(user);
    }
  }, [user]);

  const isHindi = currentLanguage === 'Hindi';

  // Translations
  const ta = {
    title: isHindi ? 'पंडित जी से पूछें' : 'Ask Pandit AI',
    subtitle: isHindi ? '"वैदिक ज्योतिष द्वारा संचालित त्वरित आध्यात्मिक मार्गदर्शन प्राप्त करें"' : '"Get instant spiritual guidance powered by Vedic astrology"',
    selectCategory: isHindi ? 'श्रेणी चुनें' : 'Select Category',
    popularQuestions: isHindi ? 'लोकप्रिय प्रश्न' : 'Popular Questions',
    placeholder: isHindi ? 'अपना प्रश्न पूछें...' : 'Ask your question...',
    cost: isHindi ? 'लागत:' : 'Cost:',
    unlimited: isHindi ? 'असीमित' : 'Unlimited',
    freeToday: isHindi ? 'आज मुफ़्त' : 'FREE Today',
    tenCoins: isHindi ? '10 सिक्के' : '10 Coins',
    listening: isHindi ? 'पंडित जी सुन रहे हैं...' : 'Pandit AI is listening...',
    consulting: isHindi ? 'परामर्श ले रहे हैं...' : 'Consulting Pandit AI...',
    consultButton: isHindi ? 'परामर्श लें' : 'Consult Pandit AI',
    oracleSpeaks: isHindi ? 'ओरेकल का संदेश' : 'The Oracle Speaks',
    askAnother: isHindi ? 'एक और प्रश्न पूछें' : 'Ask Another Question',
    notEnough: isHindi ? 'सिक्के कम हैं' : 'Not enough coins',
    modalSub: isHindi ? 'पंडित जी से परामर्श के लिए 10 सिक्के या प्रीमियम सदस्यता आवश्यक है।' : 'Consulting Pandit AI requires 10 coins or a Premium subscription.',
    upgradeButton: isHindi ? 'प्रीमियम ₹49 अनलॉक करें' : 'Unlock Premium ₹49',
    earnButton: isHindi ? 'मुफ्त सिक्के कमाएं' : 'Earn Free Coins',
    maybeLater: isHindi ? 'बाद में' : 'Maybe Later',
    regarding: isHindi ? 'मेरे ' : 'Regarding my ',
  };

  const categories = useMemo(() => [
    { name: isHindi ? 'प्रेम' : 'Love', icon: '❤️' },
    { name: isHindi ? 'विवाह' : 'Marriage', icon: '💍' },
    { name: isHindi ? 'करियर' : 'Career', icon: '💼' },
    { name: isHindi ? 'धन' : 'Money', icon: '💰' },
    { name: isHindi ? 'शिक्षा' : 'Education', icon: '📚' },
    { name: isHindi ? 'परिवार' : 'Family', icon: '👨‍👩‍👧‍👦' },
    { name: isHindi ? 'भविष्य' : 'Future', icon: '🔮' },
  ], [isHindi]);

  const popularQuestions = useMemo(() => [
    isHindi ? "क्या मेरा एक्स वापस आएगा?" : "Will my ex come back?",
    isHindi ? "मुझे सच्चा प्यार कब मिलेगा?" : "When will I find true love?",
    isHindi ? "मेरी शादी कब होगी?" : "When will I get married?",
    isHindi ? "क्या मेरा क्रश मुझे मैसेज करेगा?" : "Will my crush message me?",
    isHindi ? "क्या मैं अमीर बनूँगा?" : "Will I become rich?",
    isHindi ? "मुझे नौकरी कब मिलेगी?" : "When will I get a job?",
    isHindi ? "मेरा भविष्य कैसा दिखता है?" : "What does my future look like?",
  ], [isHindi]);

  const generateAnswer = (userQuestion) => {
    // Basic language detection
    const isHindiQ = /[\u0900-\u097F]/.test(userQuestion) || 
                   /\b(kya|kab|kaise|hai|hoga|hogi|milega|jayega|kab tak)\b/i.test(userQuestion);
    
    const luckyEnergies = {
      English: ["Yellow, 7", "Red, 3", "Green, 5", "White, 2", "Orange, 9", "Blue, 8", "Golden, 1"],
      Hindi: ["पीला, 7", "लाल, 3", "हरा, 5", "सफेद, 2", "नारंगी, 9", "नीला, 8", "सुनहरा, 1"]
    };

    const responses = {
      English: {
        Prediction: [
          "The stars suggest a positive shift in your energy within the coming weeks.",
          "Planetary alignment indicates significant opportunities for growth.",
          "Your chart reflects favorable energy; divine timing is at work.",
          "A major breakthrough is visible in your astrological transition."
        ],
        Guidance: [
          "Stay patient and keep your intentions clear.",
          "Trust your intuition during this transition phase.",
          "Focus on consistency rather than immediate results.",
          "Meditate on your goals to manifest them faster."
        ]
      },
      Hindi: {
        Prediction: [
          "ग्रहों की स्थिति अगले कुछ हफ्तों में आपके जीवन में एक सकारात्मक बदलाव का संकेत दे रही है।",
          "आपकी कुंडली में सफलता और उन्नति के प्रबल योग बन रहे हैं।",
          "सितारों की चाल आपके पक्ष में है, सही समय का इंतज़ार करें।",
          "आने वाला समय आपके लिए नई खुशियाँ और अवसर लेकर आएगा।"
        ],
        Guidance: [
          "धैर्य रखें और अपने लक्ष्यों पर ध्यान केंद्रित करें।",
          "अपनी अंतरात्मा की आवाज़ सुनें, वही आपको सही रास्ता दिखाएगी।",
          "जल्दबाजी में कोई भी बड़ा फैसला न लें।",
          "हनुमान चालीसा या ध्यान का सहारा लें, मन शांत रहेगा।"
        ]
      }
    };

    const lang = isHindiQ ? 'Hindi' : 'English';
    const pool = responses[lang];
    const energyPool = luckyEnergies[lang];
    
    // eslint-disable-next-line react-hooks/purity
    const pred = pool.Prediction[Math.floor(Math.random() * pool.Prediction.length)];
    // eslint-disable-next-line react-hooks/purity
    const guid = pool.Guidance[Math.floor(Math.random() * pool.Guidance.length)];
    // eslint-disable-next-line react-hooks/purity
    const lucky = energyPool[Math.floor(Math.random() * energyPool.length)];

    const labels = {
      English: { p: "🔮 Prediction:", g: "✨ Guidance:", l: "⭐ Lucky Energy:" },
      Hindi: { p: "🔮 भविष्यवाणी:", g: "✨ मार्गदर्शन:", l: "⭐ शुभ ऊर्जा:" }
    };

    return `${labels[lang].p}\n${pred}\n\n${labels[lang].g}\n${guid}\n\n${labels[lang].l}\n${lucky}`;
  };

  const handleAsk = async () => {
    if (!question.trim() || isConsulting || !user) return;

    const isFree = !user?.premium && !user?.dailyQuestionUsed;
    const hasEnoughCoins = (user?.coins || 0) >= 10;

    if (!user?.premium && !isFree && !hasEnoughCoins) {
      setShowLowCoinsModal(true);
      return;
    }

    setIsConsulting(true);
    setAnswer('');

    // Simulate spiritual connection
    setTimeout(async () => {
      try {
        if (!user?.premium) {
          await executePanditAI(user.uid, isFree);
        }
        
        const predictedAnswer = generateAnswer(question);
        setAnswer(predictedAnswer);
      } catch (error) {
        console.error("Pandit AI Error:", error);
      } finally {
        setIsConsulting(false);
      }
    }, 2500);
  };

  return (
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen">
      <div className="px-6 pt-12 pb-8 text-center space-y-4">
        <div className="inline-block px-3 py-1 bg-gradient-to-r from-mystic-gold to-amber-600 text-mystic-indigo text-[10px] font-black rounded-full shadow-[0_0_15px_rgba(251,191,36,0.4)] mb-2 uppercase tracking-widest">
           ⭐ {isHindi ? 'सबसे लोकप्रिय' : 'Most Popular'}
        </div>
        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text text-white leading-tight">
          {ta.title}
        </h1>
        <p className="text-white/80 text-sm max-w-[280px] mx-auto font-medium">
          {isHindi 
            ? 'करियर, प्रेम, विवाह, वित्त और भविष्य मार्गदर्शन के बारे में असीमित प्रश्न पूछें।' 
            : 'Ask unlimited questions about career, love, marriage, finance and future guidance.'}
        </p>
      </div>

      {!answer ? (
        <>
          <div className="px-6 mb-8">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-white/30 mb-4">{ta.selectCategory}</h3>
            <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2">
              {categories.map((cat) => (
                <div 
                  key={cat.name} 
                  onClick={() => setQuestion(`${ta.regarding}${cat.name.toLowerCase()}... `)}
                  className="flex-shrink-0 px-4 py-3 glass rounded-2xl border border-white/5 flex items-center gap-2 hover:border-mystic-gold/50 cursor-pointer transition-all"
                >
                  <span>{cat.icon}</span>
                  <span className="text-xs font-bold text-white/80">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 mb-8">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-white/30 mb-4">{ta.popularQuestions}</h3>
            <div className="space-y-2">
              {popularQuestions.slice(0, 4).map((q) => (
                <div 
                  key={q} 
                  onClick={() => setQuestion(q)}
                  className="p-4 glass rounded-xl border border-white/5 text-sm text-white/80 hover:bg-white/5 cursor-pointer transition-all"
                >
                  {q}
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 space-y-4">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={ta.placeholder}
              className="w-full h-32 glass rounded-3xl p-5 text-white placeholder:text-white/20 focus:outline-none focus:border-mystic-gold/50 border border-white/10 resize-none"
            />
            
            <div className="flex justify-between items-center px-2">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/40">{ta.cost}</span>
                  {user?.premium ? (
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">{ta.unlimited}</span>
                  ) : !user?.dailyQuestionUsed ? (
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">{ta.freeToday}</span>
                  ) : (
                    <span className="text-xs font-bold text-mystic-gold uppercase tracking-widest">{ta.tenCoins}</span>
                  )}
               </div>
               <span className="text-[10px] text-white/20 font-bold italic">{ta.listening}</span>
            </div>

            <Button 
              fullWidth 
              variant="gold" 
              onClick={handleAsk}
              disabled={!question.trim() || isConsulting}
              className="h-16 shadow-[0_0_30px_rgba(251,191,36,0.1)]"
            >
              {isConsulting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-mystic-indigo/20 border-t-mystic-indigo rounded-full animate-spin" />
                  <span>{ta.consulting}</span>
                </div>
              ) : (
                <>
                  <span className="text-2xl">🧘</span>
                  {ta.consultButton}
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="px-6 animate-fade-in">
          <div className="glass-card p-8 rounded-[40px] border border-mystic-gold/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-10">
                <span className="text-6xl text-white">🔮</span>
             </div>
             
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-mystic-gold/10 border border-mystic-gold/30 flex items-center justify-center text-3xl">
                   <span className="text-white">🕉️</span>
                </div>
                <div className="space-y-2">
                   <h3 className="text-sm font-bold text-mystic-gold uppercase tracking-[0.3em]">{ta.oracleSpeaks}</h3>
                   <div className="h-0.5 w-12 bg-mystic-gold/30 mx-auto" />
                </div>
                <p className="text-xl font-serif italic leading-relaxed text-white/90 whitespace-pre-wrap text-left">
                  {answer}
                </p>
                <div className="pt-6">
                   <Button variant="outline" onClick={() => {setAnswer(''); setQuestion('');}}>
                      {ta.askAnother}
                   </Button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showLowCoinsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-8 rounded-[32px] w-full max-w-sm border border-white/10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl mx-auto">
              <span className="text-white">🪙</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">{ta.notEnough}</h2>
              <p className="text-white/60 text-sm">{ta.modalSub}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button fullWidth variant="gold" onClick={() => navigate('/premium')}>
                {ta.upgradeButton}
              </Button>
              <Button fullWidth variant="primary" onClick={() => navigate('/')}>
                {ta.earnButton}
              </Button>
              <button onClick={() => setShowLowCoinsModal(false)} className="text-xs font-bold text-white/40 uppercase tracking-widest pt-2">
                {ta.maybeLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskPandit;
