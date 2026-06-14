import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { logOut, linkAccount } from '../../services/authService';

const UserMenu = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setIsOpen(false);
    } catch (err) {
      console.error("Linking Error:", err.code, err);
      
      if (err.code === 'auth/credential-already-in-use') {
        setError("This account is already linked to another seeker.");
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError("Email already in use with another sign-in method.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Linking cancelled.");
      } else {
        setError("Linking failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isAnonymous = !user.email && (!user.providerData || user.providerData.length === 0);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex-shrink-0 w-10 h-10 rounded-full border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center hover:border-mystic-gold/50 transition-all active:scale-95 shadow-lg"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg">👤</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-3 w-64 glass border-white/10 rounded-3xl p-4 shadow-2xl z-50 animate-fade-in origin-top-left">
            <div className="px-3 py-4 border-b border-white/5 mb-2">
              <p className="text-white font-bold text-sm truncate">{user.displayName || 'Spiritual Seeker'}</p>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mt-1">
                {isAnonymous ? 'Guest Account' : (user.email || 'Permanent Soul')}
              </p>
              <p className="text-white/20 text-[8px] uppercase tracking-widest font-bold mt-2 truncate">
                ID: {user.uid}
              </p>
            </div>

            {isAnonymous && (
              <div className="p-3 bg-mystic-gold/5 border border-mystic-gold/20 rounded-2xl mb-4">
                <p className="text-mystic-gold text-[10px] font-black uppercase tracking-wider mb-2">Save Progress</p>
                <div className="flex gap-2">
                  <button 
                    disabled={loading}
                    onClick={() => handleLink('google')}
                    className="flex-1 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={loading}
                    onClick={() => handleLink('facebook')}
                    className="flex-1 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center hover:bg-[#166fe5] transition-colors disabled:opacity-50"
                  >
                    <img src="https://www.facebook.com/favicon.ico" alt="Facebook" className="w-4 h-4" />
                  </button>
                </div>
                {error && (
                  <p className="mt-3 text-[9px] text-red-400 font-bold uppercase leading-tight animate-fade-in">
                    ⚠️ {error}
                  </p>
                )}
              </div>
            )}

            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
