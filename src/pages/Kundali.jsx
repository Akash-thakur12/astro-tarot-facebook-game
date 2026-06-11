import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import { generateKundali } from '../services/astrologyService';
import Button from '../components/ui/Button';

const Kundali = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const isHindi = currentLanguage === 'Hindi';

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    birthHour: '',
    birthMinute: '',
    birthPeriod: '',
    pob: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [kundaliData, setKundaliData] = useState(null);
  const [activeTab, setActiveTab] = useState('chart');
  const [pickerConfig, setPickerConfig] = useState(null);

  // Constants for DOB Dropdowns
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

  // Constants for Time Dropdowns
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  // Translations
  const tk = {
    title: isHindi ? 'वैदिक कुंडली' : 'Vedic Kundali',
    subtitle: isHindi ? 'अपने जन्म विवरण दर्ज करें' : 'Enter your birth details',
    fullName: isHindi ? 'पूरा नाम' : 'Full Name',
    dob: isHindi ? 'जन्म तिथि' : 'Date of Birth',
    day: isHindi ? 'दिन चुनें' : 'Select Day',
    month: isHindi ? 'महीना चुनें' : 'Select Month',
    year: isHindi ? 'वर्ष चुनें' : 'Select Year',
    tob: isHindi ? 'जन्म का समय' : 'Time of Birth',
    hour: isHindi ? 'घंटा चुनें' : 'Select Hour',
    min: isHindi ? 'मिनट चुनें' : 'Select Minute',
    period: isHindi ? 'समय चुनें' : 'Select AM/PM',
    pob: isHindi ? 'जन्म स्थान' : 'Place of Birth',
    generate: isHindi ? 'भविष्यवाणियां प्राप्त करें' : 'Get Predictions',
    chartTab: isHindi ? 'कुंडली चार्ट' : 'Kundali Chart',
    analysisTab: isHindi ? 'भविष्य विश्लेषण' : 'Future Analysis',
    remediesTab: isHindi ? 'उपाय' : 'Remedies',
    career: isHindi ? 'करियर:' : 'Career:',
    love: isHindi ? 'प्रेम:' : 'Love:',
    health: isHindi ? 'स्वास्थ्य:' : 'Health:',
    finance: isHindi ? 'धन:' : 'Finance:',
    luckyColor: isHindi ? 'शुभ रंग' : 'Lucky Color',
    luckyNumber: isHindi ? 'शुभ अंक' : 'Lucky Number',
    back: isHindi ? 'वापस जाएं' : 'Go Back',
    csTitle: isHindi ? '🚧 असली कुंडली विश्लेषण जल्द आ रहा है' : '🚧 Real Kundli Analysis Coming Soon',
    csDesc: isHindi ? 'हमारे उन्नत ग्रहीय गणना इंजन को अपग्रेड किया जा रहा है। जल्द ही आपको विस्तृत लग्न, राशि, ग्रह स्थिति और दशा विश्लेषण मिलेगा।' : 'Our advanced planetary calculation engine is being upgraded. Soon you\'ll get detailed Lagna, Rashi, Planet Positions, Dasha Analysis and Personalized Predictions.',
    csNotify: isHindi ? 'मुझे जल्द सूचित करें' : 'Notify Me Soon'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setDropdownValue = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setPickerConfig(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormValid) {
      const data = await generateKundali(formData);
      setKundaliData(data);
      setIsSubmitted(true);
      setActiveTab('analysis'); // Default to analysis since chart is coming soon
    }
  };

  const isFormValid = 
    formData.fullName && 
    formData.dobDay && 
    formData.dobMonth && 
    formData.dobYear && 
    formData.birthHour && 
    formData.birthMinute && 
    formData.birthPeriod && 
    formData.pob;

  const SelectorButton = ({ name, value, options, placeholder, title, id }) => {
    const selectedOption = options.find(opt => (typeof opt === 'object' ? opt.value : opt) === value);
    const displayValue = selectedOption ? (typeof selectedOption === 'object' ? selectedOption.name : selectedOption) : placeholder;

    return (
      <button
        type="button"
        onClick={() => setPickerConfig({ id, name, options, title, value })}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm transition-all hover:border-mystic-gold/50"
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
        <div 
          className="fixed inset-0" 
          onClick={() => setPickerConfig(null)} 
        />
        
        <div className="glass-card w-full max-w-sm rounded-[32px] border border-mystic-gold/30 flex flex-col max-h-[70vh] relative z-10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="p-6 text-center border-b border-white/5">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-mystic-gold">
              {pickerConfig.title}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {pickerConfig.options.map((opt, i) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optName = typeof opt === 'object' ? opt.name : opt;
              const isSelected = pickerConfig.value === optValue;

              return (
                <div
                  key={i}
                  onClick={() => setDropdownValue(pickerConfig.name, optValue)}
                  className={`px-8 py-5 text-center transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-mystic-gold text-mystic-indigo font-black text-xl' 
                      : 'text-white/60 hover:text-white hover:bg-white/5 text-lg'
                  }`}
                >
                  {optName}
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-white/5 text-center">
             <button 
               onClick={() => setPickerConfig(null)}
               className="py-2 text-[10px] font-black uppercase tracking-widest text-white/40"
             >
               {isHindi ? 'रद्द करें' : 'Cancel'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const ComingSoonCard = () => (
    <div className="w-full space-y-6 text-center animate-fade-in">
      <div className="w-20 h-20 mx-auto rounded-full bg-mystic-gold/10 border border-mystic-gold/30 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(251,191,36,0.2)]">
        ✨
      </div>
      <div className="space-y-3">
        <h2 className="text-xl md:text-2xl font-black text-white px-2">
          {tk.csTitle}
        </h2>
        <p className="text-sm text-white/60 font-medium leading-relaxed max-w-sm mx-auto">
          {tk.csDesc}
        </p>
      </div>
      
      <div className="text-left bg-white/5 border border-white/10 rounded-3xl p-6 mx-auto w-full max-w-[280px] space-y-3">
        {[
          isHindi ? 'विस्तृत जन्म कुंडली' : 'Detailed Birth Chart',
          isHindi ? 'लग्न एवं राशि ' : 'Lagna & Rashi Detection',
          isHindi ? 'ग्रहीय स्थितियां' : 'Planetary Positions',
          isHindi ? 'दशा विश्लेषण' : 'Dasha Analysis',
          isHindi ? 'विवाह एवं करियर अंतर्दृष्टि' : 'Marriage & Career Insights'
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-mystic-gold text-sm">✓</span>
            <span className="text-white/90 text-xs font-bold uppercase tracking-tight">{feature}</span>
          </div>
        ))}
      </div>

      <Button variant="outline" className="mt-4 text-xs tracking-widest uppercase border-white/20 text-white/60 font-black h-12 px-8">
        {tk.csNotify}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen bg-deep-space overflow-visible">
      <PickerModal />
      
      {/* Header */}
      <div className="px-6 pt-16 pb-8 text-center space-y-3 relative z-10">
        <h1 className="text-4xl md:text-5xl font-black premium-gradient-text leading-[1.2] py-2">
          {tk.title}
        </h1>
        <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">
          {tk.subtitle}
        </p>
      </div>

      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="px-6 space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] border-white/5 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{tk.fullName}</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-mystic-gold/50 transition-all placeholder:text-white/20"
                placeholder="Rahul Kumar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{tk.dob}</label>
              <div className="grid grid-cols-3 gap-3">
                <SelectorButton id="day" name="dobDay" value={formData.dobDay} options={days} placeholder={isHindi ? 'दिन' : 'Day'} title={tk.day} />
                <SelectorButton id="month" name="dobMonth" value={formData.dobMonth} options={months} placeholder={isHindi ? 'महीना' : 'Month'} title={tk.month} />
                <SelectorButton id="year" name="dobYear" value={formData.dobYear} options={years} placeholder={isHindi ? 'वर्ष' : 'Year'} title={tk.year} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{tk.tob}</label>
              <div className="grid grid-cols-3 gap-3">
                <SelectorButton id="hour" name="birthHour" value={formData.birthHour} options={hours} placeholder={isHindi ? 'घंटा' : 'Hour'} title={tk.hour} />
                <SelectorButton id="min" name="birthMinute" value={formData.birthMinute} options={minutes} placeholder={isHindi ? 'मिनट' : 'Min'} title={tk.min} />
                <SelectorButton id="period" name="birthPeriod" value={formData.birthPeriod} options={periods} placeholder="AM/PM" title={tk.period} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{tk.pob}</label>
              <input
                type="text"
                name="pob"
                value={formData.pob}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-mystic-gold/50 transition-all placeholder:text-white/20"
                placeholder="New Delhi, India"
              />
            </div>
          </div>

          <Button 
            fullWidth 
            variant="gold" 
            type="submit"
            disabled={!isFormValid}
            className="h-16 shadow-[0_10px_40px_rgba(251,191,36,0.2)] font-black text-lg uppercase tracking-widest"
          >
            {tk.generate}
          </Button>

          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full text-xs font-bold text-white/20 uppercase tracking-widest hover:text-white transition-colors"
          >
            {tk.back}
          </button>
        </form>
      ) : (
        <div className="px-6 space-y-8 animate-fade-in">
          {/* Tabs */}
          <div className="flex glass-card p-1 rounded-2xl border-white/5 overflow-hidden">
            {['chart', 'analysis', 'remedies'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl ${
                  activeTab === tab ? 'bg-mystic-gold text-mystic-indigo' : 'text-white/40'
                }`}
              >
                {tab === 'chart' ? tk.chartTab : tab === 'analysis' ? tk.analysisTab : tk.remediesTab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="glass-card p-8 rounded-[2.5rem] border-white/10 min-h-[450px] flex flex-col items-center justify-center">
            {activeTab === 'chart' && (
              <ComingSoonCard />
            )}

            {activeTab === 'analysis' && kundaliData && (
              <div className="space-y-8 w-full animate-fade-in">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-white">{kundaliData.name}</h3>
                  <p className="text-[10px] text-mystic-gold uppercase tracking-[0.2em] mt-1 font-bold">
                    AI Energy Analysis
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-mystic-gold text-xs font-black uppercase tracking-widest flex items-center gap-2"><span>💼</span> {tk.career}</h4>
                    <p className="text-white/80 text-lg font-serif italic">{kundaliData.future[isHindi ? 'career_hi' : 'career_en']}</p>
                  </div>
                  <div className="h-px bg-white/5 w-full" />
                  <div className="space-y-2">
                    <h4 className="text-mystic-gold text-xs font-black uppercase tracking-widest flex items-center gap-2"><span>❤️</span> {tk.love}</h4>
                    <p className="text-white/80 text-lg font-serif italic">{kundaliData.future[isHindi ? 'love_hi' : 'love_en']}</p>
                  </div>
                  <div className="h-px bg-white/5 w-full" />
                  <div className="space-y-2">
                    <h4 className="text-mystic-gold text-xs font-black uppercase tracking-widest flex items-center gap-2"><span>🌿</span> {tk.health}</h4>
                    <p className="text-white/80 text-lg font-serif italic">{kundaliData.future[isHindi ? 'health_hi' : 'health_en']}</p>
                  </div>
                  <div className="h-px bg-white/5 w-full" />
                  <div className="space-y-2">
                    <h4 className="text-mystic-gold text-xs font-black uppercase tracking-widest flex items-center gap-2"><span>💰</span> {tk.finance}</h4>
                    <p className="text-white/80 text-lg font-serif italic">{kundaliData.future[isHindi ? 'finance_hi' : 'finance_en']}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'remedies' && kundaliData && (
              <div className="space-y-6 w-full animate-fade-in">
                {/* Lucky Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="glass-card p-5 rounded-3xl border-white/5 text-center flex flex-col items-center justify-center space-y-2">
                     <span className="text-2xl drop-shadow-md">🎨</span>
                     <h4 className="text-[10px] text-white/40 uppercase tracking-widest font-black">{tk.luckyColor}</h4>
                     <p className="text-mystic-gold font-bold text-sm">{isHindi ? kundaliData.luckyColor.hi : kundaliData.luckyColor.en}</p>
                  </div>
                  <div className="glass-card p-5 rounded-3xl border-white/5 text-center flex flex-col items-center justify-center space-y-2">
                     <span className="text-2xl drop-shadow-md">🎲</span>
                     <h4 className="text-[10px] text-white/40 uppercase tracking-widest font-black">{tk.luckyNumber}</h4>
                     <p className="text-mystic-gold font-bold text-2xl leading-none">{kundaliData.luckyNumber}</p>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full mb-6" />

                {/* Remedies List */}
                {kundaliData.remedies.map((remedy, i) => (
                  <div key={i} className="flex items-center gap-5 p-5 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-mystic-gold/10 flex items-center justify-center text-mystic-gold text-xl font-black shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-white font-bold text-sm leading-snug">{isHindi ? remedy.hi : remedy.en}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button 
            fullWidth 
            variant="outline" 
            onClick={() => setIsSubmitted(false)}
            className="h-14 border-white/10 text-white/60 font-black uppercase tracking-widest"
          >
            {tk.back}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Kundali;
