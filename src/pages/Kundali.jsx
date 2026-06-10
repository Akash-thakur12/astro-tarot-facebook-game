import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const Kundali = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-20">
      <h1 className="text-4xl font-bold text-mystic-gold">Vedic Kundali</h1>
      <div className="w-64 h-64 bg-mystic-purple/20 border-2 border-purple-400/50 rounded-full flex items-center justify-center animate-spin-slow">
        <span className="text-6xl">☸️</span>
      </div>
      <p className="text-purple-200 text-center">Calculating planetary positions for your birth chart...</p>
      <Button variant="outline" onClick={() => navigate('/')}>Back Home</Button>
    </div>
  );
};

export default Kundali;
