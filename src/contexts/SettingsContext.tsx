/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';

interface SettingsContextType {
  theme: Theme;
  fontSize: FontSize;
  privacyMode: boolean;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  togglePrivacyMode: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('otz-theme');
    return (saved as Theme) || 'light';
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem('otz-font-size');
    return (saved as FontSize) || 'medium';
  });

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('otz-privacy-mode');
    return saved === 'true';
  });

  const togglePrivacyMode = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem('otz-privacy-mode', String(next));
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('otz-theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('otz-font-size', fontSize);
    const root = window.document.documentElement;
    switch (fontSize) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'medium':
        root.style.fontSize = '16px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
    }
  }, [fontSize]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        fontSize,
        privacyMode,
        setTheme,
        setFontSize,
        togglePrivacyMode,
      }}
    >
      <div className={theme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
