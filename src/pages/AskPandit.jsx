import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { auth } from '../services/firebase';
import { savePanditMessage, getPanditHistory, saveUserProfile, getUserProfile } from '../services/userService';
import { preloadInterstitial, showInterstitial } from '../services/fbInterstitial';
import { INTERSTITIAL_PANDIT_ID } from '../config/adConfig';
import Button from '../components/ui/Button';

// Extracted outside the main component to prevent re-renders on state changes causing focus loss
const InputField = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-[10px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{label}</label>
    <input 
      type="text" 
      value={value} 
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-mystic-gold/50 transition-all placeholder:text-white/20"
    />
  </div>
);

const SelectorButton = ({ value, options, placeholder, title, onSelect, setPickerConfig }) => {
  const selectedOption = options.find(opt => (typeof opt === 'object' ? opt.value : opt) === value);
  const displayValue = selectedOption ? (typeof selectedOption === 'object' ? selectedOption.name : selectedOption) : placeholder;

  return (
    <button
      type="button"
      onClick={() => setPickerConfig({ options, title, value, onSelect })}
      className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-white text-sm transition-all hover:border-mystic-gold/50"
    >
      <span className={`truncate mr-1 ${value ? 'text-white' : 'text-white/40'}`}>
        {displayValue}
      </span>
      <span className="text-[10px] flex-shrink-0 text-mystic-gold">▼</span>
    </button>
  );
};

const PickerModal = ({ pickerConfig, setPickerConfig, isHindi }) => {
  if (!pickerConfig) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={() => setPickerConfig(null)} />
      <div className="glass-card w-full max-w-sm rounded-[32px] border border-mystic-gold/30 flex flex-col max-h-[70vh] relative z-10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="p-6 text-center border-b border-white/5">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-mystic-gold">{pickerConfig.title}</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {pickerConfig.options.map((opt, i) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optName = typeof opt === 'object' ? opt.name : opt;
            const isSelected = pickerConfig.value === optValue;
            return (
              <div
                key={i}
                onClick={() => {
                  pickerConfig.onSelect(optValue);
                  setPickerConfig(null);
                }}
                className={`px-8 py-5 text-center transition-all cursor-pointer ${
                  isSelected ? 'bg-mystic-gold text-mystic-indigo font-black text-xl' : 'text-white/60 hover:text-white hover:bg-white/5 text-lg'
                }`}
              >
                {optName}
              </div>
            );
          })}
        </div>
        <div className="p-4 bg-white/5 text-center">
           <button onClick={() => setPickerConfig(null)} className="py-2 text-[10px] font-black uppercase tracking-widest text-white/40">
             {isHindi ? 'रद्द करें' : 'Cancel'}
           </button>
        </div>
      </div>
    </div>
  );
};

const AskPandit = () => {
  const { user, refreshUser, getToken } = useAuth();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const isHindi = currentLanguage === 'Hindi';
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // State
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasEnteredDetails, setHasEnteredDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLowCoinsModal, setShowLowCoinsModal] = useState(false);
  const [pickerConfig, setPickerConfig] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Forms
  const [personalForm, setPersonalForm] = useState({ 
    name: '', gender: '', dobDay: '', dobMonth: '', dobYear: '', tobHour: '', tobMinute: '', tobPeriod: '', pob: '', maritalStatus: '', occupation: '' 
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      if (!user?.uid) {
        setMessages([]);
        setHasEnteredDetails(false);
        return;
      }
      
      let finalMsgs = [];
      let finalForm = personalForm;
      let hasDetails = false;

      // Local storage fallback for immediate UI
      try {
        const savedProfile = localStorage.getItem(`pandit_user_profile_${user.uid}`);
        if (savedProfile) {
          finalForm = JSON.parse(savedProfile);
          setPersonalForm(finalForm);
        }
        
        const savedEntered = localStorage.getItem(`pandit_has_entered_details_${user.uid}`);
        hasDetails = savedEntered === 'true';
        setHasEnteredDetails(hasDetails);
        
        const savedMsgs = localStorage.getItem(`pandit_chat_messages_${user.uid}`);
        if (savedMsgs) {
          finalMsgs = JSON.parse(savedMsgs);
        }
      } catch(e) {}

      // Fetch from Firestore
      try {
        const firestoreHistory = await getPanditHistory(user.uid);
        if (firestoreHistory !== null) {
          finalMsgs = firestoreHistory;
        }

        const profile = await getUserProfile(user.uid);
        if (profile) {
          hasDetails = true;
          setHasEnteredDetails(true);
          
          const updatedForm = { ...finalForm };
          if (profile.name) updatedForm.name = profile.name;
          if (profile.gender) updatedForm.gender = profile.gender;
          if (profile.maritalStatus) updatedForm.maritalStatus = profile.maritalStatus;
          if (profile.occupation) updatedForm.occupation = profile.occupation;
          if (profile.placeOfBirth) {
            updatedForm.pob = profile.placeOfBirth;
          } else if (profile.pob) {
            updatedForm.pob = profile.pob;
          }

          if (profile.dob) {
            const parts = profile.dob.split(/[-/]/);
            if (parts.length === 3) {
              updatedForm.dobYear = parts[0];
              updatedForm.dobMonth = parts[1];
              updatedForm.dobDay = parts[2];
            }
          }
          if (profile.timeOfBirth) {
            const match = profile.timeOfBirth.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (match) {
              updatedForm.tobHour = match[1];
              updatedForm.tobMinute = match[2];
              updatedForm.tobPeriod = match[3].toUpperCase();
            }
          }
          finalForm = updatedForm;
          setPersonalForm(finalForm);
        }
      } catch (e) {
        console.warn("Firestore error, staying on local data.", e);
      }

      // Check if history is empty and profile exists, then insert profile card
      const isProfileValid = finalForm.name && finalForm.gender && finalForm.dobDay && finalForm.dobMonth && finalForm.dobYear && finalForm.pob;
      if (hasDetails || isProfileValid) {
        const genderIcon = finalForm.gender === 'Male' ? '♂️' : finalForm.gender === 'Female' ? '♀️' : '👤';
        const genderText = isHindi 
          ? (finalForm.gender === 'Male' ? 'पुरुष' : finalForm.gender === 'Female' ? 'महिला' : 'अन्य') 
          : finalForm.gender;
        
        const dobFormatted = `${finalForm.dobDay}-${finalForm.dobMonth}-${finalForm.dobYear}`;
        
        const maritalText = isHindi
          ? (finalForm.maritalStatus === 'Single' ? 'एकल' : finalForm.maritalStatus === 'Married' ? 'विवाहित' : finalForm.maritalStatus === 'Divorced' ? 'तलाकशुदा' : finalForm.maritalStatus === 'Separated' ? 'अलग' : finalForm.maritalStatus === 'Widowed' ? 'विधवा/विधुर' : finalForm.maritalStatus)
          : finalForm.maritalStatus;

        const occupationText = isHindi
          ? (finalForm.occupation === 'Student' ? 'छात्र' : finalForm.occupation === 'Private Job' ? 'प्राइवेट नौकरी' : finalForm.occupation === 'Government Job' ? 'सरकारी नौकरी' : finalForm.occupation === 'Business Owner' ? 'व्यापार मालिक' : finalForm.occupation === 'Self Employed' ? 'स्व-नियोजित' : finalForm.occupation === 'Homemaker' ? 'गृहणी' : finalForm.occupation === 'Retired' ? 'सेवानिवृत्त' : finalForm.occupation === 'Other' ? 'अन्य' : finalForm.occupation)
          : finalForm.occupation;

        const timeOfBirth = `${finalForm.tobHour}:${finalForm.tobMinute} ${finalForm.tobPeriod}`;

        const introMessage = `🧾 Birth Details Submitted

👤 ${finalForm.name}
${genderIcon} ${genderText}
🎂 ${dobFormatted}
💍 ${maritalText}
💼 ${occupationText}
🕐 ${timeOfBirth}
📍 ${finalForm.pob}

Kripya meri janm jankari ke anusar margdarshan dein.`;

        const profileBubble = {
          role: "user",
          type: "profile",
          persist: false,
          content: introMessage
        };

        const hasProfileBubble = finalMsgs.some(m => m.type === "profile");
        if (!hasProfileBubble) {
          finalMsgs = [profileBubble, ...finalMsgs];
        }
      }

      setMessages(finalMsgs);
      setIsLoaded(true);
    };
    loadData();
  }, [user?.uid]);

  // PERSISTENCE - Save to localStorage
  useEffect(() => {
    if (!isLoaded || !user?.uid) return;
    try {
      const messagesToSave = messages.filter(m => m.persist !== false);
      localStorage.setItem(`pandit_chat_messages_${user.uid}`, JSON.stringify(messagesToSave));
      localStorage.setItem(`pandit_user_profile_${user.uid}`, JSON.stringify(personalForm));
      localStorage.setItem(`pandit_has_entered_details_${user.uid}`, hasEnteredDetails ? 'true' : 'false');
    } catch (e) {
      console.warn("Storage write denied in AskPandit:", e);
    }
  }, [messages, personalForm, hasEnteredDetails, isLoaded, user?.uid]);

  useEffect(() => {
    preloadInterstitial(INTERSTITIAL_PANDIT_ID);
    const initializePandit = async () => {
      if (user?.uid) {
        try {
          const idToken = await getToken();
          const response = await fetch('/api/user/check-status', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              provider: user.provider || 'firebase'
            })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.resetPerformed) {
              await refreshUser();
            }
          }
        } catch (err) {
          console.error("Status check failed:", err);
        }
      }
    };
    initializePandit();
  }, [user?.uid, refreshUser, getToken]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  };

  useEffect(() => {
    scrollToBottom();
    // Auto-focus removed to prevent viewport shift race conditions on mobile
  }, [messages, loading, hasEnteredDetails]);

  const handleNewChat = () => {
    if (user?.uid) {
      localStorage.removeItem(`pandit_chat_messages_${user.uid}`);
    }
    
    const dob = `${personalForm.dobYear}-${personalForm.dobMonth}-${personalForm.dobDay}`;
    const timeOfBirth = `${personalForm.tobHour}:${personalForm.tobMinute} ${personalForm.tobPeriod}`;
    
    const genderIcon = personalForm.gender === 'Male' ? '♂️' : personalForm.gender === 'Female' ? '♀️' : '👤';
    const genderText = isHindi 
      ? (personalForm.gender === 'Male' ? 'पुरुष' : personalForm.gender === 'Female' ? 'महिला' : 'अन्य') 
      : personalForm.gender;
    
    const dobFormatted = `${personalForm.dobDay}-${personalForm.dobMonth}-${personalForm.dobYear}`;
    
    const maritalText = isHindi
      ? (personalForm.maritalStatus === 'Single' ? 'एकल' : personalForm.maritalStatus === 'Married' ? 'विवाहित' : personalForm.maritalStatus === 'Divorced' ? 'तलाकशुदा' : personalForm.maritalStatus === 'Separated' ? 'अलग' : personalForm.maritalStatus === 'Widowed' ? 'विधवा/विधुर' : personalForm.maritalStatus)
      : personalForm.maritalStatus;

    const occupationText = isHindi
      ? (personalForm.occupation === 'Student' ? 'छात्र' : personalForm.occupation === 'Private Job' ? 'प्राइवेट नौकरी' : personalForm.occupation === 'Government Job' ? 'सरकारी नौकरी' : personalForm.occupation === 'Business Owner' ? 'व्यापार मालिक' : personalForm.occupation === 'Self Employed' ? 'स्व-नियोजित' : personalForm.occupation === 'Homemaker' ? 'गृहणी' : personalForm.occupation === 'Retired' ? 'सेवानिवृत्त' : personalForm.occupation === 'Other' ? 'अन्य' : personalForm.occupation)
      : personalForm.occupation;

    const introMessage = `🧾 Birth Details Submitted

👤 ${personalForm.name}
${genderIcon} ${genderText}
🎂 ${dobFormatted}
💍 ${maritalText}
💼 ${occupationText}
🕐 ${timeOfBirth}
📍 ${personalForm.pob}

Kripya meri janm jankari ke anusar margdarshan dein.`;

    const profileBubble = {
      role: "user",
      type: "profile",
      persist: false,
      content: introMessage
    };

    if (messages.some(m => m.type === "profile")) {
      const existingProfile = messages.find(m => m.type === "profile");
      setMessages([existingProfile]);
    } else {
      setMessages([profileBubble]);
    }
  };

  // DYNAMIC LANGUAGE DETECTION
  const detectTone = (text) => {
    if (!text) return isHindi ? 'hindi_script' : 'english';
    const lower = text.toLowerCase();
    if (/[\u0900-\u097F]/.test(text)) return 'hindi_script';
    const hinglishWords = ['kya', 'kab', 'kaise', 'hai', 'hoga', 'hogi', 'milega', 'jayega', 'mera', 'meri', 'shaadi', 'shadi', 'rahega', 'kar', 'raha'];
    if (hinglishWords.some(w => lower.includes(w))) return 'hinglish';
    return 'english';
  };

  // Translations
  const t = {
    title: isHindi ? 'ज्योतिष सहायक' : 'Pandit AI Chat',
    name: isHindi ? 'नाम' : 'Name',
    gender: isHindi ? 'लिंग' : 'Gender',
    dob: isHindi ? 'जन्म तिथि' : 'Date of Birth',
    tob: isHindi ? 'जन्म समय' : 'Time of Birth',
    pob: isHindi ? 'जन्म स्थान' : 'Place of Birth',
    day: isHindi ? 'दिन' : 'Day',
    month: isHindi ? 'महीना' : 'Month',
    year: isHindi ? 'वर्ष' : 'Year',
    hour: isHindi ? 'घंटा' : 'Hour',
    min: isHindi ? 'मिनट' : 'Min',
    period: 'AM/PM',
    question: isHindi ? 'अपना प्रश्न पूछें...' : 'Ask your question...',
    startChat: isHindi ? 'चैट शुरू करें' : 'Start Chatting',
    thinking: isHindi ? '🔮 पंडित जी विचार कर रहे हैं...' : '🔮 Pandit AI is thinking...',
    invalidDate: isHindi ? 'कृपया मान्य जन्म तिथि दर्ज करें' : 'Please enter a valid birth date',
    unlimited: isHindi ? 'असीमित' : 'Unlimited',
    freeToday: isHindi ? 'आज मुफ़्त' : 'FREE Today',
    tenCoins: isHindi ? '30 सिक्के' : '30 Coins',
    notEnough: isHindi ? 'सिक्के कम हैं' : 'Not enough coins',
    modalSub: isHindi ? 'परामर्श के लिए 30 सिक्के या प्रीमियम सदस्यता आवश्यक है।' : 'Consulting requires 30 coins or a Premium subscription.',
    upgradeButton: isHindi ? 'प्रीमियम ₹99 अनलॉक करें' : 'Unlock Premium ₹99',
    earnButton: isHindi ? 'मुफ्त सिक्के कमाएं' : 'Watch Ad to Continue',
    maybeLater: isHindi ? 'बाद में' : 'Maybe Later',
    newChat: isHindi ? 'नई चैट' : 'New Chat'
  };

  const genderOptions = [
    { name: isHindi ? 'पुरुष' : 'Male', value: 'Male' },
    { name: isHindi ? 'महिला' : 'Female', value: 'Female' },
    { name: isHindi ? 'अन्य' : 'Other', value: 'Other' }
  ];

  // Selectors Data
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = [
    { name: isHindi ? 'जनवरी' : 'January', value: '01' }, { name: isHindi ? 'फ़रवरी' : 'February', value: '02' },
    { name: isHindi ? 'मार्च' : 'March', value: '03' }, { name: isHindi ? 'अप्रैल' : 'April', value: '04' },
    { name: isHindi ? 'मई' : 'May', value: '05' }, { name: isHindi ? 'जून' : 'June', value: '06' },
    { name: isHindi ? 'जुलाई' : 'July', value: '07' }, { name: isHindi ? 'अगस्त' : 'August', value: '08' },
    { name: isHindi ? 'सितंबर' : 'September', value: '09' }, { name: isHindi ? 'अक्टूबर' : 'October', value: '10' },
    { name: isHindi ? 'नवंबर' : 'November', value: '11' }, { name: isHindi ? 'दिसंबर' : 'December', value: '12' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => (currentYear - i).toString());
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const getValidationError = (day, month, year) => {
    if (!day || !month || !year) return null; // Incomplete date, don't show error yet
    
    const d = parseInt(day, 10);
    const m = parseInt(month, 10) - 1;
    const y = parseInt(year, 10);
    const date = new Date(y, m, d);
    
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) {
      console.warn("Validation failed: Invalid calendar date.", { day, month, year });
      return "Invalid birth date.";
    }
    
    const now = new Date();
    if (date > now) {
      console.warn("Validation failed: Date is in the future.", { day, month, year });
      return "Birth date cannot be in the future.";
    }
    
    let age = now.getFullYear() - date.getFullYear();
    const mDiff = now.getMonth() - date.getMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < date.getDate())) age--;
    
    if (age < 13) {
      console.warn("Validation failed: Age is under 13.", { age, day, month, year });
      return "Age must be at least 13 years.";
    }
    
    if (age > 120) {
      console.warn("Validation failed: Age over 120.", { age, day, month, year });
      return "Please enter a valid birth year.";
    }
    
    return null; // Valid
  };

  const dobError = getValidationError(personalForm.dobDay, personalForm.dobMonth, personalForm.dobYear);

  const isFormValid = 
    personalForm.name && 
    personalForm.gender && 
    personalForm.dobDay && 
    personalForm.dobMonth && 
    personalForm.dobYear && 
    personalForm.tobHour && 
    personalForm.tobMinute && 
    personalForm.tobPeriod && 
    personalForm.pob && 
    personalForm.maritalStatus && 
    personalForm.occupation && 
    dobError === null;

  const executeSendMessage = async (question, currentMessages) => {
    setErrorMsg('');

    // CRITICAL FIX #2: Eliminate race condition by using updatedMessages immediately
    const newUserMessage = { role: 'user', content: question };
    const updatedMessages = [...currentMessages, newUserMessage];
    setMessages(updatedMessages); // Update state for UI
    
    // FIRESTORE: Save user message (if not a profile card)
    if (user?.uid && newUserMessage.type !== "profile") {
      savePanditMessage(user.uid, 'user', question);
    }

    setLoading(true);

    try {
      // Filter out profile bubbles before sending to backend
      const aiHistory = updatedMessages.filter(
        m => m.type !== "profile"
      );

      // CRITICAL FIX #7: Chat History Hard Limit
      const MAX_HISTORY = 30; // Max 15 user + 15 AI turns
      const trimmedHistory = aiHistory.slice(-MAX_HISTORY);

      const tone = detectTone(question);
      
      // CRITICAL FIX #3: Server-Side Authentication
      const token = await getToken();
      if (!token) throw new Error('Authentication token missing');

      const response = await fetch('/api/pandit-ai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          mode: 'chat', 
          currentTone: tone, 
          userData: { ...personalForm, question },
          history: trimmedHistory,
          language: currentLanguage
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API Request Failed');

      const aiResponseText = data.text;
      const modelMessage = { role: 'model', content: aiResponseText };
      setMessages(prev => [...prev, modelMessage]);
      
      // FIRESTORE: Save model message (if not a profile card)
      if (user?.uid && modelMessage.type !== "profile") {
        savePanditMessage(user.uid, 'model', aiResponseText);
      }
      
      // Sync global user state to reflect coin deduction immediately
      await refreshUser();
      
      showInterstitial();
    } catch (error) {
      console.error("AI Error:", error);
      setErrorMsg("Pandit AI is currently meditating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (isFormValid) {
      setLoading(true);
      try {
        const dob = `${personalForm.dobYear}-${personalForm.dobMonth}-${personalForm.dobDay}`;
        const timeOfBirth = `${personalForm.tobHour}:${personalForm.tobMinute} ${personalForm.tobPeriod}`;
        const placeOfBirth = personalForm.pob;

        const profileData = {
          name: personalForm.name,
          gender: personalForm.gender,
          dob,
          timeOfBirth,
          placeOfBirth,
          maritalStatus: personalForm.maritalStatus,
          occupation: personalForm.occupation
        };

        await saveUserProfile(user.uid, profileData);
        setHasEnteredDetails(true);

        const genderIcon = personalForm.gender === 'Male' ? '♂️' : personalForm.gender === 'Female' ? '♀️' : '👤';
        const genderText = isHindi 
          ? (personalForm.gender === 'Male' ? 'पुरुष' : personalForm.gender === 'Female' ? 'महिला' : 'अन्य') 
          : personalForm.gender;
        
        const dobFormatted = `${personalForm.dobDay}-${personalForm.dobMonth}-${personalForm.dobYear}`;
        
        const maritalText = isHindi
          ? (personalForm.maritalStatus === 'Single' ? 'एकल' : personalForm.maritalStatus === 'Married' ? 'विवाहित' : personalForm.maritalStatus === 'Divorced' ? 'तलाकशुदा' : personalForm.maritalStatus === 'Separated' ? 'अलग' : personalForm.maritalStatus === 'Widowed' ? 'विधवा/विधुर' : personalForm.maritalStatus)
          : personalForm.maritalStatus;

        const occupationText = isHindi
          ? (personalForm.occupation === 'Student' ? 'छात्र' : personalForm.occupation === 'Private Job' ? 'प्राइवेट नौकरी' : personalForm.occupation === 'Government Job' ? 'सरकारी नौकरी' : personalForm.occupation === 'Business Owner' ? 'व्यापार मालिक' : personalForm.occupation === 'Self Employed' ? 'स्व-नियोजित' : personalForm.occupation === 'Homemaker' ? 'गृहणी' : personalForm.occupation === 'Retired' ? 'सेवानिवृत्त' : personalForm.occupation === 'Other' ? 'अन्य' : personalForm.occupation)
          : personalForm.occupation;

        const introMessage = `🧾 Birth Details Submitted

👤 ${personalForm.name}
${genderIcon} ${genderText}
🎂 ${dobFormatted}
💍 ${maritalText}
💼 ${occupationText}
🕐 ${timeOfBirth}
📍 ${placeOfBirth}

Kripya meri janm jankari ke anusar margdarshan dein.`;

        setMessages([
          {
            role: "user",
            type: "profile",
            content: introMessage
          }
        ]);
      } catch (err) {
        console.error("Error saving profile details:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading || !user) return;

    const question = inputText.trim();
    setInputText('');

    const isFree = !user?.premium && !user?.dailyQuestionUsed;
    const hasEnoughCoins = (user?.coins || 0) >= 30;

    if (!user?.premium && !isFree && !hasEnoughCoins) {
      setShowLowCoinsModal(true);
      return;
    }

    await executeSendMessage(question, messages);
  };

  const renderBirthDetailsForm = () => (
    <div className="px-6 space-y-4 animate-fade-in py-6">
      <div className="glass-card p-6 rounded-[2rem] border-white/5 space-y-4">
        <h2 className="text-mystic-gold text-[10px] font-black uppercase tracking-widest text-center">Birth Details</h2>
        <InputField label={t.name} value={personalForm.name} onChange={e => setPersonalForm({...personalForm, name: e.target.value})} placeholder="e.g. Rahul" />
        
        <div className="space-y-1.5">
          <label className="text-[9px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{t.gender}</label>
          <div className="grid grid-cols-3 gap-2">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPersonalForm({ ...personalForm, gender: opt.value })}
                className={`py-2.5 text-[10px] font-bold rounded-xl border transition-all ${
                  personalForm.gender === opt.value 
                    ? 'bg-mystic-gold text-mystic-indigo border-mystic-gold' 
                    : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{t.dob}</label>
          <div className="grid grid-cols-3 gap-2">
            <SelectorButton value={personalForm.dobDay} options={days} placeholder={t.day} title="Select Day" onSelect={(val) => setPersonalForm(p => ({ ...p, dobDay: val }))} setPickerConfig={setPickerConfig} />
            <SelectorButton value={personalForm.dobMonth} options={months} placeholder={t.month} title="Select Month" onSelect={(val) => setPersonalForm(p => ({ ...p, dobMonth: val }))} setPickerConfig={setPickerConfig} />
            <SelectorButton value={personalForm.dobYear} options={years} placeholder={t.year} title="Select Year" onSelect={(val) => setPersonalForm(p => ({ ...p, dobYear: val }))} setPickerConfig={setPickerConfig} />
          </div>
          {dobError && (
            <div className="text-red-400 text-[9px] font-bold mt-1 ml-1 animate-fade-in">
              {dobError}
            </div>
          )}
        </div>

        <div className="space-y-1.5 animate-fade-in">
          <label className="text-[9px] uppercase tracking-widest text-mystic-gold font-bold ml-1">Marital Status</label>
          <SelectorButton 
            value={personalForm.maritalStatus} 
            options={[
              { name: isHindi ? 'एकल' : 'Single', value: 'Single' },
              { name: isHindi ? 'विवाहित' : 'Married', value: 'Married' },
              { name: isHindi ? 'तलाकशुदा' : 'Divorced', value: 'Divorced' },
              { name: isHindi ? 'अलग' : 'Separated', value: 'Separated' },
              { name: isHindi ? 'विधवा/विधुर' : 'Widowed', value: 'Widowed' }
            ]} 
            placeholder="Select Marital Status" 
            title="Select Marital Status" 
            onSelect={(val) => setPersonalForm(p => ({ ...p, maritalStatus: val }))} 
            setPickerConfig={setPickerConfig} 
          />
        </div>

        <div className="space-y-1.5 animate-fade-in">
          <label className="text-[9px] uppercase tracking-widest text-mystic-gold font-bold ml-1">Occupation</label>
          <SelectorButton 
            value={personalForm.occupation} 
            options={[
              { name: isHindi ? 'छात्र' : 'Student', value: 'Student' },
              { name: isHindi ? 'प्राइवेट नौकरी' : 'Private Job', value: 'Private Job' },
              { name: isHindi ? 'सरकारी नौकरी' : 'Government Job', value: 'Government Job' },
              { name: isHindi ? 'व्यापार मालिक' : 'Business Owner', value: 'Business Owner' },
              { name: isHindi ? 'स्व-नियोजित' : 'Self Employed', value: 'Self Employed' },
              { name: isHindi ? 'गृहणी' : 'Homemaker', value: 'Homemaker' },
              { name: isHindi ? 'सेवानिवृत्त' : 'Retired', value: 'Retired' },
              { name: isHindi ? 'अन्य' : 'Other', value: 'Other' }
            ]} 
            placeholder="Select Occupation" 
            title="Select Occupation" 
            onSelect={(val) => setPersonalForm(p => ({ ...p, occupation: val }))} 
            setPickerConfig={setPickerConfig} 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] uppercase tracking-widest text-mystic-gold font-bold ml-1">{t.tob}</label>
          <div className="grid grid-cols-3 gap-2">
            <SelectorButton value={personalForm.tobHour} options={hours} placeholder={t.hour} title="Select Hour" onSelect={(val) => setPersonalForm(p => ({ ...p, tobHour: val }))} setPickerConfig={setPickerConfig} />
            <SelectorButton value={personalForm.tobMinute} options={minutes} placeholder={t.min} title="Select Minute" onSelect={(val) => setPersonalForm(p => ({ ...p, tobMinute: val }))} setPickerConfig={setPickerConfig} />
            <SelectorButton value={personalForm.tobPeriod} options={periods} placeholder={t.period} title="Select AM/PM" onSelect={(val) => setPersonalForm(p => ({ ...p, tobPeriod: val }))} setPickerConfig={setPickerConfig} />
          </div>
        </div>

        <InputField label={t.pob} value={personalForm.pob} onChange={e => setPersonalForm({...personalForm, pob: e.target.value})} placeholder="e.g. New Delhi" />
      </div>

      <Button fullWidth variant="gold" onClick={handleStartChat} disabled={!isFormValid} className="h-14 text-base tracking-widest">
        {t.startChat}
      </Button>
    </div>
  );

  const renderChatInterface = () => (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full relative overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4 opacity-40 py-6">
            <span className="text-5xl animate-bounce">🔮</span>
            <div className="space-y-1">
              <h3 className="text-white text-lg font-bold">Namaste {personalForm.name}</h3>
              <p className="text-white/60 text-xs max-w-xs mx-auto">Your spiritual journey begins here. How can I guide you today?</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`
                relative px-6 py-4 rounded-[2rem] text-[15px] leading-[1.8] tracking-wide shadow-2xl
                ${msg.role === 'user' 
                  ? 'bg-mystic-gold text-mystic-indigo font-black max-w-[85%] rounded-tr-none' 
                  : 'bg-white/5 text-white/90 border border-white/10 max-w-[95%] rounded-tl-none backdrop-blur-md'
                }
              `}>
                {msg.content.split('\n').map((line, idx) => (
                  <p key={idx} className={line.trim() ? "mb-4 last:mb-0" : "h-2"}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/5 border border-white/10 text-mystic-gold px-6 py-4 rounded-[2rem] rounded-tl-none flex items-center gap-3 backdrop-blur-md shadow-xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-mystic-gold rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-mystic-gold rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-mystic-gold rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.thinking}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="max-w-xs mx-auto text-center px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[11px] font-bold uppercase tracking-wider">
              {errorMsg}
            </div>
          )}
          <div ref={chatEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area - Integrated at bottom of same max-width container */}
      <div className="px-4 pb-6 pt-4 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent border-t border-white/5">
        <form 
          onSubmit={handleSend} 
          className="relative flex items-center group mb-4"
        >
          <div className="absolute inset-0 bg-mystic-gold/10 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-full" />
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.question}
            className="w-full bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 rounded-full pl-8 pr-16 py-5 text-white text-base shadow-[0_8px_32px_rgba(0,0,0,0.6)] focus:outline-none focus:border-mystic-gold/40 transition-all placeholder:text-white/20"
          />
          <button 
            type="submit" 
            disabled={loading || !inputText.trim()}
            className="absolute right-3 w-12 h-12 bg-mystic-gold text-mystic-indigo rounded-full flex items-center justify-center shadow-lg active:scale-90 hover:scale-105 transition-all disabled:opacity-30 disabled:grayscale cursor-pointer z-10"
          >
            <span className="text-xl font-black">➔</span>
          </button>
        </form>
        
        <div className="text-center opacity-20 px-6">
           <p className="text-[9px] uppercase tracking-[0.2em] font-bold leading-relaxed text-white">Pandit AI can provide spiritual guidance but use your own wisdom</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-[#020617] overflow-hidden selection:bg-mystic-gold selection:text-mystic-indigo">
      <PickerModal pickerConfig={pickerConfig} setPickerConfig={setPickerConfig} isHindi={isHindi} />
      
      {/* Header */}
      <div className="px-6 pt-10 pb-4 border-b border-white/5 bg-[#020617]/80 backdrop-blur-2xl z-[60]">
        <div className="max-w-md mx-auto w-full flex justify-between items-center">
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            ←
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-black premium-gradient-text text-white tracking-tight">{t.title}</h1>
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Divine Presence Online</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasEnteredDetails && (
              <button 
                onClick={handleNewChat}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                🔄 {t.newChat}
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-mystic-gold/10 px-3 py-1.5 rounded-full border border-mystic-gold/20">
               <span className="text-xs">🪙</span>
               <span className="text-mystic-gold font-black text-xs">{user?.coins || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative">
        {hasEnteredDetails ? renderChatInterface() : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-2xl mx-auto w-full">
              {renderBirthDetailsForm()}
            </div>
          </div>
        )}
      </div>

      {showLowCoinsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-8 rounded-[32px] w-full max-w-sm border border-white/10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl mx-auto">
              <span className="text-white">🪙</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">{t.notEnough}</h2>
              <p className="text-white/60 text-sm">{t.modalSub}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button fullWidth variant="gold" onClick={() => navigate('/premium')}>
                {t.upgradeButton}
              </Button>
              <Button fullWidth variant="primary" onClick={() => navigate('/')}>
                {t.earnButton}
              </Button>
              <button onClick={() => setShowLowCoinsModal(false)} className="text-xs font-bold text-white/40 uppercase tracking-widest pt-2">
                {t.maybeLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskPandit;
