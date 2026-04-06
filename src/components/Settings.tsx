/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from './ui/Card';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Type, 
  Moon, 
  Sun, 
  Monitor,
  Check,
  Palette
} from 'lucide-react';
import { cn } from '../utils';

export function Settings() {
  const { theme, fontSize, setTheme, setFontSize } = useSettings();

  const fontOptions = [
    { id: 'small', label: 'Small', description: 'Compact view for more data' },
    { id: 'medium', label: 'Medium', description: 'Standard readable size' },
    { id: 'large', label: 'Large', description: 'Enhanced visibility' },
  ] as const;

  const themeOptions = [
    { id: 'light', label: 'Light Mode', icon: Sun, description: 'Classic bright interface' },
    { id: 'dark', label: 'Dark Mode', icon: Moon, description: 'High contrast black interface' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Personalize your experience and interface preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Appearance Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Palette className="h-5 w-5 text-indigo-600" />
            <h2>Appearance & Theme</h2>
          </div>
          <Card className="p-6 dark:bg-slate-900 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                      isActive 
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
                        : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      isActive ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{option.label}</span>
                        {isActive && <Check className="h-4 w-4 text-indigo-600" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Typography Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Type className="h-5 w-5 text-indigo-600" />
            <h2>Typography & Scaling</h2>
          </div>
          <Card className="p-6 dark:bg-slate-900 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fontOptions.map((option) => {
                const isActive = fontSize === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setFontSize(option.id)}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-xl border-2 transition-all text-left",
                      isActive 
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
                        : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-bold text-slate-900 dark:text-white",
                        option.id === 'small' ? 'text-sm' : option.id === 'large' ? 'text-lg' : 'text-base'
                      )}>
                        {option.label}
                      </span>
                      {isActive && <Check className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </Card>
        </section>

        {/* System Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Monitor className="h-5 w-5 text-indigo-600" />
            <h2>System Information</h2>
          </div>
          <Card className="p-6 dark:bg-slate-900 dark:border-slate-800">
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Version</span>
                <span className="font-medium text-slate-900 dark:text-white">v1.2.0-stable</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Last Updated</span>
                <span className="font-medium text-slate-900 dark:text-white">April 6, 2026</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">Environment</span>
                <span className="font-medium text-slate-900 dark:text-white uppercase tracking-wider">Production</span>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
