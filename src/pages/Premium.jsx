import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { purchasePremium } from '../services/userService';
import Button from '../components/ui/Button';

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();

  const isHindi = currentLanguage === 'Hindi';

  // Translations
  const tp = {
    title: isHindi ? 'एस्ट्रोटैरो प्रीमियम' : 'AstroTarot Premium',
    subtitle: isHindi ? '"सितारों की पूरी शक्ति को अनलॉक करें और अपना भाग्य सुरक्षित करें।"' : '"Unlock the full power of the stars and secure your destiny."',
    bestValue: isHindi ? 'सर्वश्रेष्ठ मूल्य' : 'Best Value',
    perMonth: isHindi ? '/ 30 दिन' : '/ 30 Days',
    unlockButton: isHindi ? 'प्रीमियम ₹49 अनलॉक करें' : 'Unlock Premium ₹49',
    cancelAnytime: isHindi ? 'कभी भी रद्द करें • सुरक्षित भुगतान' : 'Cancel anytime • Secure payment',
    returnTemple: isHindi ? 'मंदिर वापस जाएं' : 'Return to Temple',
    congrats: isHindi ? "बधाई हो! अब आप एक प्रीमियम साधक हैं।" : "Congratulations! You are now a Premium Seeker.",
  };

  const benefits = [
    { 
      title: isHindi ? 'असीमित प्रश्न' : 'Unlimited Questions', 
      icon: '💬', 
      desc: isHindi ? 'पंडित जी से कभी भी, कुछ भी पूछें।' : 'Ask Pandit AI anything, anytime.' 
    },
    { 
      title: isHindi ? 'कोई सिक्का कटौती नहीं' : 'No Coin Deduction', 
      icon: '🪙', 
      desc: isHindi ? 'अपने सिक्के के संतुलन के बारे में कभी चिंता न करें।' : 'Never worry about your coin balance again.' 
    },
    { 
      title: isHindi ? 'प्रीमियम रिपोर्ट्स' : 'Premium Reports', 
      icon: '📊', 
      desc: isHindi ? 'अपने करियर और प्रेम जीवन के बारे में गहरी जानकारी।' : 'Deep insights into your career and love life.' 
    },
    { 
      title: isHindi ? 'विशेष भविष्यवाणियां' : 'Exclusive Predictions', 
      icon: '✨', 
      desc: isHindi ? 'उच्च सटीकता वाली वैदिक ऊर्जा रीडिंग।' : 'Higher accuracy Vedic energy readings.' 
    },
    { 
      title: isHindi ? 'प्राथमिकता सुविधाएँ' : 'Priority Features', 
      icon: '🚀', 
      desc: isHindi ? 'नए एआई टूल तक पहुंचने वाले पहले व्यक्ति बनें।' : 'Be the first to access new AI tools.' 
    },
  ];

  const handleUnlock = async () => {
    if (!user?.uid) return;
    try {
      await purchasePremium(user.uid);
      alert(tp.congrats);
      navigate('/');
    } catch (error) {
      console.error("Purchase Error:", error);
    }
  };

  return (
    <div className="flex flex-col w-full pb-20 animate-fade-in kundali-grid min-h-screen">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-mystic-gold to-amber-600 mx-auto flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(251,191,36,0.3)] border-2 border-white/20">
          <span className="text-white">👑</span>
        </div>
        <h1 className="text-4xl font-bold premium-gradient-text text-white">{tp.title}</h1>
        <p className="text-white/60 text-sm max-w-[280px] mx-auto">
          {tp.subtitle}
        </p>
      </div>

      {/* Benefits List */}
      <div className="px-6 space-y-4 mb-10">
        {benefits.map((b, i) => (
          <div key={i} className="glass-card p-5 rounded-3xl border border-white/5 flex items-center gap-5 transition-all hover:border-mystic-gold/30">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
              {b.icon}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{b.title}</h3>
              <p className="text-[10px] text-white/40 leading-tight mt-1">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing CTA */}
      <div className="px-6 space-y-6">
        <div className="glass-card p-6 rounded-[32px] border border-mystic-gold/20 text-center space-y-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mystic-gold to-transparent opacity-50" />
           
           <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.4em] text-mystic-gold font-bold">{tp.bestValue}</span>
              <div className="flex items-center justify-center gap-2">
                 <span className="text-white/40 line-through text-lg">₹99</span>
                 <span className="text-4xl font-black text-white">₹49</span>
                 <span className="text-white/40 text-sm">{tp.perMonth}</span>
              </div>
           </div>

           <Button 
            fullWidth 
            variant="gold" 
            onClick={handleUnlock}
            className="h-16 shadow-[0_10px_40px_rgba(251,191,36,0.2)]"
           >
             {tp.unlockButton}
           </Button>
           
           <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
             {tp.cancelAnytime}
           </p>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
        >
          {tp.returnTemple}
        </button>
      </div>
    </div>
  );
};

export default Premium;
