import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';
import { logOut, linkAccount } from '../../services/authService';
import Button from '../ui/Button';

const UserMenu = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isHindi = currentLanguage === 'Hindi';
  const isAnonymous = !user?.email && (!user?.providerData || user?.providerData.length === 0);

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  const handleLink = async (provider) => {
    setLoading(true);
    setError(null);
    try {
      await linkAccount(provider);
      await refreshUser();
    } catch (err) {
      console.error("Linking Error:", err.code, err);
      if (err.code === 'auth/credential-already-in-use') {
        setError(isHindi ? "यह खाता पहले से ही लिंक है।" : "This account is already linked.");
      } else {
        setError(isHindi ? "लिंक करने में विफल।" : "Failed to link.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full">
      <div className="glass-card p-4 rounded-[2rem] border border-mystic-gold/15 shadow-2xl relative overflow-hidden">
        {/* Subtle Glow */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-mystic-gold/10 blur-2xl rounded-full pointer-events-none" />
        
        <div className="space-y-3 relative z-10">
          {isAnonymous && (
            <div className="space-y-3">
              <p className="text-white/50 text-[11px] text-center font-medium leading-relaxed px-4">
                {isHindi ? 'अपनी प्रगति को स्थायी रूप से सहेजने के लिए अपना खाता कनेक्ट करें।' : 'Connect your account to save progress permanently.'}
              </p>
              
              <Button 
                fullWidth 
                variant="outline"
                disabled={loading}
                onClick={() => handleLink('facebook')}
                className="h-11 !bg-[#1877F2] border-none text-white font-semibold text-sm rounded-xl shadow-[0_8px_25px_rgba(24,119,242,0.35)] hover:!bg-[#166fe5] hover:scale-[1.02] transition-all duration-300 gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="FB" className="w-4 h-4 invert brightness-200" />
                {isHindi ? 'फेसबुक से जुड़ें' : 'Connect Facebook'}
              </Button>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="w-full h-11 rounded-xl border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/5 transition-all duration-300 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center"
          >
            {isHindi ? 'साइन आउट' : 'Sign Out'}
          </button>

          {error && (
            <p className="text-[10px] text-red-400 font-bold uppercase text-center animate-fade-in pt-1">
              ⚠️ {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMenu;
