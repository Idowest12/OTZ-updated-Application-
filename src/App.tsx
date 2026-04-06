/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sidebar, View } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PatientList } from './components/PatientList';
import { AppointmentCalendar } from './components/AppointmentCalendar';
import { Reports } from './components/Reports';
import { ViralLoadManager } from './components/ViralLoadManager';
import { AdminPanel } from './components/AdminPanel';
import { Modal } from './components/ui/Modal';
import { PatientForm } from './components/PatientForm';
import { VisitForm } from './components/VisitForm';
import { PatientDetails } from './components/PatientDetails';
import { TransferForm } from './components/TransferForm';
import { Patient, Visit, CounselingTrack } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './contexts/AuthContext';
import { Button } from './components/ui/Button';
import { Activity } from 'lucide-react';
import { 
  subscribeToPatients, 
  addPatient, 
  bulkAddPatients,
  updatePatient, 
  deletePatient,
  addVisit, 
  subscribeToAppointments,
  updateAppointmentStatus,
  subscribeToAllVisits,
  subscribeToCounselingTracks
} from './services/firestoreService';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>();
  const [selectedVisitType, setSelectedVisitType] = useState<string | undefined>();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [counselingTracks, setCounselingTracks] = useState<CounselingTrack[]>([]);

  useEffect(() => {
    if (user) {
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
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Activity className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              OTZ Clinic Management
            </h1>
            <p className="mt-2 text-slate-500">
              Please sign in with your clinic credentials to access the system.
            </p>
          </div>
          <Button onClick={login} className="w-full py-6 text-lg" size="lg">
            Sign in with Google
          </Button>
          <div className="text-center text-xs text-slate-400">
            Secure access for authorized clinic staff only.
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

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailsModalOpen(true);
  };

  const handleRecordVisit = (patient: Patient, type?: string) => {
    setSelectedPatient(patient);
    setSelectedVisitType(type);
    setIsVisitModalOpen(true);
  };

  const handleTransferOut = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (destination: string) => {
    if (!selectedPatient) return;
    try {
      await updatePatient(selectedPatient.id!, { ltfuStatus: 'Transferred Out' });
      await addVisit(selectedPatient.id!, {
        date: new Date().toISOString().split('T')[0],
        type: 'Transfer Out',
        notes: `Client transferred out to ${destination}.`
      });
      setIsTransferModalOpen(false);
      setIsDetailsModalOpen(false);
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
        setIsDetailsModalOpen(false);
      } catch (error) {
        console.error('Error reactivating patient:', error);
      }
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
      await deletePatient(id);
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const handleBulkImport = async (patientsData: Omit<Patient, 'id'>[]) => {
    console.log('App: Received bulk import request for', patientsData.length, 'patients');
    try {
      await bulkAddPatients(patientsData);
      console.log('App: Bulk import completed successfully');
    } catch (error) {
      console.error('App: Error bulk importing patients:', error);
      throw error;
    }
  };

  const handlePatientSubmit = async (data: Partial<Patient>) => {
    try {
      if (selectedPatient?.id) {
        await updatePatient(selectedPatient.id, data);
      } else {
        await addPatient(data);
      }
      setIsPatientModalOpen(false);
    } catch (error) {
      console.error('Error saving patient:', error);
    }
  };

  const handleVisitSubmit = async (data: Partial<Visit>) => {
    try {
      if (selectedPatient?.id) {
        await addVisit(selectedPatient.id, data);
      }
      setIsVisitModalOpen(false);
    } catch (error) {
      console.error('Error saving visit:', error);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard patients={patients} appointments={appointments} visits={visits} tracks={counselingTracks} />;
      case 'patients':
        return (
          <PatientList
            patients={patients}
            onAddPatient={handleAddPatient}
            onEditPatient={handleEditPatient}
            onViewDetails={handleViewDetails}
            onRecordVisit={handleRecordVisit}
            onDeletePatient={handleDeletePatient}
            onBulkImport={handleBulkImport}
            onTransferOut={handleTransferOut}
            onActivate={handleActivate}
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={logout}
      />

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

      <Modal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title={selectedPatient ? 'Edit Patient' : 'Register New Patient'}
        size="xl"
      >
        <PatientForm
          patient={selectedPatient}
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
        {selectedPatient && (
          <VisitForm
            patient={selectedPatient}
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
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Patient Details & Clinical History"
        size="xl"
      >
        {selectedPatient && (
          <PatientDetails
            patient={selectedPatient}
            onClose={() => setIsDetailsModalOpen(false)}
            onEdit={handleEditPatient}
            onRecordVisit={(p) => {
              setIsDetailsModalOpen(false);
              handleRecordVisit(p);
            }}
            onTransferOut={handleTransferOut}
            onActivate={handleActivate}
          />
        )}
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Out Client"
        size="md"
      >
        {selectedPatient && (
          <TransferForm
            patient={selectedPatient}
            onSubmit={handleTransferSubmit}
            onCancel={() => setIsTransferModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
