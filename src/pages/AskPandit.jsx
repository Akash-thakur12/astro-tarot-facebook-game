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
  const isHindi = currentLanguage === 'Hindi';

  // State
  const [mode, setMode] = useState('personal'); // 'personal' | 'compatibility'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLowCoinsModal, setShowLowCoinsModal] = useState(false);

  // Forms
  const [personalForm, setPersonalForm] = useState({ name: '', dob: '', tob: '', pob: '', question: '' });
  const [compForm, setCompForm] = useState({
    p1: { name: '', dob: '', tob: '', pob: '' },
    p2: { name: '', dob: '', tob: '', pob: '' }
  });

  useEffect(() => {
    if (user) {
      resetDailyQuestionIfNewDay(user);
    }
  }, [user]);

  // Translations
  const t = {
    title: isHindi ? 'ज्योतिष सहायक' : 'Astrology Assistant',
    personalTab: isHindi ? 'व्यक्तिगत रीडिंग' : 'Personal Reading',
    compTab: isHindi ? 'अनुकूलता जांच' : 'Compatibility Check',
    name: isHindi ? 'नाम' : 'Name',
    dob: isHindi ? 'जन्म तिथि' : 'Date of Birth',
    tob: isHindi ? 'जन्म समय' : 'Time of Birth',
    pob: isHindi ? 'जन्म स्थान' : 'Place of Birth',
    question: isHindi ? 'अपना प्रश्न पूछें (जैसे: 2026 कैसा रहेगा?)' : 'Ask your question (e.g. How will 2026 be?)',
    person1: isHindi ? 'पहला व्यक्ति' : 'Person 1',
    person2: isHindi ? 'दूसरा व्यक्ति' : 'Person 2',
    generateBtn: isHindi ? 'विश्लेषण करें' : 'Analyze Energies',
    loadingText: isHindi ? '🔮 पंडित जी ब्रह्मांडीय ऊर्जा का विश्लेषण कर रहे हैं...' : '🔮 Pandit AI is analyzing celestial energies...',
    notAstrology: isHindi ? '🙏 पंडित एआई केवल ज्योतिष और आध्यात्मिक मार्गदर्शन प्रदान करता है।' : '🙏 Pandit AI only provides astrology and spiritual guidance.',
    unlimited: isHindi ? 'असीमित' : 'Unlimited',
    freeToday: isHindi ? 'आज मुफ़्त' : 'FREE Today',
    tenCoins: isHindi ? '10 सिक्के' : '10 Coins',
    notEnough: isHindi ? 'सिक्के कम हैं' : 'Not enough coins',
    modalSub: isHindi ? 'परामर्श के लिए 10 सिक्के या प्रीमियम सदस्यता आवश्यक है।' : 'Consulting requires 10 coins or a Premium subscription.',
    upgradeButton: isHindi ? 'प्रीमियम ₹49 अनलॉक करें' : 'Unlock Premium ₹49',
    earnButton: isHindi ? 'मुफ्त सिक्के कमाएं' : 'Watch Ad to Continue',
    maybeLater: isHindi ? 'बाद में' : 'Maybe Later',
    back: isHindi ? 'नया प्रश्न पूछें' : 'Ask Another Question'
  };

  // ASTROLOGY FILTER
  const checkIsAstrology = (text) => {
    if (!text) return true; // Empty text in compatibility is fine
    const allowed = /astrology|horoscope|zodiac|marriage|love|career|future|remedy|kundli|kundali|din|rahega|shadi|paisa|finance|health|lucky|spiritual|god|planet|star|prediction/i;
    const denied = /coding|politics|news|science|math|general knowledge|modi|biden|trump|react|javascript|python|css/i;
    if (denied.test(text)) return false;
    return allowed.test(text) || true; // Broadly accept if no strict deny, since it's an MVP.
  };

  // MOCK GENERATORS
  const generatePersonal = (q) => {
    return {
      type: 'personal',
      overall: isHindi ? "ग्रहों का गोचर आपके पक्ष में है। आने वाला समय सकारात्मक है।" : "Planetary transits are in your favor. The coming period is highly positive.",
      career: isHindi ? "नई जिम्मेदारियां मिल सकती हैं। मेहनत रंग लाएगी।" : "You may receive new responsibilities. Hard work will pay off.",
      love: isHindi ? "रिश्तों में मधुरता आएगी। आपसी समझ बढ़ेगी।" : "Sweetness in relationships will increase. Mutual understanding grows.",
      marriage: isHindi ? "विवाह के प्रबल योग बन रहे हैं। गुरु की कृपा है।" : "Strong marriage prospects are forming. Jupiter's grace is present.",
      finance: isHindi ? "आर्थिक स्थिति स्थिर रहेगी। निवेश से लाभ संभव है।" : "Financial status remains stable. Gains from investments are possible.",
      health: isHindi ? "स्वास्थ्य अच्छा रहेगा, लेकिन ध्यान आवश्यक है।" : "Health remains good, but meditation is recommended.",
      luckyColor: isHindi ? "सुनहरा पीला" : "Golden Yellow",
      luckyNumber: 7,
      remedies: isHindi ? "सूर्य को जल चढ़ाएं और गुरुवार को पीला दान करें।" : "Offer water to the Sun and donate yellow items on Thursday.",
      positive: isHindi ? "आत्मविश्वास और निर्णय लेने की क्षमता।" : "Self-confidence and decision-making ability.",
      watch: isHindi ? "जल्दबाजी में लिए गए फैसले।" : "Hasty decisions."
    };
  };

  const generateComp = () => {
    return {
      type: 'compatibility',
      score: 82,
      guna: 28,
      comm: isHindi ? "विचारों का अच्छा आदान-प्रदान, बुध की स्थिति अनुकूल।" : "Good exchange of ideas, Mercury's position is favorable.",
      emo: isHindi ? "चंद्रमा का मिलन शानदार है। गहरी समझ।" : "Moon combination is excellent. Deep emotional understanding.",
      marriage: isHindi ? "दीर्घकालिक विवाह के लिए उत्कृष्ट योग।" : "Excellent alignment for a long-term marriage.",
      strengths: isHindi ? "पारस्परिक सम्मान और वफादारी।" : "Mutual respect and loyalty.",
      challenges: isHindi ? "अहंकार के टकराव से बचें।" : "Avoid ego clashes.",
      outlook: isHindi ? "एक सुखद और समृद्ध साझा भविष्य।" : "A happy and prosperous shared future.",
      guidance: isHindi ? "एक-दूसरे की कमियों को स्वीकार करें। शिव-पार्वती की पूजा करें।" : "Accept each other's flaws. Worship Shiva-Parvati."
    };
  };

  const handleGenerate = async () => {
    if (loading || !user) return;
    setErrorMsg('');

    // Validation & Filtering
    if (mode === 'personal') {
      if (!personalForm.name || !personalForm.question) {
        setErrorMsg('Please fill name and question.');
        return;
      }
      if (!checkIsAstrology(personalForm.question)) {
        setErrorMsg(t.notAstrology);
        return;
      }
    } else {
      if (!compForm.p1.name || !compForm.p2.name) {
        setErrorMsg('Please fill both names.');
        return;
      }
    }

    // Monetization Check
    const isFree = !user?.premium && (mode === 'personal' ? !user?.dailyQuestionUsed : !user?.dailyCompUsed);
    const hasEnoughCoins = (user?.coins || 0) >= 10;

    if (!user?.premium && !isFree && !hasEnoughCoins) {
      setShowLowCoinsModal(true);
      return;
    }

    setLoading(true);
    setResult(null);

    // Simulate API Call
    setTimeout(async () => {
      try {
        if (!user?.premium) {
          await executePanditAI(user.uid, isFree, mode);
        }
        
        const data = mode === 'personal' ? generatePersonal(personalForm.question) : generateComp();
        setResult(data);
      } catch (error) {
        console.error("AI Error:", error);
        setErrorMsg("Error generating reading.");
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  const InputField = ({ label, type = 'text', value, onChange, placeholder }) => (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-mystic-gold/50 transition-all placeholder:text-white/20"
      />
    </div>
  );

  return (
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen bg-[#020617]">
      
      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center space-y-3 relative z-10">
        <div className="inline-block px-3 py-1 bg-gradient-to-r from-mystic-gold to-amber-600 text-mystic-indigo text-[10px] font-black rounded-full shadow-[0_0_15px_rgba(251,191,36,0.4)] uppercase tracking-widest">
           ⭐ {isHindi ? 'प्रीमियम एआई' : 'PREMIUM AI'}
        </div>
        <h1 className="text-3xl md:text-4xl font-black premium-gradient-text text-white">{t.title}</h1>
      </div>

      {!result && !loading && (
        <div className="px-6 space-y-6">
          {/* Tabs */}
          <div className="flex glass-card p-1 rounded-2xl border-white/5 overflow-hidden">
            <button
              onClick={() => setMode('personal')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl ${
                mode === 'personal' ? 'bg-mystic-gold text-mystic-indigo' : 'text-white/40'
              }`}
            >
              🔮 {t.personalTab}
            </button>
            <button
              onClick={() => setMode('compatibility')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl ${
                mode === 'compatibility' ? 'bg-mystic-gold text-mystic-indigo' : 'text-white/40'
              }`}
            >
              ❤️ {t.compTab}
            </button>
          </div>

          {/* Forms */}
          <div className="glass-card p-6 rounded-[2rem] border-white/5 space-y-5">
            {mode === 'personal' ? (
              <div className="space-y-4 animate-fade-in">
                <InputField label={t.name} value={personalForm.name} onChange={e => setPersonalForm({...personalForm, name: e.target.value})} placeholder="Rahul" />
                <div className="grid grid-cols-2 gap-3">
                  <InputField label={t.dob} type="date" value={personalForm.dob} onChange={e => setPersonalForm({...personalForm, dob: e.target.value})} />
                  <InputField label={t.tob} type="time" value={personalForm.tob} onChange={e => setPersonalForm({...personalForm, tob: e.target.value})} />
                </div>
                <InputField label={t.pob} value={personalForm.pob} onChange={e => setPersonalForm({...personalForm, pob: e.target.value})} placeholder="Delhi" />
                <div className="flex flex-col gap-1 w-full pt-2">
                  <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">❓ Question</label>
                  <textarea 
                    value={personalForm.question}
                    onChange={e => setPersonalForm({...personalForm, question: e.target.value})}
                    placeholder={t.question}
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-mystic-gold/50 transition-all placeholder:text-white/20 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                  <h3 className="text-xs font-black text-mystic-gold uppercase tracking-widest">{t.person1}</h3>
                  <InputField label={t.name} value={compForm.p1.name} onChange={e => setCompForm({...compForm, p1: {...compForm.p1, name: e.target.value}})} placeholder="Romeo" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label={t.dob} type="date" value={compForm.p1.dob} onChange={e => setCompForm({...compForm, p1: {...compForm.p1, dob: e.target.value}})} />
                    <InputField label={t.tob} type="time" value={compForm.p1.tob} onChange={e => setCompForm({...compForm, p1: {...compForm.p1, tob: e.target.value}})} />
                  </div>
                </div>
                <div className="text-center text-2xl animate-pulse">💕</div>
                <div className="space-y-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                  <h3 className="text-xs font-black text-mystic-gold uppercase tracking-widest">{t.person2}</h3>
                  <InputField label={t.name} value={compForm.p2.name} onChange={e => setCompForm({...compForm, p2: {...compForm.p2, name: e.target.value}})} placeholder="Juliet" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label={t.dob} type="date" value={compForm.p2.dob} onChange={e => setCompForm({...compForm, p2: {...compForm.p2, dob: e.target.value}})} />
                    <InputField label={t.tob} type="time" value={compForm.p2.tob} onChange={e => setCompForm({...compForm, p2: {...compForm.p2, tob: e.target.value}})} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-center font-bold">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/40">Cost:</span>
                  {user?.premium ? (
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">{t.unlimited}</span>
                  ) : (mode === 'personal' ? !user?.dailyQuestionUsed : !user?.dailyCompUsed) ? (
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">{t.freeToday}</span>
                  ) : (
                    <span className="text-xs font-bold text-mystic-gold uppercase tracking-widest">{t.tenCoins}</span>
                  )}
               </div>
            </div>
            <Button fullWidth variant="gold" onClick={handleGenerate} className="h-16 text-lg tracking-widest">
              {t.generateBtn}
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 px-6 py-20">
          <div className="w-16 h-16 border-4 border-mystic-indigo/20 border-t-mystic-gold rounded-full animate-spin shadow-[0_0_30px_rgba(251,191,36,0.3)]" />
          <p className="text-mystic-gold font-black uppercase tracking-widest text-center animate-pulse text-sm">
            {t.loadingText}
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="px-6 space-y-6 animate-fade-in pb-10">
          
          {result.type === 'personal' ? (
            <div className="glass-card p-6 rounded-[2.5rem] border-mystic-gold/20 space-y-6">
              <div className="text-center space-y-2 mb-8">
                <span className="text-4xl">🔮</span>
                <h2 className="text-2xl font-black text-white">{personalForm.name}&apos;s Reading</h2>
              </div>
              
              <div className="space-y-5">
                {[
                  { icon: '🔮', title: 'Overall Reading', text: result.overall },
                  { icon: '💼', title: 'Career', text: result.career },
                  { icon: '❤️', title: 'Love', text: result.love },
                  { icon: '💍', title: 'Marriage', text: result.marriage },
                  { icon: '💰', title: 'Finance', text: result.finance },
                  { icon: '🏥', title: 'Health Guidance', text: result.health },
                ].map((s, i) => (
                  <div key={i} className="space-y-1 bg-white/5 p-4 rounded-2xl">
                    <h4 className="text-mystic-gold text-xs font-black uppercase tracking-widest flex items-center gap-2"><span>{s.icon}</span> {s.title}</h4>
                    <p className="text-white/80 text-sm italic">{s.text}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-4 rounded-2xl text-center">
                   <h4 className="text-[10px] text-white/40 uppercase font-black">🎨 Lucky Color</h4>
                   <p className="text-mystic-gold font-bold">{result.luckyColor}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl text-center">
                   <h4 className="text-[10px] text-white/40 uppercase font-black">🔢 Lucky Number</h4>
                   <p className="text-mystic-gold font-bold text-xl">{result.luckyNumber}</p>
                </div>
              </div>

              <div className="bg-mystic-gold/10 border border-mystic-gold/20 p-4 rounded-2xl">
                <h4 className="text-mystic-gold text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2"><span>🙏</span> Remedies</h4>
                <p className="text-white/90 text-sm font-bold">{result.remedies}</p>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 rounded-[2.5rem] border-pink-500/20 space-y-6">
              <div className="text-center space-y-2 mb-8">
                <span className="text-4xl">💕</span>
                <h2 className="text-xl font-black text-white">{compForm.p1.name} & {compForm.p2.name}</h2>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4 bg-white/5 p-5 rounded-3xl">
                 <div className="space-y-1">
                   <div className="flex justify-between">
                     <span className="text-xs font-black text-white/60">Compatibility Score</span>
                     <span className="text-xs font-black text-pink-400">{result.score}%</span>
                   </div>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-pink-500 rounded-full" style={{ width: `${result.score}%` }} />
                   </div>
                 </div>
                 <div className="space-y-1">
                   <div className="flex justify-between">
                     <span className="text-xs font-black text-white/60">Guna Milan (Max 36)</span>
                     <span className="text-xs font-black text-mystic-gold">{result.guna}/36</span>
                   </div>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-mystic-gold rounded-full" style={{ width: `${(result.guna/36)*100}%` }} />
                   </div>
                 </div>
              </div>

              <div className="space-y-5">
                {[
                  { icon: '🧠', title: 'Communication', text: result.comm },
                  { icon: '❤️', title: 'Emotional', text: result.emo },
                  { icon: '💍', title: 'Marriage Potential', text: result.marriage },
                  { icon: '⚖️', title: 'Strengths', text: result.strengths },
                  { icon: '⚠️', title: 'Challenges', text: result.challenges },
                  { icon: '🔮', title: 'Long-Term Outlook', text: result.outlook },
                ].map((s, i) => (
                  <div key={i} className="space-y-1 bg-white/5 p-4 rounded-2xl">
                    <h4 className="text-pink-400 text-xs font-black uppercase tracking-widest flex items-center gap-2"><span>{s.icon}</span> {s.title}</h4>
                    <p className="text-white/80 text-sm italic">{s.text}</p>
                  </div>
                ))}
              </div>

              <div className="bg-pink-500/10 border border-pink-500/20 p-4 rounded-2xl">
                <h4 className="text-pink-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2"><span>🙏</span> Guidance</h4>
                <p className="text-white/90 text-sm font-bold">{result.guidance}</p>
              </div>
            </div>
          )}

          <Button fullWidth variant="outline" onClick={() => setResult(null)} className="h-14">
            {t.back}
          </Button>
        </div>
      )}

      {showLowCoinsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-8 rounded-[32px] w-full max-w-sm border border-white/10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl mx-auto">
              <span className="text-white">🪙</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">{t.notEnough}</h2>
              <p className="text-white/60 text-sm">{t.modalSub}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button fullWidth variant="gold" onClick={() => navigate('/premium')}>
                {t.upgradeButton}
              </Button>
              <Button fullWidth variant="primary" onClick={() => navigate('/')}>
                {t.earnButton}
              </Button>
              <button onClick={() => setShowLowCoinsModal(false)} className="text-xs font-bold text-white/40 uppercase tracking-widest pt-2">
                {t.maybeLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskPandit;
