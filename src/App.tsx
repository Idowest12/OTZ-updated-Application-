/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar, View } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PatientList } from './components/PatientList';
import { AppointmentCalendar } from './components/AppointmentCalendar';
import { Reports } from './components/Reports';
import { ViralLoadManager } from './components/ViralLoadManager';
import { AdminPanel } from './components/AdminPanel';
import { Settings } from './components/Settings';
import { Modal } from './components/ui/Modal';
import { PatientForm } from './components/PatientForm';
import { VisitForm } from './components/VisitForm';
import { PatientDetails } from './components/PatientDetails';
import { PendingVLPage } from './components/PendingVLPage';
import { TransferForm } from './components/TransferForm';
import { AppointmentForm } from './components/AppointmentForm';
import { Patient, Visit, CounselingTrack, Appointment } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { Button } from './components/ui/Button';
import { Activity, Eye, EyeOff, ShieldCheck, UserCheck, Lock } from 'lucide-react';
import { cn } from './utils';
import { 
  subscribeToPatients, 
  getPatients,
  addPatient, 
  bulkAddPatients,
  updatePatient, 
  deletePatient,
  addVisit, 
  getAllVisits,
  subscribeToAppointments,
  updateAppointmentStatus,
  addAppointment,
  subscribeToAllVisits,
  subscribeToCounselingTracks
} from './services/firestoreService';

export default function App() {
  const { 
    user, 
    isAdmin,
    loading, 
    isAuthenticating, 
    loginWithGoogle, 
    loginWithEmail, 
    signUpWithEmail, 
    logout 
  } = useAuth();
  const { privacyMode, togglePrivacyMode } = useSettings();
  
  const [authTab, setAuthTab] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [previousView, setPreviousView] = useState<View>('patients');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>();
  const [selectedVisitType, setSelectedVisitType] = useState<string | undefined>();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [counselingTracks, setCounselingTracks] = useState<CounselingTrack[]>([]);

  const inFlightVisitSubmissions = useRef<Set<string>>(new Set());
  const inFlightAppointmentSubmissions = useRef<Set<string>>(new Set());

  const activeSelectedPatient = useMemo(() => {
    if (!selectedPatient) return undefined;
    return patients.find((p) => p.id === selectedPatient.id) || selectedPatient;
  }, [patients, selectedPatient]);

  useEffect(() => {
    if (user) {
      // Immediate direct fetch so state is populated instantly
      getPatients().then((data) => {
        if (data && data.length > 0) setPatients(data);
      }).catch(() => {});
      getAllVisits().then((data) => {
        if (data && data.length > 0) setVisits(data);
      }).catch(() => {});

      const unsubscribePatients = subscribeToPatients((data) => {
        setPatients(data as Patient[]);
      });
      const unsubscribeAppointments = subscribeToAppointments((data) => {
        setAppointments(data);
      });
      const unsubscribeVisits = subscribeToAllVisits((data) => {
        setVisits(data as Visit[]);
      });
      const unsubscribeCounseling = subscribeToCounselingTracks((data) => {
        setCounselingTracks(data as CounselingTrack[]);
      });

      return () => {
        unsubscribePatients();
        unsubscribeAppointments();
        unsubscribeVisits();
        unsubscribeCounseling();
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading OTZ Clinic System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Activity className="h-10 w-10 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              OTZ CLUB
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Adolescent & Youth One-Stop Clinic Registry
            </p>
          </div>

          {/* Authentication tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => {
                setAuthTab('google');
                setAuthError(null);
              }}
              className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                authTab === 'google'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Sign-In
            </button>
            <button
              onClick={() => {
                setAuthTab('email');
                setAuthError(null);
              }}
              className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                authTab === 'email'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email & Password
            </button>
          </div>

          {authError && (
            <div className="rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
              {authError}
            </div>
          )}

          {authTab === 'google' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Seamless sign-in with your Google account.
              </p>
              
              <Button
                type="button"
                disabled={isAuthenticating}
                onClick={async () => {
                  try {
                    setAuthError(null);
                    await loginWithGoogle();
                  } catch (err: any) {
                    const msg = err.message || '';
                    if (msg.includes('popup-blocked')) {
                      setAuthError('Popup blocked by your browser. Please enable popups, use the Email option, or open in a new tab.');
                    } else if (msg.includes('cancelled-popup-request')) {
                      setAuthError('Sign-in cancelled or popup was closed. Please try again.');
                    } else {
                      setAuthError(err.message || 'Google authentication failed.');
                    }
                  }
                }}
                className="w-full py-6 text-base flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl shadow-sm transition duration-150 disabled:opacity-50"
                size="lg"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isAuthenticating ? 'Signing In...' : 'Sign In with Google'}
              </Button>

              {isIframe && (
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                  <p className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                    💡 Running inside preview frame
                  </p>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Google Sign-In requires popups, which are often blocked in preview iframes. If nothing opens, we recommend opening the app in a new tab:
                  </p>
                  <Button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Open in New Tab ↗
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError(null);
                try {
                  if (isSignUp) {
                    if (!displayName.trim()) {
                      setAuthError('Display name is required for registration.');
                      return;
                    }
                    await signUpWithEmail(email, password, displayName);
                  } else {
                    await loginWithEmail(email, password);
                  }
                } catch (err: any) {
                  setAuthError(err.message || 'Authentication failed. Please check credentials.');
                }
              }}
              className="space-y-4"
            >
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@otzclinic.com"
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <Button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3.5 text-base font-semibold rounded-xl shadow-md transition duration-150 disabled:opacity-50"
              >
                {isAuthenticating ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>

              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError(null);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>

                {!isSignUp && (
                  <div className="text-[11px] text-slate-500 text-center leading-relaxed max-w-[280px]">
                    💡 Default credentials: <br />
                    <span className="font-semibold text-slate-700">admin@otzclinic.com</span> with password <span className="font-semibold text-slate-700">admin123456</span>
                  </div>
                )}
              </div>
            </form>
          )}

          <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
            Authorized clinic staff & youth administrators only.
          </div>
        </div>
      </div>
    );
  }

  const handleAddPatient = () => {
    setSelectedPatient(undefined);
    setIsPatientModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsPatientModalOpen(true);
  };

  const handleViewDetails = (patient: Patient, fromView: View = currentView) => {
    // Look up the freshest record from patients state to guarantee latest VL and visit info
    const latestPatient = patients.find(p => p.id === patient.id) || patient;
    setSelectedPatient(latestPatient);
    setPreviousView(fromView);
    setCurrentView('patient-details');
  };

  const handleRecordVisit = (patient: Patient, type?: string) => {
    const latestPatient = patients.find(p => p.id === patient.id) || patient;
    setSelectedPatient(latestPatient);
    setSelectedVisitType(type);
    setIsVisitModalOpen(true);
  };

  const handleScheduleAppointment = (patient: Patient) => {
    const latestPatient = patients.find(p => p.id === patient.id) || patient;
    setSelectedPatient(latestPatient);
    setIsAppointmentModalOpen(true);
  };

  const handleTransferOut = (patient: Patient) => {
    const latestPatient = patients.find(p => p.id === patient.id) || patient;
    setSelectedPatient(latestPatient);
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (destination: string) => {
    if (!activeSelectedPatient) return;
    try {
      await updatePatient(activeSelectedPatient.id!, { ltfuStatus: 'Transferred Out' });
      await addVisit(activeSelectedPatient.id!, {
        date: new Date().toISOString().split('T')[0],
        type: 'Transfer Out',
        notes: `Client transferred out to ${destination}.`
      });
      setIsTransferModalOpen(false);
      // Re-fetch patients
      const fresh = await getPatients();
      if (fresh.length > 0) setPatients(fresh);
    } catch (error) {
      console.error('Error transferring out patient:', error);
    }
  };

  const handleActivate = async (patient: Patient) => {
    if (window.confirm(`Are you sure you want to reactivate ${patient.firstName} ${patient.lastName}?`)) {
      try {
        await updatePatient(patient.id!, { ltfuStatus: 'Active' });
        await addVisit(patient.id!, {
          date: new Date().toISOString().split('T')[0],
          type: 'Reactivation',
          notes: 'Client reactivated and returned to care.'
        });
        // Re-fetch patients
        const fresh = await getPatients();
        if (fresh.length > 0) setPatients(fresh);
      } catch (error) {
        console.error('Error reactivating patient:', error);
      }
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
      await deletePatient(id);
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const handleBulkImport = async (patientsData: Omit<Patient, 'id'>[]) => {
    console.log('App: Received bulk import request for', patientsData.length, 'patients');
    try {
      await bulkAddPatients(patientsData);
      console.log('App: Bulk import completed successfully');
      const fresh = await getPatients();
      if (fresh.length > 0) setPatients(fresh);
    } catch (error) {
      console.error('App: Error bulk importing patients:', error);
      throw error;
    }
  };

  const handlePatientSubmit = async (data: Partial<Patient>) => {
    try {
      if (selectedPatient?.id) {
        await updatePatient(selectedPatient.id, data);
        setSelectedPatient(prev => prev ? ({ ...prev, ...data } as Patient) : undefined);
      } else {
        await addPatient(data);
      }
      setIsPatientModalOpen(false);
      const fresh = await getPatients();
      if (fresh.length > 0) setPatients(fresh);
    } catch (error: any) {
      console.error('Error saving patient:', error);
      if (error?.message?.includes('DUPLICATE_CLINIC_NUMBER')) {
        alert(error.message.replace('DUPLICATE_CLINIC_NUMBER: ', ''));
      } else {
        alert('Failed to save patient record. Please check the details and try again.');
      }
    }
  };

  const handlePatientVLUpdate = async (patientId: string, vlResult: number, vlDate: string) => {
    // 1. Immediate optimistic update so UI reacts instantly without delay
    setPatients(prevPatients => prevPatients.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        lastVlResult: vlResult,
        viralLoadResult: vlResult,
        lastVlDate: vlDate,
        vlSuppressed: vlResult < 50,
      };
    }));

    // 2. Fresh re-fetch from Firestore to synchronize with database
    try {
      const [freshPatients, freshVisits] = await Promise.all([
        getPatients(),
        getAllVisits()
      ]);
      if (freshPatients && freshPatients.length > 0) {
        setPatients(freshPatients);
        setSelectedPatient(prev => {
          if (!prev) return undefined;
          return freshPatients.find(p => p.id === prev.id) || prev;
        });
      }
      if (freshVisits && freshVisits.length > 0) {
        setVisits(freshVisits);
      }
    } catch (err) {
      console.warn('Re-fetch warning after VL update:', err);
    }
  };

  const handleVisitSubmit = async (data: Partial<Visit>) => {
    if (!selectedPatient?.id) return;
    const patientId = selectedPatient.id;

    // Idempotency lock to prevent double-click submissions
    if (inFlightVisitSubmissions.current.has(patientId)) {
      console.warn('Duplicate visit submission prevented for patient:', patientId);
      return;
    }
    inFlightVisitSubmissions.current.add(patientId);

    try {
      const rawVl = data.vlResult as any;
      const vlResultSafe = rawVl !== undefined && rawVl !== null && rawVl !== '' 
        ? Number(rawVl) 
        : undefined;
      const hasVlResult = vlResultSafe !== undefined && !isNaN(vlResultSafe);

      // 1. Immediately and optimistically update patients state so pending VL status and dashboard update right away
      setPatients(prevPatients => prevPatients.map(p => {
        if (p.id !== patientId) return p;
        const updated = {
          ...p,
          lastVisitDate: data.date || p.lastVisitDate,
          nextAppointmentDate: data.nextAppointmentDate || p.nextAppointmentDate,
          updatedAt: new Date()
        };
        if (hasVlResult) {
          updated.lastVlResult = vlResultSafe;
          updated.viralLoadResult = vlResultSafe;
          updated.lastVlDate = data.date;
          updated.vlSuppressed = vlResultSafe < 50;
        } else if (data.type === 'Drug Pickup & VL Test') {
          updated.lastVlResult = undefined;
          updated.viralLoadResult = undefined;
          updated.lastVlDate = undefined;
          updated.vlSuppressed = undefined;
        }
        return updated;
      }));

      // 2. Commit to Firestore (with atomic batch & service-level idempotency)
      await addVisit(patientId, data);

      // 3. Immediately re-fetch fresh patients & visits from Firestore
      try {
        const [freshPatients, freshVisits] = await Promise.all([
          getPatients(),
          getAllVisits()
        ]);
        if (freshPatients && freshPatients.length > 0) {
          setPatients(freshPatients);
          setSelectedPatient(prev => {
            if (!prev) return undefined;
            return freshPatients.find(p => p.id === prev.id) || prev;
          });
        }
        if (freshVisits && freshVisits.length > 0) {
          setVisits(freshVisits);
        }
      } catch (refetchErr) {
        console.warn('Could not re-fetch after visit submit:', refetchErr);
      }

      setIsVisitModalOpen(false);
    } catch (error) {
      console.error('Error saving visit:', error);
      alert('Failed to save visit record. Please try again.');
    } finally {
      inFlightVisitSubmissions.current.delete(patientId);
    }
  };

  const handleAppointmentSubmit = async (date: string, type: 'Clinic Visit' | 'Counseling') => {
    if (!selectedPatient?.id) return;
    const lockKey = `${selectedPatient.id}-${date}-${type}`;

    // Idempotency lock to prevent double-click submissions
    if (inFlightAppointmentSubmissions.current.has(lockKey)) {
      console.warn('Duplicate appointment submission prevented for key:', lockKey);
      return;
    }
    inFlightAppointmentSubmissions.current.add(lockKey);

    try {
      await addAppointment({
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        clinicNumber: selectedPatient.clinicNumber,
        phone: selectedPatient.phone || '',
        date,
        type,
        status: 'Pending'
      });
      await updatePatient(selectedPatient.id, { nextAppointmentDate: date });
      
      // Update local patients state immediately
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, nextAppointmentDate: date } : p));
      
      // Trigger fresh fetch
      getPatients().then(fresh => {
        if (fresh.length > 0) setPatients(fresh);
      }).catch(() => {});

      setIsAppointmentModalOpen(false);
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      alert('Failed to schedule appointment. Please try again.');
    } finally {
      inFlightAppointmentSubmissions.current.delete(lockKey);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            patients={patients} 
            appointments={appointments} 
            visits={visits} 
            tracks={counselingTracks}
            onNavigate={setCurrentView}
            onSelectPatient={(p) => handleViewDetails(p, 'dashboard')}
          />
        );
      case 'patients':
        return (
          <PatientList
            patients={patients}
            appointments={appointments}
            onAddPatient={handleAddPatient}
            onEditPatient={handleEditPatient}
            onViewDetails={(p) => handleViewDetails(p, 'patients')}
            onRecordVisit={handleRecordVisit}
            onDeletePatient={handleDeletePatient}
            onBulkImport={handleBulkImport}
            onTransferOut={handleTransferOut}
            onActivate={handleActivate}
          />
        );
      case 'patient-details':
        if (!activeSelectedPatient) {
          return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-500 mb-4">No client record selected.</p>
              <Button onClick={() => setCurrentView('patients')}>Back to Patients</Button>
            </div>
          );
        }
        return (
          <PatientDetails
            patient={activeSelectedPatient}
            appointments={appointments.filter(a => a.patientId === activeSelectedPatient.id)}
            onClose={() => setCurrentView(previousView === 'patient-details' ? 'patients' : previousView)}
            backLabel={previousView === 'dashboard' ? 'Back to Dashboard' : previousView === 'pending-vl' ? 'Back to Pending VL' : 'Back to Patients'}
            onEdit={handleEditPatient}
            onRecordVisit={(p) => handleRecordVisit(p)}
            onScheduleAppointment={(p) => handleScheduleAppointment(p)}
            onTransferOut={handleTransferOut}
            onActivate={handleActivate}
          />
        );
      case 'pending-vl':
        return (
          <PendingVLPage
            patients={patients.filter(p => 
              p.ltfuStatus === 'Active' && 
              (
                (p.lastVlResult === undefined && p.viralLoadResult === undefined) || 
                (p.lastVlResult === null && p.viralLoadResult === null) || 
                p.vlSuppressed === undefined || 
                p.vlSuppressed === null
              )
            )}
            onBack={() => setCurrentView('dashboard')}
            onViewPatient={(p) => handleViewDetails(p, 'pending-vl')}
            onPatientUpdated={handlePatientVLUpdate}
          />
        );
      case 'appointments':
        return <AppointmentCalendar appointments={appointments} onUpdateStatus={updateAppointmentStatus} />;
      case 'viral-load':
        return (
          <ViralLoadManager 
            patients={patients} 
            tracks={counselingTracks} 
            onRecordVl={handleRecordVisit} 
          />
        );
      case 'reports':
        return <Reports patients={patients} visits={visits} tracks={counselingTracks} />;
      case 'admin':
        return <AdminPanel />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900">Coming Soon</h2>
              <p className="text-slate-500">This view is currently under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={logout}
        appointments={appointments}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-8 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              {currentView === 'patient-details'
                ? 'Client Dashboard & Clinical History'
                : currentView === 'pending-vl'
                ? 'Pending Viral Load Entries'
                : currentView.replace('-', ' ')}
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Superuser Mode (Full Access Across Departments)
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Privacy Mode Toggle */}
            <button
              onClick={togglePrivacyMode}
              title="Toggle Privacy Mode to mask patient names, phone numbers, and IDs on public screens"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 border shadow-2xs cursor-pointer",
                privacyMode
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/70"
              )}
            >
              {privacyMode ? (
                <>
                  <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Privacy Mode: ON (PII Masked)</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Privacy Mode: OFF</span>
                </>
              )}
            </button>

            {/* User identity info */}
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {user?.displayName || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {user?.role?.toUpperCase() || (isAdmin ? 'ADMIN' : 'STAFF')}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Modal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title={activeSelectedPatient ? 'Edit Patient' : 'Register New Patient'}
        size="xl"
      >
        <PatientForm
          patient={activeSelectedPatient}
          onSubmit={handlePatientSubmit}
          onCancel={() => setIsPatientModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setSelectedVisitType(undefined);
        }}
        title="Record Clinic Visit"
        size="xl"
      >
        {activeSelectedPatient && (
          <VisitForm
            patient={activeSelectedPatient}
            initialType={selectedVisitType}
            onSubmit={handleVisitSubmit}
            onCancel={() => {
              setIsVisitModalOpen(false);
              setSelectedVisitType(undefined);
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        title="Schedule Appointment"
        size="md"
      >
        {activeSelectedPatient && (
          <AppointmentForm
            patient={activeSelectedPatient}
            onSubmit={handleAppointmentSubmit}
            onCancel={() => setIsAppointmentModalOpen(false)}
          />
        )}
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Out Client"
        size="md"
      >
        {activeSelectedPatient && (
          <TransferForm
            patient={activeSelectedPatient}
            onSubmit={handleTransferSubmit}
            onCancel={() => setIsTransferModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
