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
    <div className="w-full space-y-4">
      {isAnonymous && (
        <div className="glass-card p-6 rounded-[2.5rem] border border-mystic-gold/20 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-mystic-gold/5 blur-2xl rounded-full pointer-events-none" />
          <h3 className="text-mystic-gold font-black text-[10px] uppercase tracking-[0.2em] text-center">
            {isHindi ? 'प्रगति सहेजें' : 'Save Progress'}
          </h3>
          <Button 
            fullWidth 
            variant="outline"
            disabled={loading}
            onClick={() => handleLink('facebook')}
            className="h-14 !bg-[#1877F2] border-none text-white font-bold text-sm rounded-2xl shadow-lg hover:!bg-[#166fe5] gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="FB" className="w-5 h-5 invert brightness-200" />
            {isHindi ? 'फेसबुक से जुड़ें' : 'Connect Facebook'}
          </Button>
          {error && (
            <p className="text-[10px] text-red-400 font-bold uppercase text-center animate-fade-in">
              ⚠️ {error}
            </p>
          )}
        </div>
      )}
      
      <button 
        onClick={handleLogout}
        className="w-full h-14 rounded-2xl border border-white/5 text-white/20 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-[0.3em]"
      >
        {isHindi ? 'साइन आउट' : 'Sign Out'}
      </button>
    </div>
  );
};

export default UserMenu;
