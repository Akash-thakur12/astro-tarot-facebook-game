import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/useLanguage';
import Button from '../components/ui/Button';

const Kundali = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const isHindi = currentLanguage === 'Hindi';

  const tk = {
    csTitle: isHindi ? '🚧 असली कुंडली विश्लेषण जल्द आ रहा है' : '🚧 Real Kundli Analysis Coming Soon',
    csDesc: isHindi ? 'हमारे उन्नत ग्रहीय गणना इंजन को विकसित किया जा रहा है। जल्द ही आपको मिलेगा:' : 'Our advanced planetary calculation engine is under development.\nSoon you\'ll get:',
    f1: isHindi ? 'लग्न एवं राशि' : 'Lagna & Rashi',
    f2: isHindi ? 'ग्रहीय स्थितियां' : 'Planet Positions',
    f3: isHindi ? 'दशा विश्लेषण' : 'Dasha Analysis',
    f4: isHindi ? 'विवाह अंतर्दृष्टि' : 'Marriage Insights',
    f5: isHindi ? 'करियर अंतर्दृष्टि' : 'Career Insights',
    back: isHindi ? 'होम पर वापस जाएं' : 'Back to Home'
  };

  return (
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen bg-deep-space overflow-visible items-center justify-center px-6">
      <div className="w-full space-y-6 text-center animate-fade-in glass-card p-8 rounded-[2.5rem] border-white/10 mt-10">
        <div className="w-20 h-20 mx-auto rounded-full bg-mystic-gold/10 border border-mystic-gold/30 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(251,191,36,0.2)]">
          ✨
        </div>
        <div className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black text-white px-2">
            {tk.csTitle}
          </h2>
          <p className="text-sm text-white/60 font-medium leading-relaxed max-w-sm mx-auto whitespace-pre-line">
            {tk.csDesc}
          </p>
        </div>
        
        <div className="text-left bg-white/5 border border-white/10 rounded-3xl p-6 mx-auto w-full max-w-[280px] space-y-3">
          {[tk.f1, tk.f2, tk.f3, tk.f4, tk.f5].map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-mystic-gold text-sm">✓</span>
              <span className="text-white/90 text-xs font-bold uppercase tracking-tight">{feature}</span>
            </div>
          ))}
        </div>

        <Button 
          fullWidth 
          variant="gold" 
          onClick={() => navigate('/')}
          className="mt-6 h-14 rounded-2xl font-black uppercase tracking-widest"
        >
          {tk.back}
        </Button>
      </div>
    </div>
  );
};

export default Kundali;
