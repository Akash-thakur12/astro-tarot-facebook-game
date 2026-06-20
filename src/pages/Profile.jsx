import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { getUserProfile, saveUserProfile } from '../services/userService';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Button from '../components/ui/Button';
import ProfileCard from '../components/ProfileCard';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    dob: '',
    maritalStatus: '',
    occupation: '',
    education: '',
    country: '',
    state: '',
    district: ''
  });

  const [existingProfile, setExistingProfile] = useState(null);
  const [facts, setFacts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const isHindi = currentLanguage === 'Hindi';

  // Translation mapping
  const t = {
    title: isHindi ? 'मेरी ज्योतिष प्रोफ़ाइल' : 'My Astro Profile',
    subtitle: isHindi ? 'सटीक भविष्यवाणियों के लिए अपना विवरण दर्ज करें' : 'Enter your details for accurate predictions',
    nameLabel: isHindi ? 'नाम' : 'Full Name',
    namePlaceholder: isHindi ? 'अपना पूरा नाम दर्ज करें' : 'Enter your full name',
    genderLabel: isHindi ? 'लिंग' : 'Gender',
    genderPlaceholder: isHindi ? 'लिंग चुनें' : 'Select Gender',
    dobLabel: isHindi ? 'जन्म तिथि' : 'Date of Birth',
    maritalLabel: isHindi ? 'वैवाहिक स्थिति' : 'Marital Status',
    maritalPlaceholder: isHindi ? 'वैवाहिक स्थिति चुनें' : 'Select Marital Status',
    occupationLabel: isHindi ? 'व्यवसाय' : 'Occupation',
    occupationPlaceholder: isHindi ? 'व्यवसाय चुनें' : 'Select Occupation',
    educationLabel: isHindi ? 'शिक्षा' : 'Education',
    educationPlaceholder: isHindi ? 'अपनी उच्चतम योग्यता दर्ज करें' : 'e.g. Bachelor of Science',
    countryLabel: isHindi ? 'देश' : 'Country',
    countryPlaceholder: isHindi ? 'देश दर्ज करें' : 'e.g. India',
    stateLabel: isHindi ? 'राज्य' : 'State',
    statePlaceholder: isHindi ? 'राज्य दर्ज करें' : 'e.g. Maharashtra',
    districtLabel: isHindi ? 'ज़िला' : 'District',
    districtPlaceholder: isHindi ? 'ज़िला दर्ज करें' : 'e.g. Mumbai',
    saveBtn: isHindi ? 'प्रोफ़ाइल सहेजें' : 'Save Profile',
    savingBtn: isHindi ? 'सहेजा जा रहा है...' : 'Saving Profile...',
    backBtn: isHindi ? 'वापस' : 'Back',
    successMsg: isHindi ? 'प्रोफ़ाइल सफलतापूर्वक सहेज ली गई है!' : 'Profile saved successfully!',
    loadingMsg: isHindi ? 'प्रोफ़ाइल लोड हो रही है...' : 'Loading profile data...',
  };

  useEffect(() => {
    const fetchProfileAndFacts = async () => {
      if (!user?.uid) return;
      try {
        // Load profile
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setExistingProfile(profile);
          setFormData({
            name: profile.name || '',
            gender: profile.gender || '',
            dob: profile.dob || '',
            maritalStatus: profile.maritalStatus || '',
            occupation: profile.occupation || '',
            education: profile.education || '',
            country: profile.country || '',
            state: profile.state || '',
            district: profile.district || ''
          });
        } else {
          // If no profile exists, open the edit form immediately
          setIsEditing(true);
        }

        // Load facts for reliability score display
        const factsRef = doc(db, 'users', user.uid, 'facts', 'current');
        const factsSnap = await getDoc(factsRef);
        if (factsSnap.exists()) {
          setFacts(factsSnap.data());
        }
      } catch (err) {
        console.error("Error loading profile/facts data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndFacts();
  }, [user?.uid]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errs.name = isHindi ? 'नाम कम से कम 2 अक्षरों का होना चाहिए।' : 'Name must be at least 2 characters.';
    }
    if (!formData.gender) {
      errs.gender = isHindi ? 'कृपया लिंग का चयन करें।' : 'Gender is required.';
    }
    if (!formData.dob) {
      errs.dob = isHindi ? 'जन्म तिथि आवश्यक है।' : 'Date of birth is required.';
    } else {
      const selectedDate = new Date(formData.dob);
      const today = new Date();
      if (selectedDate > today) {
        errs.dob = isHindi ? 'जन्म तिथि भविष्य में नहीं हो सकती।' : 'Date of birth cannot be in the future.';
      }
    }
    if (!formData.maritalStatus) {
      errs.maritalStatus = isHindi ? 'कृपया वैवाहिक स्थिति चुनें।' : 'Marital status is required.';
    }
    if (!formData.occupation) {
      errs.occupation = isHindi ? 'कृपया व्यवसाय चुनें।' : 'Occupation is required.';
    }
    if (!formData.education || !formData.education.trim()) {
      errs.education = isHindi ? 'शिक्षा आवश्यक है।' : 'Education is required.';
    }
    if (!formData.country || !formData.country.trim()) {
      errs.country = isHindi ? 'देश आवश्यक है।' : 'Country is required.';
    }
    if (!formData.state || !formData.state.trim()) {
      errs.state = isHindi ? 'राज्य आवश्यक है।' : 'State is required.';
    }
    if (!formData.district || !formData.district.trim()) {
      errs.district = isHindi ? 'ज़िला आवश्यक है।' : 'District is required.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSaving(true);
    setSuccess(false);
    
    try {
      const cleanData = {
        name: formData.name.trim(),
        gender: formData.gender,
        dob: formData.dob,
        maritalStatus: formData.maritalStatus,
        occupation: formData.occupation,
        education: formData.education.trim(),
        country: formData.country.trim(),
        state: formData.state.trim(),
        district: formData.district.trim()
      };
      
      const saved = await saveUserProfile(user.uid, cleanData, existingProfile);
      setExistingProfile(saved);

      // Reload updated facts (since saveUserProfile syncs facts to Firestore)
      const factsRef = doc(db, 'users', user.uid, 'facts', 'current');
      const factsSnap = await getDoc(factsRef);
      if (factsSnap.exists()) {
        setFacts(factsSnap.data());
      }

      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Save failed:", err);
      setErrors({ global: isHindi ? 'सहेजने में विफलता। कृपया पुनः प्रयास करें।' : 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-[#09090b]">
        <div className="w-10 h-10 border-4 border-mystic-gold/10 border-t-mystic-gold rounded-full animate-spin mb-4" />
        <p className="text-white/60 text-sm font-bold uppercase tracking-wider">{t.loadingMsg}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-32 animate-fade-in bg-[#09090b] relative overflow-hidden font-sans px-5 pt-8">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-mystic-gold/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-mystic-purple/5 blur-[100px] pointer-events-none" />

      {/* Back Button */}
      <div className="relative z-20 mb-6">
        <button
          onClick={() => {
            if (isEditing && existingProfile) {
              setIsEditing(false);
            } else {
              navigate('/');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
        >
          ← {t.backBtn}
        </button>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] bg-black/95 border border-mystic-gold text-mystic-gold px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-fade-in text-xs whitespace-nowrap uppercase tracking-widest text-center">
          ✨ {t.successMsg}
        </div>
      )}

      {/* View Card vs Edit Form */}
      {!isEditing && existingProfile ? (
        <ProfileCard 
          profile={existingProfile} 
          facts={facts} 
          onEdit={() => setIsEditing(true)} 
          isHindi={isHindi} 
        />
      ) : (
        <div className="relative z-10 w-full glass-card p-6 rounded-[2.5rem] border border-mystic-gold/15 shadow-2xl relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-24 h-24 bg-mystic-gold/10 blur-2xl rounded-full pointer-events-none" />
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full border border-mystic-gold/20 bg-mystic-gold/5 mx-auto flex items-center justify-center text-3xl shadow-lg mb-3">
              👤
            </div>
            <h2 className="text-white font-black text-2xl tracking-wide uppercase bg-gradient-to-r from-mystic-gold via-white to-mystic-gold bg-clip-text text-transparent">
              {t.title}
            </h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
              {t.subtitle}
            </p>
          </div>

          {errors.global && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider text-center">
              ⚠️ {errors.global}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.nameLabel} <span className="text-mystic-gold">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t.namePlaceholder}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.name ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all`}
              />
              {errors.name && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.name}</p>}
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.genderLabel} <span className="text-mystic-gold">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.gender ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all appearance-none cursor-pointer`}
                style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23fbbf24\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")', backgroundPosition: 'right 16px center', backgroundRepeat: 'no-repeat' }}
              >
                <option value="" disabled className="bg-[#09090b] text-white/30">{t.genderPlaceholder}</option>
                <option value="Male" className="bg-[#09090b] text-white">{t.male}</option>
                <option value="Female" className="bg-[#09090b] text-white">{t.female}</option>
                <option value="Other" className="bg-[#09090b] text-white">{t.other}</option>
              </select>
              {errors.gender && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.gender}</p>}
            </div>

            {/* DOB */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.dobLabel} <span className="text-mystic-gold">*</span>
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.dob ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all cursor-pointer`}
              />
              {errors.dob && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.dob}</p>}
            </div>

            {/* Marital Status */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.maritalLabel} <span className="text-mystic-gold">*</span>
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.maritalStatus ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all appearance-none cursor-pointer`}
                style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23fbbf24\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")', backgroundPosition: 'right 16px center', backgroundRepeat: 'no-repeat' }}
              >
                <option value="" disabled className="bg-[#09090b] text-white/30">{t.maritalPlaceholder}</option>
                <option value="Single" className="bg-[#09090b] text-white">{isHindi ? 'एकल' : 'Single'}</option>
                <option value="Married" className="bg-[#09090b] text-white">{isHindi ? 'विवाहित' : 'Married'}</option>
                <option value="Divorced" className="bg-[#09090b] text-white">{isHindi ? 'तलाकशुदा' : 'Divorced'}</option>
                <option value="Separated" className="bg-[#09090b] text-white">{isHindi ? 'अलग' : 'Separated'}</option>
                <option value="Widowed" className="bg-[#09090b] text-white">{isHindi ? 'विधवा/विधुर' : 'Widowed'}</option>
              </select>
              {errors.maritalStatus && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.maritalStatus}</p>}
            </div>

            {/* Occupation */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.occupationLabel} <span className="text-mystic-gold">*</span>
              </label>
              <select
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.occupation ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all appearance-none cursor-pointer`}
                style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23fbbf24\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")', backgroundPosition: 'right 16px center', backgroundRepeat: 'no-repeat' }}
              >
                <option value="" disabled className="bg-[#09090b] text-white/30">{t.occupationPlaceholder}</option>
                <option value="Student" className="bg-[#09090b] text-white">{isHindi ? 'छात्र' : 'Student'}</option>
                <option value="Private Job" className="bg-[#09090b] text-white">{isHindi ? 'प्राइवेट नौकरी' : 'Private Job'}</option>
                <option value="Government Job" className="bg-[#09090b] text-white">{isHindi ? 'सरकारी नौकरी' : 'Government Job'}</option>
                <option value="Business Owner" className="bg-[#09090b] text-white">{isHindi ? 'व्यापार मालिक' : 'Business Owner'}</option>
                <option value="Self Employed" className="bg-[#09090b] text-white">{isHindi ? 'स्व-नियोजित' : 'Self Employed'}</option>
                <option value="Unemployed" className="bg-[#09090b] text-white">{isHindi ? 'बेरोजगार' : 'Unemployed'}</option>
                <option value="Homemaker" className="bg-[#09090b] text-white">{isHindi ? 'गृहणी' : 'Homemaker'}</option>
                <option value="Retired" className="bg-[#09090b] text-white">{isHindi ? 'सेवानिवृत्त' : 'Retired'}</option>
                <option value="Other" className="bg-[#09090b] text-white">{isHindi ? 'अन्य' : 'Other'}</option>
              </select>
              {errors.occupation && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.occupation}</p>}
            </div>

            {/* Education */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.educationLabel} <span className="text-mystic-gold">*</span>
              </label>
              <input
                type="text"
                name="education"
                value={formData.education}
                onChange={handleChange}
                placeholder={t.educationPlaceholder}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.education ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all`}
              />
              {errors.education && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.education}</p>}
            </div>

            {/* Country */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.countryLabel} <span className="text-mystic-gold">*</span>
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder={t.countryPlaceholder}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.country ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all`}
              />
              {errors.country && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.country}</p>}
            </div>

            {/* State */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.stateLabel} <span className="text-mystic-gold">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder={t.statePlaceholder}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.state ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all`}
              />
              {errors.state && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.state}</p>}
            </div>

            {/* District */}
            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-xs font-bold uppercase tracking-wider">
                {t.districtLabel} <span className="text-mystic-gold">*</span>
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder={t.districtPlaceholder}
                className={`h-12 w-full rounded-xl bg-black/40 border ${errors.district ? 'border-red-500/50' : 'border-white/10'} focus:border-mystic-gold/50 px-4 text-white text-sm outline-none transition-all`}
              />
              {errors.district && <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">{errors.district}</p>}
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="gold"
                fullWidth
                loading={saving}
                className="h-14 font-black text-base tracking-[0.2em] uppercase rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.3)]"
              >
                {saving ? t.savingBtn : t.saveBtn}
              </Button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
