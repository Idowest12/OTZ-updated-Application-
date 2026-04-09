import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Patient } from '../types';
import { updatePatientVL } from '../services/firestoreService';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface PendingVLModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
}

export function PendingVLModal({ isOpen, onClose, patients }: PendingVLModalProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
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
      // Remove from inputs after successful save
      setVlInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[patient.id];
        return newInputs;
      });
    } catch (error) {
      alert('Failed to update Viral Load. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pending Viral Load Entries" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
          <Activity className="h-6 w-6 shrink-0" />
          <p className="text-sm font-medium">
            These patients have visited the clinic but do not have a Viral Load result recorded. Enter their results below to update their profiles directly.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
          {patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">All caught up!</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">No patients are currently missing viral load entries.</p>
            </div>
          ) : (
            patients.map(patient => (
              <div key={patient.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {patient.firstName} {patient.lastName}
                  </h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{patient.clinicNumber}</span>
                    <span>•</span>
                    <span>Last Visit: {patient.lastVisitDate ? new Date(patient.lastVisitDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <div className="w-full sm:w-32">
                    <input
                      type="number"
                      placeholder="VL (copies/mL)"
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                      value={vlInputs[patient.id]?.result || ''}
                      onChange={(e) => handleInputChange(patient.id, 'result', e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <input
                      type="date"
                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                      value={vlInputs[patient.id]?.date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleInputChange(patient.id, 'date', e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => handleSave(patient)}
                    disabled={loadingId === patient.id || !vlInputs[patient.id]?.result}
                    className="w-full sm:w-auto shrink-0"
                  >
                    {loadingId === patient.id ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
