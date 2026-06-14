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
  const [isExpanded, setIsExpanded] = useState(false);
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
      setIsExpanded(false);
    } catch (err) {
      console.error("Linking Error:", err.code, err);
      if (err.code === 'auth/credential-already-in-use') {
        setError("This account is already linked.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Cancelled.");
      } else {
        setError("Failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full">
      {/* Header Row Content - This is rendered inside the header in Home.jsx */}
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex-shrink-0 w-10 h-10 rounded-full border transition-all active:scale-95 shadow-lg overflow-hidden flex items-center justify-center
            ${isExpanded ? 'border-mystic-gold bg-mystic-gold/10' : 'border-white/10 bg-white/5 hover:border-mystic-gold/50'}
          `}
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">👤</span>
          )}
        </button>
        
        <div className="flex flex-col min-w-0">
          <span className="text-white font-bold text-sm tracking-wide truncate">
            {isAnonymous ? (isHindi ? 'अतिथि खाता' : 'Guest Account') : (user.displayName || 'Seeker')}
          </span>
        </div>
      </div>

      {/* Expandable Account Card */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 rounded-[2rem] bg-white/5 border border-mystic-gold/20 shadow-xl space-y-5 relative overflow-hidden mt-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-mystic-gold/5 blur-3xl rounded-full pointer-events-none" />
          
          <div className="space-y-1">
            <h3 className="text-white font-black text-base uppercase tracking-tight">
              {isAnonymous ? (isHindi ? 'अतिथि' : 'Guest') : (user.displayName || 'Seeker')}
            </h3>
            <p className="text-white/40 text-[11px] font-medium leading-relaxed">
              {isAnonymous 
                ? (isHindi ? 'आपकी प्रगति स्थानीय रूप से सहेजी गई है। स्थायी रूप से सहेजने के लिए फेसबुक कनेक्ट करें।' : 'Your progress is saved locally. Connect Facebook to save permanently.')
                : (user.email || (isHindi ? 'स्थायी खाता' : 'Permanent Account'))
              }
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {isAnonymous && (
              <Button 
                fullWidth 
                variant="outline"
                disabled={loading}
                onClick={() => handleLink('facebook')}
                className="h-12 !bg-[#1877F2] border-none text-white font-bold text-sm rounded-2xl shadow-lg hover:!bg-[#166fe5]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="FB" className="w-4 h-4 invert brightness-200" />
                {isHindi ? 'फेसबुक से जुड़ें' : 'Connect Facebook'}
              </Button>
            )}
            
            <button 
              onClick={handleLogout}
              className="w-full h-12 rounded-2xl border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/5 transition-all text-xs font-black uppercase tracking-[0.2em]"
            >
              {isHindi ? 'साइन आउट' : 'Sign Out'}
            </button>
          </div>

          {error && (
            <p className="text-[10px] text-red-400 font-bold uppercase text-center animate-fade-in">
              ⚠️ {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMenu;
