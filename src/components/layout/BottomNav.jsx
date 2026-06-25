import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/ask-pandit', label: 'Pandit', icon: '🔮' },
  { path: '/tarot', label: 'Tarot', icon: '🃏' },
  { path: '/fortune-wheel', label: 'Wheel', icon: '🎡' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

const BottomNav = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[72px] bg-[#09090b]/95 border-t border-white/10 z-[500] backdrop-blur-2xl flex items-center justify-around px-2 bottom-nav-safe-padding shadow-[0_-8px_32px_rgba(0,0,0,0.5)] select-none">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <span className={`text-2xl transition-transform duration-200 ${isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'opacity-50 grayscale'}`}>
              {item.icon}
            </span>
            <span className={`transition-all duration-200 ${isActive ? 'text-mystic-gold font-black scale-105' : 'text-white/40 font-bold'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
