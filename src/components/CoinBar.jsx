import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';

const CoinBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="sticky top-0 z-[100] w-full max-w-md mx-auto px-4 py-3 flex justify-between items-center bg-[#020617]/40 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-2.5">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative w-9 h-9 rounded-full bg-mystic-indigo flex items-center justify-center text-lg border border-white/10">
            👤
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-white/90 leading-none">Seeker</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-orange-500 text-[10px]">🔥</span>
            <span className="text-[10px] font-bold text-orange-400/90 tracking-tight">{user.streak} DAY STREAK</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="h-9 px-3.5 glass-card rounded-full flex items-center gap-2 border-white/10 glow-gold">
          <span className="text-sm">🪙</span>
          <span className="text-sm font-black text-mystic-gold tracking-tighter">
            {user.coins?.toLocaleString()}
          </span>
        </div>
        
        {user.premium ? (
          <button onClick={() => navigate('/premium')} className="w-9 h-9 bg-gradient-to-br from-mystic-gold to-amber-600 rounded-full flex items-center justify-center text-lg shadow-lg border border-white/20 animate-glow">
            💎
          </button>
        ) : (
          <button onClick={() => navigate('/premium')} className="w-9 h-9 glass-card rounded-full flex items-center justify-center text-lg border-white/10 text-white/40 hover:text-mystic-gold transition-all">
            👑
          </button>
        )}
      </div>
    </div>
  );
};

export default CoinBar;
