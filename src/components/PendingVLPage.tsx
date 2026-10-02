import { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Patient } from '../types';
import { updatePatientVL } from '../services/firestoreService';
import { Activity, CheckCircle2, ArrowLeft, Search, Calendar, User, Check, ExternalLink } from 'lucide-react';
import { formatDate } from '../utils';

interface PendingVLPageProps {
  patients: Patient[];
  onBack: () => void;
  onViewPatient?: (patient: Patient) => void;
  onPatientUpdated?: (patientId: string, vlResult: number, date: string) => void;
}

export function PendingVLPage({ patients, onBack, onViewPatient, onPatientUpdated }: PendingVLPageProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successIds, setSuccessIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [vlInputs, setVlInputs] = useState<Record<string, { result: string; date: string }>>({});

  const handleInputChange = (patientId: string, field: 'result' | 'date', value: string) => {
    setVlInputs(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [field]: value,
        date: field === 'date' ? value : (prev[patientId]?.date || new Date().toISOString().split('T')[0])
      }
    }));
  };

  const handleSave = async (patient: Patient) => {
    if (loadingId === patient.id) return; // Prevent double click
    const input = vlInputs[patient.id];
    if (!input || !input.result || !input.date) {
      alert('Please enter both Viral Load result and date.');
      return;
    }

    const vlResult = parseInt(input.result, 10);
    if (isNaN(vlResult) || vlResult < 0) {
      alert('Please enter a valid positive number for Viral Load.');
      return;
    }

    setLoadingId(patient.id);
    try {
      await updatePatientVL(patient.id, vlResult, input.date);
      setSuccessIds(prev => ({ ...prev, [patient.id]: true }));
      
      // Proactively notify parent so App.tsx immediately updates patients state and re-fetches
      if (onPatientUpdated) {
        onPatientUpdated(patient.id, vlResult, input.date);
      }

      // Remove from inputs after successful save
      setVlInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[patient.id];
        return newInputs;
      });
      setTimeout(() => {
        setSuccessIds(prev => {
          const updated = { ...prev };
          delete updated[patient.id];
          return updated;
        });
      }, 3000);
    } catch (error) {
      alert('Failed to update Viral Load. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const query = searchQuery.toLowerCase();
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const clinicNum = (patient.clinicNumber || '').toLowerCase();
    const phone = (patient.phone || '').toLowerCase();
    return fullName.includes(query) || clinicNum.includes(query) || phone.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              Pending Viral Load Entries
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter viral load laboratory results for patients with pending tests. Result updates their profile and clinical history immediately.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
            {patients.length} Awaiting Results
          </span>
        </div>
      </div>

      {/* Search and Helper Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, clinic ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <span>Results will record a completed test and enroll high VL patients in counseling.</span>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredPatients.length === 0 ? (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {searchQuery ? 'No matching patients found' : 'All Viral Load Results Up to Date!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {searchQuery 
                ? `No pending patients matched "${searchQuery}". Try a different search term.` 
                : 'There are currently no active patients with pending viral load entries in the clinic.'}
            </p>
            <Button onClick={onBack} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map(patient => {
            const isSaved = successIds[patient.id];
            const isLoading = loadingId === patient.id;
            const currentInput = vlInputs[patient.id] || { result: '', date: new Date().toISOString().split('T')[0] };

            return (
              <Card
                key={patient.id}
                className="p-5 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Patient Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {patient.firstName} {patient.lastName}
                        </h4>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                          {patient.clinicNumber}
                        </span>
                        {onViewPatient && (
                          <button
                            onClick={() => {
                              const freshPatient = patients.find(p => p.id === patient.id) || patient;
                              onViewPatient(freshPatient);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline cursor-pointer ml-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Client Dashboard
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>Age: <strong className="text-slate-700 dark:text-slate-300">{patient.age}y</strong> / {patient.gender}</span>
                        <span>•</span>
                        <span>Phone: <strong className="text-slate-700 dark:text-slate-300">{patient.phone || 'N/A'}</strong></span>
                        <span>•</span>
                        <span>
                          Last Visit: <strong className="text-slate-700 dark:text-slate-300">{patient.lastVisitDate ? formatDate(patient.lastVisitDate) : 'No visit recorded'}</strong>
                        </span>
                        {patient.lastVlDate && (
                          <>
                            <span>•</span>
                            <span>Previous VL Date: {formatDate(patient.lastVlDate)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input Form Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                    <div className="w-full sm:w-44">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Viral Load (copies/mL)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 20 or 450"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                        value={currentInput.result ?? ''}
                        onChange={(e) => handleInputChange(patient.id, 'result', e.target.value)}
                      />
                    </div>

                    <div className="w-full sm:w-40">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Result / Test Date
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                        value={currentInput.date ?? ''}
                        onChange={(e) => handleInputChange(patient.id, 'date', e.target.value)}
                      />
                    </div>

                    <div className="w-full sm:w-auto pt-4 sm:pt-4">
                      <Button
                        onClick={() => handleSave(patient)}
                        disabled={isLoading || !currentInput.result}
                        className={`w-full sm:w-auto shrink-0 gap-1.5 transition-all ${
                          isSaved ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                        }`}
                      >
                        {isLoading ? (
                          'Saving...'
                        ) : isSaved ? (
                          <>
                            <Check className="h-4 w-4" />
                            Saved
                          </>
                        ) : (
                          'Save Result'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
