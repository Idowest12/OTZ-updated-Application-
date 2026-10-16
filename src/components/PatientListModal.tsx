import { Modal } from './ui/Modal';
import { Patient } from '../types';
import { Users, ExternalLink } from 'lucide-react';

interface PatientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  patients: Patient[];
  onSelectPatient?: (patient: Patient) => void;
}

export function PatientListModal({ isOpen, onClose, title, patients, onSelectPatient }: PatientListModalProps) {
  const handleSelect = (patient: Patient) => {
    if (onSelectPatient) {
      // Direct navigation to client dashboard:
      // Note: Do not call onClose() here because onClose calls history.back(),
      // which races and cancels the view navigation to the patient's dashboard!
      onSelectPatient(patient);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
          <Users className="h-6 w-6 shrink-0 text-indigo-500" />
          <p className="text-sm font-medium">
            Showing {patients.length} patient{patients.length !== 1 ? 's' : ''} in this category. Click any record or "View Dashboard" to open their clinical history.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
          {patients.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">No patients found in this category.</p>
          ) : (
            patients.map(patient => (
              <div 
                key={patient.id} 
                onClick={() => handleSelect(patient)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/80 transition-all ${
                  onSelectPatient ? 'cursor-pointer hover:shadow-xs' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      {patient.firstName} {patient.lastName}
                    </h4>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{patient.clinicNumber}</span>
                    <span>•</span>
                    <span>Age: {patient.age}</span>
                    <span>•</span>
                    <span>Gender: {patient.gender}</span>
                    <span>•</span>
                    <span className="font-medium">{patient.ltfuStatus}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Last Visit: {patient.lastVisitDate ? new Date(patient.lastVisitDate).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enrolled: {new Date(patient.enrollmentDate).toLocaleDateString()}
                    </p>
                  </div>
                  {onSelectPatient && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(patient);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 transition-colors cursor-pointer shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Dashboard
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
