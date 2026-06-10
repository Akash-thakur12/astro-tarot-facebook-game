import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { executePanditAI, resetDailyQuestionIfNewDay } from '../services/userService';
import Button from '../components/ui/Button';

const AskPandit = () => {
  const { user } = useAuth();
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

  const categories = [
    { name: 'Love', icon: '❤️' },
    { name: 'Marriage', icon: '💍' },
    { name: 'Career', icon: '💼' },
    { name: 'Money', icon: '💰' },
    { name: 'Education', icon: '📚' },
    { name: 'Family', icon: '👨‍👩‍👧‍👦' },
    { name: 'Future', icon: '🔮' },
  ];

  const popularQuestions = [
    "Will my ex come back?",
    "When will I find true love?",
    "When will I get married?",
    "Will my crush message me?",
    "Will I become rich?",
    "When will I get a job?",
    "What does my future look like?",
  ];

  const generateAnswer = (userQuestion) => {
    // Basic language detection
    const isHindi = /[\u0900-\u097F]/.test(userQuestion) || 
                   /\b(kya|kab|kaise|hai|hoga|hogi|milega|jayega|kab tak)\b/i.test(userQuestion);
    
    const luckyEnergies = [
      "Yellow, 7", "Red, 3", "Green, 5", "White, 2", "Orange, 9", "Blue, 8", "Golden, 1"
    ];

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

    const lang = isHindi ? 'Hindi' : 'English';
    const pool = responses[lang];
    
    const pred = pool.Prediction[Math.floor(Math.random() * pool.Prediction.length)];
    const guid = pool.Guidance[Math.floor(Math.random() * pool.Guidance.length)];
    const lucky = luckyEnergies[Math.floor(Math.random() * luckyEnergies.length)];

    return `🔮 Prediction:\n${pred}\n\n✨ Guidance:\n${guid}\n\n⭐ Lucky Energy:\n${lucky}`;
  };

  const handleAsk = async () => {
    if (!question.trim() || isConsulting) return;

    const isFree = !user.premium && !user.dailyQuestionUsed;
    const hasEnoughCoins = user.coins >= 10;

    if (!user.premium && !isFree && !hasEnoughCoins) {
      setShowLowCoinsModal(true);
      return;
    }

    setIsConsulting(true);
    setAnswer('');

    // Simulate spiritual connection
    setTimeout(async () => {
      try {
        if (!user.premium) {
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
      {/* Top Section */}
      <div className="px-6 pt-12 pb-8 text-center space-y-4">
        <h1 className="text-4xl font-bold premium-gradient-text">Ask Pandit AI</h1>
        <p className="text-white/60 text-sm max-w-[280px] mx-auto italic">
          "Get instant spiritual guidance powered by Vedic astrology"
        </p>
      </div>

      {!answer ? (
        <>
          {/* Categories */}
          <div className="px-6 mb-8">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-white/30 mb-4">Select Category</h3>
            <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2">
              {categories.map((cat) => (
                <div 
                  key={cat.name} 
                  onClick={() => setQuestion(`Regarding my ${cat.name.toLowerCase()}... `)}
                  className="flex-shrink-0 px-4 py-3 glass rounded-2xl border border-white/5 flex items-center gap-2 hover:border-mystic-gold/50 cursor-pointer transition-all"
                >
                  <span>{cat.icon}</span>
                  <span className="text-xs font-bold">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Questions */}
          <div className="px-6 mb-8">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-white/30 mb-4">Popular Questions</h3>
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

          {/* Input Area */}
          <div className="px-6 space-y-4">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask your question..."
              className="w-full h-32 glass rounded-3xl p-5 text-white placeholder:text-white/20 focus:outline-none focus:border-mystic-gold/50 border border-white/10 resize-none"
            />
            
            <div className="flex justify-between items-center px-2">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/40">Cost:</span>
                  {user.premium ? (
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Unlimited</span>
                  ) : !user.dailyQuestionUsed ? (
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">FREE Today</span>
                  ) : (
                    <span className="text-xs font-bold text-mystic-gold uppercase tracking-widest">10 Coins</span>
                  )}
               </div>
               <span className="text-[10px] text-white/20 font-bold italic">Pandit AI is listening...</span>
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
                  <span>Consulting Pandit AI...</span>
                </div>
              ) : (
                <>
                  <span className="text-2xl">🧘</span>
                  Consult Pandit AI
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        /* Answer Section */
        <div className="px-6 animate-fade-in">
          <div className="glass-card p-8 rounded-[40px] border border-mystic-gold/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-10">
                <span className="text-6xl">🔮</span>
             </div>
             
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-mystic-gold/10 border border-mystic-gold/30 flex items-center justify-center text-3xl">
                   🕉️
                </div>
                <div className="space-y-2">
                   <h3 className="text-sm font-bold text-mystic-gold uppercase tracking-[0.3em]">The Oracle Speaks</h3>
                   <div className="h-0.5 w-12 bg-mystic-gold/30 mx-auto" />
                </div>
                <p className="text-xl font-serif italic leading-relaxed text-white/90 whitespace-pre-wrap text-left">
                  {answer}
                </p>
                <div className="pt-6">
                   <Button variant="outline" onClick={() => {setAnswer(''); setQuestion('');}}>
                      Ask Another Question
                   </Button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Low Coins Modal */}
      {showLowCoinsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-8 rounded-[32px] w-full max-w-sm border border-white/10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl mx-auto">
              🪙
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Not enough coins</h2>
              <p className="text-white/60 text-sm">Consulting Pandit AI requires 10 coins or a Premium subscription.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button fullWidth variant="gold" onClick={() => navigate('/premium')}>
                Unlock Premium ₹29
              </Button>
              <Button fullWidth variant="primary" onClick={() => navigate('/')}>
                Earn Free Coins
              </Button>
              <button onClick={() => setShowLowCoinsModal(false)} className="text-xs font-bold text-white/40 uppercase tracking-widest pt-2">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskPandit;
