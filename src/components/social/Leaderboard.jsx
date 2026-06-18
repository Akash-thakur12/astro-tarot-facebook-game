import React, { useState, useEffect } from 'react';
import { getTopPlayers } from '../../services/fbLeaderboard';

const Leaderboard = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('XP_LEADERBOARD');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const data = await getTopPlayers(activeTab);
      setPlayers(data);
      setLoading(false);
    };
    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-sm rounded-[2rem] border border-mystic-gold/30 flex flex-col max-h-[80vh] relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-black text-mystic-gold uppercase tracking-widest">Leaderboards</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>
        <div className="flex bg-white/5 border-b border-white/10">
          {[
            { id: 'XP_LEADERBOARD', icon: '⭐', label: 'XP' },
            { id: 'COIN_LEADERBOARD', icon: '💰', label: 'Coins' },
            { id: 'STREAK_LEADERBOARD', icon: '🔥', label: 'Streak' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-mystic-gold text-black' : 'text-white/40 hover:bg-white/5'}`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-white/50 animate-pulse font-bold uppercase tracking-widest">Loading Stars...</div>
          ) : players.length > 0 ? (
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-8 text-center font-black text-mystic-gold text-lg">#{p.rank}</div>
                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center border border-white/20">
                    {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <div className="flex-1 text-sm font-bold text-white/90 truncate">{p.name}</div>
                  <div className="font-black text-mystic-gold text-lg">{p.score}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-white/50 text-sm font-bold uppercase tracking-widest">No players found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
