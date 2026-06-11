import { useState, useEffect } from 'react';
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
  const [pickerConfig, setPickerConfig] = useState(null);

  // Forms
  const [personalForm, setPersonalForm] = useState({ 
    name: '', dobDay: '', dobMonth: '', dobYear: '', tobHour: '', tobMinute: '', tobPeriod: '', pob: '', question: '' 
  });
  const [compForm, setCompForm] = useState({
    p1: { name: '', dobDay: '', dobMonth: '', dobYear: '', tobHour: '', tobMinute: '', tobPeriod: '', pob: '' },
    p2: { name: '', dobDay: '', dobMonth: '', dobYear: '', tobHour: '', tobMinute: '', tobPeriod: '', pob: '' }
  });

  useEffect(() => {
    if (user) {
      resetDailyQuestionIfNewDay(user);
    }
  }, [user]);

  // DYNAMIC LANGUAGE DETECTION
  const detectTone = (text) => {
    if (!text) return isHindi ? 'hindi_script' : 'english';
    
    const lower = text.toLowerCase();
    
    if (/[\u0900-\u097F]/.test(text)) return 'hindi_script';
    
    const hinglishWords = ['kya', 'kab', 'kaise', 'hai', 'hoga', 'hogi', 'milega', 'jayega', 'mera', 'meri', 'shaadi', 'shadi', 'rahega', 'kar', 'raha'];
    if (hinglishWords.some(w => lower.includes(w))) return 'hinglish';

    if (lower.includes('kida') || lower.includes('ki') || lower.includes('kive') || (lower.includes('mera') && lower.includes('vyah'))) return 'punjabi';
    
    if (lower.includes('kemon') || lower.includes('amar') || lower.includes('kobe') || lower.includes('hobe') || lower.includes('biye')) return 'bengali';
    
    return 'english';
  };

  const currentTone = mode === 'personal' ? detectTone(personalForm.question) : (isHindi ? 'hindi_script' : 'english');

  // Translations (Static UI elements based on global toggle)
  const t = {
    title: isHindi ? 'ज्योतिष सहायक' : 'Astrology Assistant',
    personalTab: isHindi ? 'व्यक्तिगत रीडिंग' : 'Personal Reading',
    compTab: isHindi ? 'अनुकूलता जांच' : 'Compatibility Check',
    name: isHindi ? 'नाम' : 'Name',
    dob: isHindi ? 'जन्म तिथि' : 'Date of Birth',
    tob: isHindi ? 'जन्म समय' : 'Time of Birth',
    pob: isHindi ? 'जन्म स्थान' : 'Place of Birth',
    day: isHindi ? 'दिन' : 'Day',
    month: isHindi ? 'महीना' : 'Month',
    year: isHindi ? 'वर्ष' : 'Year',
    hour: isHindi ? 'घंटा' : 'Hour',
    min: isHindi ? 'मिनट' : 'Min',
    period: 'AM/PM',
    question: isHindi ? 'अपना प्रश्न पूछें (जैसे: 2026 कैसा रहेगा?)' : 'Ask your question (e.g. How will 2026 be?)',
    person1: isHindi ? 'पहला व्यक्ति' : 'Person 1',
    person2: isHindi ? 'दूसरा व्यक्ति' : 'Person 2',
    generateBtn: isHindi ? 'विश्लेषण करें' : 'Analyze Energies',
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

  const getDynamicLoadingText = (tone) => {
    switch (tone) {
      case 'hindi_script': return '🔮 पंडित जी आपकी ग्रह ऊर्जा का विश्लेषण कर रहे हैं...';
      case 'hinglish': return '🔮 Pandit AI aapki kundli aur planetary energies analyze kar raha hai...';
      case 'punjabi': return '🔮 Pandit AI tuhadi planetary energies da analysis kar riha hai...';
      case 'bengali': return '🔮 Pandit AI apnar planetary energies analyze korche...';
      default: return '🔮 Pandit AI is analyzing your celestial energies...';
    }
  };

  const getDynamicInvalidDateMsg = (tone) => {
    if (tone === 'hindi_script') return 'कृपया मान्य जन्म तिथि दर्ज करें';
    if (tone === 'hinglish') return 'Please ek valid birth date enter karein';
    return 'Please enter a valid birth date';
  };

  const getDynamicNotAstrologyMsg = (tone) => {
    if (tone === 'hindi_script') return '🙏 पंडित एआई केवल ज्योतिष और आध्यात्मिक मार्गदर्शन प्रदान करता है।';
    if (tone === 'hinglish') return '🙏 Pandit AI sirf astrology aur spiritual guidance provide karta hai.';
    return '🙏 Pandit AI only provides astrology and spiritual guidance.';
  };

  // Selectors Data
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = [
    { name: isHindi ? 'जनवरी' : 'January', value: '01' },
    { name: isHindi ? 'फ़रवरी' : 'February', value: '02' },
    { name: isHindi ? 'मार्च' : 'March', value: '03' },
    { name: isHindi ? 'अप्रैल' : 'April', value: '04' },
    { name: isHindi ? 'मई' : 'May', value: '05' },
    { name: isHindi ? 'जून' : 'June', value: '06' },
    { name: isHindi ? 'जुलाई' : 'July', value: '07' },
    { name: isHindi ? 'अगस्त' : 'August', value: '08' },
    { name: isHindi ? 'सितंबर' : 'September', value: '09' },
    { name: isHindi ? 'अक्टूबर' : 'October', value: '10' },
    { name: isHindi ? 'नवंबर' : 'November', value: '11' },
    { name: isHindi ? 'दिसंबर' : 'December', value: '12' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => (currentYear - i).toString());

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  // ASTROLOGY FILTER
  const checkIsAstrology = (text) => {
    if (!text) return true;
    const allowed = /astrology|horoscope|zodiac|marriage|love|career|future|remedy|kundli|kundali|din|rahega|shadi|shaadi|paisa|finance|health|lucky|spiritual|god|planet|star|prediction|vyah|bhalobasha|biye/i;
    const denied = /coding|politics|news|science|math|general knowledge|modi|biden|trump|react|javascript|python|css|html|computer/i;
    if (denied.test(text)) return false;
    return allowed.test(text) || true;
  };

  const validateDate = (day, month, year) => {
    if (!day || !month || !year) return null; // Incomplete
    const d = parseInt(day, 10);
    const m = parseInt(month, 10) - 1;
    const y = parseInt(year, 10);
    const date = new Date(y, m, d);
    
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) {
      return false; // Invalid date
    }
    
    const now = new Date();
    if (date > now) {
      return false; // Future
    }
    
    let age = now.getFullYear() - date.getFullYear();
    const mDiff = now.getMonth() - date.getMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < date.getDate())) {
      age--;
    }
    
    if (age < 13 || age > 120) {
      return false;
    }
    
    return true;
  };

  const isPersonalDateValid = validateDate(personalForm.dobDay, personalForm.dobMonth, personalForm.dobYear);
  const isP1DateValid = validateDate(compForm.p1.dobDay, compForm.p1.dobMonth, compForm.p1.dobYear);
  const isP2DateValid = validateDate(compForm.p2.dobDay, compForm.p2.dobMonth, compForm.p2.dobYear);

  const isPersonalValid = mode === 'personal' && personalForm.name && personalForm.question && isPersonalDateValid === true;
  const isCompValid = mode === 'compatibility' && compForm.p1.name && compForm.p2.name && isP1DateValid === true && isP2DateValid === true;
  const isValid = mode === 'personal' ? isPersonalValid : isCompValid;

  const getPersonalError = () => {
    if (isPersonalDateValid === false) return getDynamicInvalidDateMsg(currentTone);
    return '';
  };

  const getCompError = () => {
    if (isP1DateValid === false || isP2DateValid === false) return getDynamicInvalidDateMsg(currentTone);
    return '';
  };

  const displayError = errorMsg || (mode === 'personal' ? getPersonalError() : getCompError());

  // MOCK GENERATORS
  const generatePersonal = (tone) => {
    const responses = {
      english: {
        overall: "Planetary transits are in your favor. The coming period is highly positive.",
        career: "You may receive new responsibilities. Hard work will pay off.",
        love: "Sweetness in relationships will increase. Mutual understanding grows.",
        marriage: "Strong marriage prospects are forming. Jupiter's grace is present.",
        finance: "Financial status remains stable. Gains from investments are possible.",
        health: "Health remains good, but meditation is recommended.",
        luckyColor: "Golden Yellow",
        remedies: "Offer water to the Sun and donate yellow items on Thursday.",
        positive: "Self-confidence and decision-making ability.",
        watch: "Hasty decisions."
      },
      hindi_script: {
        overall: "ग्रहों का गोचर आपके पक्ष में है। आने वाला समय सकारात्मक है।",
        career: "नई जिम्मेदारियां मिल सकती हैं। मेहनत रंग लाएगी।",
        love: "रिश्तों में मधुरता आएगी। आपसी समझ बढ़ेगी।",
        marriage: "विवाह के प्रबल योग बन रहे हैं। गुरु की कृपा है।",
        finance: "आर्थिक स्थिति स्थिर रहेगी। निवेश से लाभ संभव है।",
        health: "स्वास्थ्य अच्छा रहेगा, लेकिन ध्यान आवश्यक है।",
        luckyColor: "सुनहरा पीला",
        remedies: "सूर्य को जल चढ़ाएं और गुरुवार को पीला दान करें।",
        positive: "आत्मविश्वास और निर्णय लेने की क्षमता।",
        watch: "जल्दबाजी में लिए गए फैसले।"
      },
      hinglish: {
        overall: "Planetary transits aapke favor mein hain. Aane wala time bahut positive rahega.",
        career: "Career mein nayi responsibilities mil sakti hain. Hard work pay off karega.",
        love: "Relationships mein sweetness aayegi. Mutual understanding badhegi.",
        marriage: "Shaadi ke strong chances ban rahe hain. Jupiter ki kripa hai.",
        finance: "Financial status stable rahega. Investments se gains possible hain.",
        health: "Health theek rahegi, but meditation zaroori hai.",
        luckyColor: "Golden Yellow (Sunehra Peela)",
        remedies: "Surya ko jal chadhayein aur Thursday ko yellow items donate karein.",
        positive: "Self-confidence aur right decisions.",
        watch: "Jaldbaazi mein decisions na lein."
      },
      punjabi: {
        overall: "Grah tuhade favor vich han. Aan wala time bahut vadiya hai.",
        career: "Career vich tarakki mil sakdi hai. Mehnat da fal milega.",
        love: "Pyar vich mithas vadhegi.",
        marriage: "Vyah de change yog ban rahe han.",
        finance: "Paise pakhon halat theek rahenge.",
        health: "Sehat theek rahegi, par dhyan rakho.",
        luckyColor: "Pila (Yellow)",
        remedies: "Suraj nu jal chadao.",
        positive: "Confidence vadiya rahega.",
        watch: "Jaldi vich faisle na lo."
      },
      bengali: {
        overall: "Groho apnar pokkhe ache. Ashonno shomoy khub bhalo.",
        career: "Career e notun dayitto pete paren.",
        love: "Bhalobashay modhurota barbe.",
        marriage: "Biyer bhalo jog ache.",
        finance: "Arthik obostha sthitishil thakbe.",
        health: "Shastho bhalo thakbe.",
        luckyColor: "Holud (Yellow)",
        remedies: "Shurjo ke jol din.",
        positive: "Atto-bisshash.",
        watch: "Tarahuro kore sidhhanto neben na."
      }
    };

    const data = responses[tone] || responses.english;
    return {
      type: 'personal',
      luckyNumber: 7,
      ...data
    };
  };

  const generateComp = (tone) => {
    const responses = {
      english: {
        comm: "Good exchange of ideas, Mercury's position is favorable.",
        emo: "Moon combination is excellent. Deep emotional understanding.",
        marriage: "Excellent alignment for a long-term marriage.",
        strengths: "Mutual respect and loyalty.",
        challenges: "Avoid ego clashes.",
        outlook: "A happy and prosperous shared future.",
        guidance: "Accept each other's flaws. Worship Shiva-Parvati."
      },
      hindi_script: {
        comm: "विचारों का अच्छा आदान-प्रदान, बुध की स्थिति अनुकूल।",
        emo: "चंद्रमा का मिलन शानदार है। गहरी समझ।",
        marriage: "दीर्घकालिक विवाह के लिए उत्कृष्ट योग।",
        strengths: "पारस्परिक सम्मान और वफादारी।",
        challenges: "अहंकार के टकराव से बचें।",
        outlook: "एक सुखद और समृद्ध साझा भविष्य।",
        guidance: "एक-दूसरे की कमियों को स्वीकार करें। शिव-पार्वती की पूजा करें।"
      },
      hinglish: {
        comm: "Ideas ka accha exchange hai, Mercury ki position favorable hai.",
        emo: "Moon combination excellent hai. Deep understanding rahegi.",
        marriage: "Long-term marriage ke liye excellent alignment hai.",
        strengths: "Mutual respect aur loyalty.",
        challenges: "Ego clashes se bachein.",
        outlook: "Ek happy aur prosperous shared future.",
        guidance: "Ek-doosre ke flaws accept karein. Shiva-Parvati ki pooja karein."
      },
      punjabi: {
        comm: "Vicharan da vadiya mel, Budh di sthiti theek hai.",
        emo: "Emotional understanding bahut vadiya hai.",
        marriage: "Pakke vyah layi vadiya yog han.",
        strengths: "Izzat te wafadari.",
        challenges: "Ahankar ton bacho.",
        outlook: "Khush-haal bhavikh.",
        guidance: "Ikk duje nu samjho."
      },
      bengali: {
        comm: "Bhabnar bhalo adan prodan.",
        emo: "Moner mil khub bhalo.",
        marriage: "Biyer jonno khub bhalo jog.",
        strengths: "Poroshporer proti shomman.",
        challenges: "Ojhotha jhogra eriye cholun.",
        outlook: "Shukhi bhabishyat.",
        guidance: "Eke oporke bujhte chesta korun."
      }
    };

    const data = responses[tone] || responses.english;
    return {
      type: 'compatibility',
      score: 82,
      guna: 28,
      ...data
    };
  };

  const handleGenerate = async () => {
    if (loading || !user || !isValid) return;
    setErrorMsg('');

    if (mode === 'personal') {
      if (!checkIsAstrology(personalForm.question)) {
        setErrorMsg(getDynamicNotAstrologyMsg(currentTone));
        return;
      }
    }

    const isFree = !user?.premium && (mode === 'personal' ? !user?.dailyQuestionUsed : !user?.dailyCompUsed);
    const hasEnoughCoins = (user?.coins || 0) >= 10;

    if (!user?.premium && !isFree && !hasEnoughCoins) {
      setShowLowCoinsModal(true);
      return;
    }

    setLoading(true);
    setResult(null);

    setTimeout(async () => {
      try {
        if (!user?.premium) {
          await executePanditAI(user.uid, isFree, mode);
        }
        
        const data = mode === 'personal' ? generatePersonal(currentTone) : generateComp(currentTone);
        setResult(data);
      } catch (error) {
        console.error("AI Error:", error);
        setErrorMsg("Error generating reading.");
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  const InputField = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-mystic-gold/50 transition-all placeholder:text-white/20"
      />
    </div>
  );

  const SelectorButton = ({ value, options, placeholder, title, onSelect }) => {
    const selectedOption = options.find(opt => (typeof opt === 'object' ? opt.value : opt) === value);
    const displayValue = selectedOption ? (typeof selectedOption === 'object' ? selectedOption.name : selectedOption) : placeholder;

    return (
      <button
        type="button"
        onClick={() => setPickerConfig({ options, title, value, onSelect })}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white text-sm transition-all hover:border-mystic-gold/50"
      >
        <span className={`truncate mr-1 ${value ? 'text-white' : 'text-white/40'}`}>
          {displayValue}
        </span>
        <span className="text-[10px] flex-shrink-0 text-mystic-gold">▼</span>
      </button>
    );
  };

  const PickerModal = () => {
    if (!pickerConfig) return null;

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="fixed inset-0" onClick={() => setPickerConfig(null)} />
        <div className="glass-card w-full max-w-sm rounded-[32px] border border-mystic-gold/30 flex flex-col max-h-[70vh] relative z-10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="p-6 text-center border-b border-white/5">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-mystic-gold">{pickerConfig.title}</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {pickerConfig.options.map((opt, i) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optName = typeof opt === 'object' ? opt.name : opt;
              const isSelected = pickerConfig.value === optValue;
              return (
                <div
                  key={i}
                  onClick={() => {
                    pickerConfig.onSelect(optValue);
                    setPickerConfig(null);
                  }}
                  className={`px-8 py-5 text-center transition-all cursor-pointer ${
                    isSelected ? 'bg-mystic-gold text-mystic-indigo font-black text-xl' : 'text-white/60 hover:text-white hover:bg-white/5 text-lg'
                  }`}
                >
                  {optName}
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-white/5 text-center">
             <button onClick={() => setPickerConfig(null)} className="py-2 text-[10px] font-black uppercase tracking-widest text-white/40">
               {isHindi ? 'रद्द करें' : 'Cancel'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDateSelectors = (formState, updateForm) => (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{t.dob}</label>
      <div className="grid grid-cols-3 gap-2">
        <SelectorButton 
          value={formState.dobDay} 
          options={days} 
          placeholder={t.day} 
          title="Select Day" 
          onSelect={(val) => updateForm({ dobDay: val })} 
        />
        <SelectorButton 
          value={formState.dobMonth} 
          options={months} 
          placeholder={t.month} 
          title="Select Month" 
          onSelect={(val) => updateForm({ dobMonth: val })} 
        />
        <SelectorButton 
          value={formState.dobYear} 
          options={years} 
          placeholder={t.year} 
          title="Select Year" 
          onSelect={(val) => updateForm({ dobYear: val })} 
        />
      </div>
    </div>
  );

  const renderTimeSelectors = (formState, updateForm) => (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{t.tob}</label>
      <div className="grid grid-cols-3 gap-2">
        <SelectorButton 
          value={formState.tobHour} 
          options={hours} 
          placeholder={t.hour} 
          title="Select Hour" 
          onSelect={(val) => updateForm({ tobHour: val })} 
        />
        <SelectorButton 
          value={formState.tobMinute} 
          options={minutes} 
          placeholder={t.min} 
          title="Select Minute" 
          onSelect={(val) => updateForm({ tobMinute: val })} 
        />
        <SelectorButton 
          value={formState.tobPeriod} 
          options={periods} 
          placeholder={t.period} 
          title="Select AM/PM" 
          onSelect={(val) => updateForm({ tobPeriod: val })} 
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen bg-[#020617]">
      <PickerModal />
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
              onClick={() => { setMode('personal'); setErrorMsg(''); }}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl ${
                mode === 'personal' ? 'bg-mystic-gold text-mystic-indigo' : 'text-white/40'
              }`}
            >
              🔮 {t.personalTab}
            </button>
            <button
              onClick={() => { setMode('compatibility'); setErrorMsg(''); }}
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
                <InputField label={t.name} value={personalForm.name} onChange={e => setPersonalForm({...personalForm, name: e.target.value})} placeholder="e.g. Rahul" />
                {renderDateSelectors(personalForm, (updates) => setPersonalForm(prev => ({ ...prev, ...updates })))}
                {renderTimeSelectors(personalForm, (updates) => setPersonalForm(prev => ({ ...prev, ...updates })))}
                <InputField label={t.pob} value={personalForm.pob} onChange={e => setPersonalForm({...personalForm, pob: e.target.value})} placeholder="e.g. New Delhi" />
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
                  <InputField label={t.name} value={compForm.p1.name} onChange={e => setCompForm({...compForm, p1: {...compForm.p1, name: e.target.value}})} placeholder="e.g. Rahul" />
                  {renderDateSelectors(compForm.p1, (updates) => setCompForm(prev => ({ ...prev, p1: { ...prev.p1, ...updates } })))}
                  {renderTimeSelectors(compForm.p1, (updates) => setCompForm(prev => ({ ...prev, p1: { ...prev.p1, ...updates } })))}
                  <InputField label={t.pob} value={compForm.p1.pob} onChange={e => setCompForm({...compForm, p1: {...compForm.p1, pob: e.target.value}})} placeholder="e.g. New Delhi" />
                </div>
                <div className="text-center text-2xl animate-pulse">💕</div>
                <div className="space-y-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                  <h3 className="text-xs font-black text-mystic-gold uppercase tracking-widest">{t.person2}</h3>
                  <InputField label={t.name} value={compForm.p2.name} onChange={e => setCompForm({...compForm, p2: {...compForm.p2, name: e.target.value}})} placeholder="e.g. Priya" />
                  {renderDateSelectors(compForm.p2, (updates) => setCompForm(prev => ({ ...prev, p2: { ...prev.p2, ...updates } })))}
                  {renderTimeSelectors(compForm.p2, (updates) => setCompForm(prev => ({ ...prev, p2: { ...prev.p2, ...updates } })))}
                  <InputField label={t.pob} value={compForm.p2.pob} onChange={e => setCompForm({...compForm, p2: {...compForm.p2, pob: e.target.value}})} placeholder="e.g. Mumbai" />
                </div>
              </div>
            )}
          </div>

          {displayError && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-center font-bold">
              {displayError}
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
            <Button fullWidth variant="gold" onClick={handleGenerate} disabled={!isValid} className="h-16 text-lg tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
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
