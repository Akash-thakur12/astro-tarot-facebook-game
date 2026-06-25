import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

const Layout = ({ children }) => {
  const location = useLocation();
  const [stars] = useState(() => 
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 2}px`,
      duration: `${4 + Math.random() * 6}s`,
      delay: `${Math.random() * 5}s`,
    }))
  );

  const visibleRoutes = ['/', '/ask-pandit', '/tarot', '/fortune-wheel', '/profile'];
  const isVisible = visibleRoutes.includes(location.pathname);

  return (
    <div className={`min-h-screen relative text-white bg-[#020617] flex flex-col font-sans ${isVisible ? 'has-bottom-nav' : ''}`}>
      {/* Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="stars-container absolute inset-0" />
        {stars.map((star) => (
          <div
            key={star.id}
            className="star absolute"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              '--duration': star.duration,
              animationDelay: star.delay,
            }}
          />
        ))}
        
        {/* Subtle Cosmic Glows */}
        <div className="absolute top-0 right-0 w-[80%] h-[60%] bg-indigo-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[80%] h-[60%] bg-purple-900/10 blur-[150px] rounded-full" />
      </div>

      {/* Main Content Area */}
      <main className={`relative z-10 w-full max-w-md mx-auto min-h-screen flex flex-col ${isVisible ? 'pb-[72px]' : ''}`}>
        {children}
      </main>
      {isVisible && <BottomNav />}
    </div>
  );
};

export default Layout;
