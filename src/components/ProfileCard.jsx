import React from 'react';
import Button from './ui/Button';

const ProfileCard = ({ profile, facts, onEdit, isHindi }) => {
  // Safe helper to calculate age
  const calculateAge = (dobString) => {
    if (!dobString) return 'Unknown';
    try {
      const today = new Date();
      const birthDate = new Date(dobString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return 'Unknown';
    }
  };

  // Safe helper to retrieve fact reliability
  const getReliabilityDisplay = (fact) => {
    if (!fact || fact.reliability === undefined) {
      if (fact && fact.confidence !== undefined) {
        return `${Math.round((fact.confidence / 5) * 100)}%`;
      }
      return '0%';
    }
    return `${fact.reliability}%`;
  };

  const age = calculateAge(profile.dob);

  // Deterministic Vedic calculations
  const getLuckyColor = (name) => {
    const colors = ["Ruby Red", "Royal Gold", "Deep Indigo", "Emerald Green", "Saffron Orange", "Sandalwood Yellow", "Ocean Blue"];
    const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getLuckyNumber = (dobString) => {
    if (!dobString) return 7;
    const digits = dobString.replace(/[^0-9]/g, '').split('').map(Number);
    const sum = digits.reduce((acc, d) => acc + d, 0);
    return (sum % 9) || 9;
  };

  const getCurrentDasha = (dobString) => {
    const dashas = ["Surya (Sun) Dasha", "Chandra (Moon) Dasha", "Mangal (Mars) Dasha", "Rahu Dasha", "Guru (Jupiter) Dasha", "Shani (Saturn) Dasha", "Budh (Mercury) Dasha"];
    if (!dobString) return "Rahu Dasha";
    const year = new Date(dobString).getFullYear() || 1990;
    return dashas[year % dashas.length];
  };

  const luckyColor = getLuckyColor(profile.name);
  const luckyNumber = getLuckyNumber(profile.dob);
  const currentDasha = getCurrentDasha(profile.dob);

  return (
    <div className="relative z-10 w-full glass-card p-6 rounded-[2.5rem] border border-mystic-gold/15 shadow-2xl relative overflow-hidden">
      {/* Decorative corner glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-mystic-gold/10 blur-[50px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-mystic-purple/10 blur-[50px] rounded-full pointer-events-none" />

      {/* Astro ID Header */}
      <div className="text-center mb-6 pb-6 border-b border-white/15">
        <div className="w-20 h-20 rounded-full border-2 border-mystic-gold bg-mystic-gold/5 mx-auto flex items-center justify-center text-4xl shadow-xl mb-4 relative">
          <span>🔮</span>
          <span className="absolute bottom-0 right-0 text-sm bg-mystic-gold text-black rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wider">ID</span>
        </div>
        <h2 className="text-white font-black text-2xl tracking-[0.1em] uppercase bg-gradient-to-r from-mystic-gold via-white to-mystic-gold bg-clip-text text-transparent">
          {isHindi ? 'मेरा ज्योतिष कार्ड' : 'MY ASTRO ID'}
        </h2>
        <p className="text-mystic-gold text-[10px] font-black uppercase tracking-widest mt-1">
          {isHindi ? 'वैदिक कुंडली एवं सत्यता प्रमाण' : 'Vedic Chart & Memory Reliability'}
        </p>
      </div>

      {/* Identity Details */}
      <div className="space-y-4">
        
        {/* Basic Fields */}
        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{isHindi ? 'नाम' : '👤 Name'}</span>
            <span className="text-white font-bold text-sm truncate">{profile.name}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{isHindi ? 'लिंग' : '♂ Gender'}</span>
            <span className="text-white font-bold text-sm">{profile.gender}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{isHindi ? 'आयु' : '🎂 Age'}</span>
            <span className="text-white font-bold text-sm">{age}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{isHindi ? 'वैवाहिक स्थिति' : '💍 Marital Status'}</span>
            <span className="text-white font-bold text-sm">{profile.maritalStatus}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{isHindi ? 'व्यवसाय' : '💼 Occupation'}</span>
            <span className="text-white font-bold text-sm truncate">{profile.occupation}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{isHindi ? 'शिक्षा' : '🎓 Education'}</span>
            <span className="text-white font-bold text-sm truncate">{profile.education}</span>
          </div>
        </div>

        {/* Location Row */}
        <div className="text-left flex flex-col pt-2 border-t border-white/5">
          <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{isHindi ? 'स्थान' : '📍 Location'}</span>
          <span className="text-white font-bold text-sm">
            {[profile.district, profile.state, profile.country].filter(Boolean).join(', ')}
          </span>
        </div>

        {/* Vedic Insights */}
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-left space-y-3">
          <h3 className="text-mystic-gold font-bold text-xs uppercase tracking-widest">✨ {isHindi ? 'दैवीय प्रभाव' : 'Cosmic Influences'}</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col">
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider">{isHindi ? 'वर्तमान महादशा' : 'Current Dasha'}</span>
              <span className="text-white font-bold">{currentDasha}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider">{isHindi ? 'भाग्यशाली संख्या' : 'Lucky Number'}</span>
              <span className="text-mystic-gold font-black">{luckyNumber}</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider">{isHindi ? 'भाग्यशाली रंग' : 'Lucky Color'}</span>
              <span className="text-white font-bold">{luckyColor}</span>
            </div>
          </div>
        </div>

        {/* Memory Reliability */}
        <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-mystic-gold/15 text-left space-y-3">
          <h3 className="text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            📊 {isHindi ? 'स्मृति सत्यता प्रमाण' : 'Memory Reliability'}
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-bold">{isHindi ? 'विवाह' : 'Marriage'} :</span>
              <span className="text-mystic-gold font-black text-sm">{getReliabilityDisplay(facts?.married)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-bold">{isHindi ? 'करियर' : 'Career'} :</span>
              <span className="text-mystic-gold font-black text-sm">
                {getReliabilityDisplay(facts?.hasJob || facts?.hasBusiness)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-bold">{isHindi ? 'संतान' : 'Children'} :</span>
              <span className="text-mystic-gold font-black text-sm">{getReliabilityDisplay(facts?.hasChildren)}</span>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <div className="pt-4">
          <Button
            onClick={onEdit}
            variant="gold"
            fullWidth
            className="h-12 font-black text-xs tracking-widest uppercase rounded-xl"
          >
            {isHindi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ProfileCard;
