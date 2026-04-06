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
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
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

  useEffect(() => {
    localStorage.setItem('otz-theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#000000';
      root.style.color = '#ffffff';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc';
      root.style.color = '#0f172a';
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
    <SettingsContext.Provider value={{ theme, fontSize, setTheme, setFontSize }}>
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
