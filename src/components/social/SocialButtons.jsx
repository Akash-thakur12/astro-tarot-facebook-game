import React, { useState } from 'react';
import { shareTarotResult, chooseFriendsContext } from '../../services/fbSocial';
import { useAuth } from '../../context/useAuth';

export const ShareDestinyButton = ({ cardName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { getToken, refreshUser } = useAuth();

  const handleShare = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
       const res = await shareTarotResult(cardName);
       if (res) {
         try {
           const token = await getToken();
           await fetch('/api/rewards/viral', {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
             body: JSON.stringify({ action: 'share' })
           });
           await refreshUser();
         } catch(e) { console.error("Reward sync failed", e); }
         
         setSuccess(true);
         setTimeout(() => setSuccess(false), 3000);
       }
    } catch(err) {
       setError(err.message || 'An error occurred.');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full mt-4">
      <button 
        onClick={handleShare}
        disabled={loading}
        className="w-full py-3 bg-[#1877F2] rounded-2xl text-white font-bold tracking-wider shadow-[0_0_15px_rgba(24,119,242,0.4)] hover:bg-[#166FE5] transition-all flex justify-center items-center gap-2 active:scale-95"
      >
        {loading ? 'Loading...' : success ? '✅ Shared!' : '🔮 Share Your Destiny'}
      </button>
      {error && <span className="text-xs text-red-400 mt-2 font-bold uppercase">{error}</span>}
    </div>
  );
};

export const PlayWithFriendsButton = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getToken, refreshUser } = useAuth();

  const handlePlay = async () => {
    setLoading(true);
    setError(null);
    try {
       const res = await chooseFriendsContext();
       if (res) {
         try {
           const token = await getToken();
           await fetch('/api/rewards/viral', {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
             body: JSON.stringify({ action: 'invite' })
           });
           await refreshUser();
         } catch(e) { console.error("Invite reward sync failed", e); }
       }
    } catch(err) {
       setError(err.message || 'An error occurred.');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <button 
        onClick={handlePlay}
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white font-black tracking-widest shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 uppercase text-sm"
      >
        {loading ? 'Opening...' : '👥 Play With Friends'}
      </button>
      {error && <span className="text-xs text-red-400 mt-2 font-bold uppercase">{error}</span>}
    </div>
  );
};
