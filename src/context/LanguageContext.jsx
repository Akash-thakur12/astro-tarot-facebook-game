import { useState } from 'react';
import { LanguageContext } from './LanguageContextInstance';

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    try {
      return localStorage.getItem('app_language') || 'English';
    } catch (e) {
      console.warn("Storage access denied:", e);
      return 'English';
    }
  });

  const setLanguage = (lang) => {
    setCurrentLanguage(lang);
    try {
      localStorage.setItem('app_language', lang);
    } catch (e) {
      console.warn("Storage write denied:", e);
    }
  };

  const value = {
    currentLanguage,
    setLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
