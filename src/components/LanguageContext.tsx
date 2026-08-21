'use client';

import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const translations: Translations = {
  appTitle: { en: 'GiriRaksha', hi: 'गिरिरक्षा' },
  subtitle: { en: 'Landslide Early-Warning System', hi: 'भूस्खलन पूर्व-चेतावनी प्रणाली' },
  riskScore: { en: 'Risk Score', hi: 'जोखिम स्कोर' },
  slope: { en: 'Slope', hi: 'ढलान' },
  rainfall: { en: 'Rainfall (4d)', hi: 'वर्षा (4 दिन)' },
  soilMoisture: { en: 'Soil Moisture', hi: 'मिट्टी की नमी' },
  action: { en: 'Action', hi: 'कार्रवाई' },
  reportHazard: { en: 'Report Hazard', hi: 'खतरे की रिपोर्ट करें' },
  exportPdf: { en: 'Export PDF Report', hi: 'पीडीएफ रिपोर्ट डाउनलोड करें' },
  subscribeAlerts: { en: 'Subscribe to WhatsApp Alerts', hi: 'व्हाट्सएप अलर्ट सब्सक्राइब करें' },
  routePlanning: { en: 'Safe Route Planning', hi: 'सुरक्षित मार्ग योजना' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: keyof typeof translations) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
