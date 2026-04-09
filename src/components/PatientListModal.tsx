import { Modal } from './ui/Modal';
import { Patient } from '../types';
import { Users } from 'lucide-react';

interface PatientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  patients: Patient[];
}

export function PatientListModal({ isOpen, onClose, title, patients }: PatientListModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
          <Users className="h-6 w-6 shrink-0 text-indigo-500" />
          <p className="text-sm font-medium">
            Showing {patients.length} patient{patients.length !== 1 ? 's' : ''} in this category.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
          {patients.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">No patients found in this category.</p>
          ) : (
            patients.map(patient => (
              <div key={patient.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {patient.firstName} {patient.lastName}
                  </h4>
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
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last Visit: {patient.lastVisitDate ? new Date(patient.lastVisitDate).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enrolled: {new Date(patient.enrollmentDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
