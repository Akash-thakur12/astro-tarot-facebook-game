import { useState } from 'react';
import { LanguageContext } from './LanguageContextInstance';

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'English';
  });

  const setLanguage = (lang) => {
    setCurrentLanguage(lang);
    localStorage.setItem('app_language', lang);
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
