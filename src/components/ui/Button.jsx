import { playButtonSound } from '../../services/audioService';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  fullWidth = false,
  loading = false,
  disabled = false,
  ...props 
}) => {
  const baseStyles = 'px-8 py-5 rounded-2xl font-bold transition-all duration-500 transform active:scale-[0.98] flex items-center justify-center gap-4 text-lg tracking-wide group relative overflow-hidden';
  
  const variants = {
    primary: 'glass text-white border border-white/10 hover:border-white/30 hover:bg-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]',
    gold: 'bg-gradient-to-br from-mystic-gold via-yellow-400 to-amber-600 text-mystic-indigo shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:scale-[1.02]',
    outline: 'bg-transparent border border-white/20 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/5'
  };

  const widthStyle = fullWidth ? 'w-full' : '';
  const isDisabled = disabled || loading;

  const handleClick = (e) => {
    if (isDisabled) return;
    playButtonSound();
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
      {...props}
    >
      {/* Shine effect on hover */}
      {!isDisabled && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
      )}
      
      {loading ? (
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

export default Button;
