import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import Button from '../components/ui/Button';
import { initializePayments, purchasePremium, restorePurchases } from '../services/fbPayments';
import { isPaymentsSupported } from '../services/fbinstant';

const Premium = () => {
  const navigate = useNavigate();
  const { user, refreshUser, getToken } = useAuth();
  const { currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const t = {
    English: {
      title: "Divine Seeker Premium",
      subtitle: "Unlock your full spiritual potential",
      features: [
        "Unlimited Pandit AI Consultations",
        "Unlimited Daily Tarot Readings",
        "Exclusive Fortune Wheel Rewards",
        "Ad-Free Experience",
        "Priority Spiritual Guidance"
      ],
      price: "₹99",
      duration: "per month",
      upgradeBtn: "Upgrade to Seeker Status",
      processing: "Opening Sacred Gateway...",
      success: "Blessed! You are now a Divine Seeker.",
      returnTemple: "Back to Temple",
      error: "Gateway interrupted. Please try again."
    },
    Hindi: {
      title: "डिवाइन सीकर प्रीमियम",
      subtitle: "अपनी पूरी आध्यात्मिक क्षमता को अनलॉक करें",
      features: [
        "असीमित पंडित एआई परामर्श",
        "असीमित दैनिक टैरो रीडिंग",
        "विशेष भाग्य चक्र पुरस्कार",
        "विज्ञापन-मुक्त अनुभव",
        "प्राथमिक आध्यात्मिक मार्गदर्शन"
      ],
      price: "₹99",
      duration: "प्रति माह",
      upgradeBtn: "सीकर स्टेटस में अपग्रेड करें",
      processing: "पवित्र द्वार खुल रहा है...",
      success: "धन्य हो! अब आप एक डिवाइन सीकर हैं।",
      returnTemple: "मंदिर वापस जाएं",
      error: "द्वार बाधित हुआ। कृपया पुनः प्रयास करें।"
    }
  };

  const tp = t[currentLanguage] || t.English;

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isPaymentsSupported()) {
        console.log("Facebook payments not supported. Redirecting to Razorpay checkout.");
        const loadScript = () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };
        const scriptLoaded = await loadScript();
        if (!scriptLoaded) {
          throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
        }

        const idToken = await getToken();
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (!orderRes.ok) {
          const errData = await orderRes.json();
          throw new Error(errData.error || "Failed to create order");
        }
        const orderData = await orderRes.json();

        return new Promise((resolve, reject) => {
          const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "AstroTarot Premium",
            description: "Divine Seeker Premium Status",
            order_id: orderData.id,
            prefill: {
              name: user?.displayName || '',
              email: user?.email || ''
            },
            theme: {
              color: "#fbbf24"
            },
            handler: async function (response) {
              try {
                setLoading(true);
                const verifyRes = await fetch('/api/payments/verify-purchase', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    provider: 'razorpay',
                    payload: response
                  })
                });
                if (!verifyRes.ok) {
                  const verifyErr = await verifyRes.json();
                  throw new Error(verifyErr.error || "Payment verification failed");
                }
                const verifyResult = await verifyRes.json();
                if (verifyResult && verifyResult.success) {
                  setSuccess(true);
                  await refreshUser();
                  resolve(true);
                } else {
                  throw new Error("Verification failed on server");
                }
              } catch (verifyError) {
                setLoading(false);
                setError(verifyError.message);
                reject(verifyError);
              }
            },
            modal: {
              ondismiss: function () {
                setLoading(false);
                setError("Payment was cancelled by user.");
                reject(new Error("Payment was cancelled by user."));
              }
            }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        });
      }

      await initializePayments();
      const verifyResult = await purchasePremium(getToken);

      if (verifyResult && verifyResult.success) {
        setSuccess(true);
        await refreshUser();
      } else {
        throw new Error("Verification failed on server");
      }
    } catch (err) {
      console.error("Upgrade Flow Error:", err);
      setError(err.message || "Upgrade failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setError(null);

    try {
      await initializePayments();
      const verifyResult = await restorePurchases(getToken);

      if (verifyResult && verifyResult.success) {
        setSuccess(true);
        await refreshUser();
      } else {
        setError("No active Premium purchase found to restore.");
      }
    } catch (err) {
      console.error("Restore Flow Error:", err);
      setError(err.message || "Failed to restore purchase.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-24 h-24 bg-mystic-gold rounded-full flex items-center justify-center text-5xl mb-8 animate-bounce">
          ✨
        </div>
        <h1 className="text-4xl font-black text-white mb-4">{tp.success}</h1>
        <Button onClick={() => navigate('/')} variant="gold" className="mt-8 px-12">
          {tp.returnTemple}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6 pb-20">
      <div className="max-w-md mx-auto pt-12 text-center">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          ←
        </button>

        <div className="inline-block px-4 py-1.5 rounded-full bg-mystic-gold/10 border border-mystic-gold/20 text-mystic-gold text-[10px] font-black uppercase tracking-[0.2em] mb-6 animate-pulse">
          Limited Time Offer
        </div>

        <h1 className="text-4xl font-black premium-gradient-text mb-2 tracking-tight">
          {tp.title}
        </h1>
        <p className="text-white/40 text-sm mb-12 uppercase tracking-widest font-medium">
          {tp.subtitle}
        </p>

        {/* Pricing Card */}
        <div className="glass border-mystic-gold/20 rounded-[2.5rem] p-8 relative overflow-hidden group mb-10 shadow-[0_0_50px_rgba(251,191,36,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-mystic-gold/5 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="mb-10">
            <div className="text-5xl font-black text-white mb-1">{tp.price}</div>
            <div className="text-white/40 text-xs uppercase tracking-widest font-bold">{tp.duration}</div>
          </div>

          <div className="space-y-6 mb-12">
            {tp.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-4 text-left group/item">
                <div className="w-6 h-6 rounded-full bg-mystic-gold/10 flex items-center justify-center text-mystic-gold text-[10px] group-hover/item:scale-110 transition-transform">
                  ✓
                </div>
                <span className="text-white/70 text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <Button 
            fullWidth 
            variant="gold" 
            onClick={handleUpgrade}
            loading={loading}
            className="h-16 rounded-2xl font-black text-sm tracking-widest uppercase shadow-[0_10px_30px_rgba(251,191,36,0.2)]"
          >
            {loading ? tp.processing : tp.upgradeBtn}
          </Button>

          <button
            onClick={handleRestore}
            disabled={loading}
            className="mt-6 text-xs font-black text-mystic-gold hover:text-white uppercase tracking-widest transition-colors block w-full text-center"
          >
            {currentLanguage === 'Hindi' ? 'खरीद पुनर्स्थापित करें' : 'Restore Purchase'}
          </button>

          {error && (
            <div className="mt-6 text-red-400 text-xs font-bold animate-fade-in">
               ⚠️ {error}
            </div>
          )}
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
