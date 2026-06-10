import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { purchasePremium } from '../services/userService';
import Button from '../components/ui/Button';

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const benefits = [
    { title: 'Unlimited Questions', icon: '💬', desc: 'Ask Pandit AI anything, anytime.' },
    { title: 'No Coin Deduction', icon: '🪙', desc: 'Never worry about your coin balance again.' },
    { title: 'Premium Reports', icon: '📊', desc: 'Deep insights into your career and love life.' },
    { title: 'Exclusive Predictions', icon: '✨', desc: 'Higher accuracy Vedic energy readings.' },
    { title: 'Priority Features', icon: '🚀', desc: 'Be the first to access new AI tools.' },
  ];

  const handleUnlock = async () => {
    try {
      await purchasePremium(user.uid);
      alert("Congratulations! You are now a Premium Seeker.");
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
          👑
        </div>
        <h1 className="text-4xl font-bold premium-gradient-text">AstroTarot Premium</h1>
        <p className="text-white/60 text-sm max-w-[280px] mx-auto">
          "Unlock the full power of the stars and secure your destiny."
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
              <span className="text-[10px] uppercase tracking-[0.4em] text-mystic-gold font-bold">Best Value</span>
              <div className="flex items-center justify-center gap-2">
                 <span className="text-white/40 line-through text-lg">₹99</span>
                 <span className="text-4xl font-black text-white">₹29</span>
                 <span className="text-white/40 text-sm">/ month</span>
              </div>
           </div>

           <Button 
            fullWidth 
            variant="gold" 
            onClick={handleUnlock}
            className="h-16 shadow-[0_10px_40px_rgba(251,191,36,0.2)]"
           >
             Unlock Premium ₹29
           </Button>
           
           <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
             Cancel anytime • Secure payment
           </p>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
        >
          Return to Temple
        </button>
      </div>
    </div>
  );
};

export default Premium;
