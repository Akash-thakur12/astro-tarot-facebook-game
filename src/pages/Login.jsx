import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithGoogle, signInWithFacebook, signInAnonymous } from '../services/authService';
import { useAuth } from '../context/useAuth';
import Button from '../components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If already logged in, redirect away
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async (provider) => {
    setLoading(true);
    setError(null);
    try {
      if (provider === 'google') await signInWithGoogle();
      else if (provider === 'facebook') await signInWithFacebook();
      else await signInAnonymous();
      
      // Navigation is handled by the useEffect once user state is populated
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass border-white/10 rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
        <div className="mb-10">
          <div className="text-5xl mb-6">🔮</div>
          <h1 className="text-3xl font-black premium-gradient-text mb-2 tracking-tight">AstroTarot</h1>
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold">Your Cosmic Journey Awaits</p>
        </div>

        <div className="space-y-4">
          <Button 
            fullWidth 
            onClick={() => handleLogin('google')}
            disabled={loading}
            className="h-14 bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </Button>

          <Button 
            fullWidth 
            onClick={() => handleLogin('facebook')}
            disabled={loading}
            className="h-14 bg-[#1877F2] text-white hover:bg-[#166fe5] flex items-center justify-center gap-3"
          >
            <img src="https://www.facebook.com/favicon.ico" alt="Facebook" className="w-5 h-5" />
            Continue with Facebook
          </Button>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Button 
            fullWidth 
            variant="outline"
            onClick={() => handleLogin('anonymous')}
            disabled={loading}
            className="h-14"
          >
            Continue as Guest
          </Button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold animate-fade-in">
            {error}
          </div>
        )}

        <p className="mt-10 text-[9px] text-white/20 uppercase tracking-[0.2em] font-bold leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
