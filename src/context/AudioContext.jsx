import React, { createContext, useContext, useState, useEffect } from 'react';
import { preloadAudio } from '../services/audioService';

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    preloadAudio();
    try {
      const saved = localStorage.getItem('pandit_sound_enabled');
      if (saved === 'false') {
        setSoundEnabled(false);
      }
    } catch (e) {
      console.warn("Audio storage error");
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newVal = !prev;
      try {
        localStorage.setItem('pandit_sound_enabled', String(newVal));
      } catch(e) {}
      return newVal;
    });
  };

  return (
    <AudioContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </AudioContext.Provider>
  );
};
