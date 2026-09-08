/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card } from './ui/Card';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Type, 
  Moon, 
  Sun, 
  Monitor, 
  Check, 
  Palette, 
  Database, 
  Download, 
  Upload,
  Loader2
} from 'lucide-react';
import { cn } from '../utils';
import { Button } from './ui/Button';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';

export function Settings() {
  const { theme, fontSize, setTheme, setFontSize } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fontOptions = [
    { id: 'small', label: 'Small', description: 'Compact view for more data' },
    { id: 'medium', label: 'Medium', description: 'Standard readable size' },
    { id: 'large', label: 'Large', description: 'Enhanced visibility' },
  ] as const;

  const themeOptions = [
    { id: 'light', label: 'Light Mode', icon: Sun, description: 'Classic bright interface' },
    { id: 'dark', label: 'Dark Mode', icon: Moon, description: 'High contrast black interface' },
  ] as const;

  // Export clinic data (works in both Cloud and Local)
  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data: any = null;

      // 1. Try Firestore direct export
      try {
        const collections = ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs'];
        const exportData: Record<string, any[]> = {};
        let count = 0;

        for (const collName of collections) {
          const snap = await getDocs(collection(db, collName));
          exportData[collName] = snap.docs.map((docSnap) => {
            const docData = docSnap.data();
            const clean: Record<string, any> = { id: docSnap.id, ...docData };
            for (const key of Object.keys(clean)) {
              if (clean[key] instanceof Timestamp) {
                clean[key] = clean[key].toDate().toISOString();
              }
            }
            return clean;
          });
          count += exportData[collName].length;
        }

        if (count > 0) {
          data = exportData;
        }
      } catch (firestoreErr) {
        console.warn('Direct Firestore export unavailable, trying server API:', firestoreErr);
      }

      // 2. Fallback to local server API if Firestore had no records or failed
      if (!data) {
        const res = await fetch('/api/export');
        if (res.ok) {
          data = await res.json();
        }
      }

      if (!data || Object.keys(data).length === 0) {
        throw new Error('No clinic records found to export.');
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `otz-clinic-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      alert('Error exporting data: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Import clinic data (works in both Cloud and Local)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to import this data? Existing records will be updated and new records added.')) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);

      let importedCount = 0;

      // 1. Direct Firestore Batch Import (Populates Firestore so it works immediately upon login)
      try {
        const collections = ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs'];
        for (const collName of collections) {
          const items = parsedData[collName];
          if (!Array.isArray(items) || items.length === 0) continue;

          let batch = writeBatch(db);
          let batchCount = 0;

          for (const item of items) {
            let docData: any = {};
            let docId = item.id;

            // Handle SQLite stringified data format if present
            if (item.data && typeof item.data === 'string') {
              try {
                docData = JSON.parse(item.data);
              } catch {
                docData = { ...item };
              }
            } else {
              docData = { ...item };
            }

            if (!docId) {
              docId = docData.id || doc(collection(db, collName)).id;
            }
            delete docData.id;

            const docRef = doc(db, collName, docId);
            batch.set(docRef, docData, { merge: true });
            batchCount++;
            importedCount++;

            if (batchCount >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }
        }
      } catch (fsErr) {
        console.warn('Direct Firestore import error (will try local server):', fsErr);
      }

      // 2. Also forward to local backend SQLite server if available
      try {
        await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        });
      } catch {
        // Backend server may be offline or on Vercel, which is fine since Firestore handled it
      }

      alert(`Data imported successfully! ${importedCount > 0 ? `${importedCount} records loaded.` : ''}`);
      window.location.reload();
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Error importing data: ' + (error?.message || 'Invalid JSON file'));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Personalize your experience and manage clinic data.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Data Management Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Database className="h-5 w-5 text-indigo-600" />
            <h2>Data Management</h2>
          </div>
          <Card className="p-6 dark:bg-slate-900 dark:border-slate-800">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">Export Data</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Download a complete backup of all clinic records, including patients, visits, appointments, and counseling tracks.
                </p>
                <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isExporting ? 'Exporting...' : 'Export JSON Backup'}
                </Button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">Import Data</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Restore or merge data from a previously exported JSON backup file. All records will be imported into your clinic registry.
                </p>
                <div className="relative inline-block">
                  <input 
                    type="file" 
                    accept=".json" 
                    disabled={isImporting}
                    onChange={handleImport} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    title="Choose backup file"
                  />
                  <Button variant="outline" disabled={isImporting} className="gap-2 w-auto pointer-events-none">
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isImporting ? 'Importing...' : 'Import from JSON'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

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
                <span className="text-slate-500 dark:text-slate-400">Designed by</span>
                <span className="font-medium text-slate-900 dark:text-white uppercase tracking-wider">Tizzitech Team</span>
              </div>
            </div>
          </Card>
        </section>

        <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} OTZ Clinic Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
