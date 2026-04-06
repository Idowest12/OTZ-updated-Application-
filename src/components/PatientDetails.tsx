/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Patient, Visit } from '../types';
import { formatDate, cn } from '../utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { subscribeToVisits } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  History,
  ArrowRightLeft,
  GraduationCap,
  FileText
} from 'lucide-react';

interface PatientDetailsProps {
  patient: Patient;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
  onRecordVisit: (patient: Patient) => void;
  onTransferOut: (patient: Patient) => void;
  onActivate: (patient: Patient) => void;
}

export function PatientDetails({ patient, onClose, onEdit, onRecordVisit, onTransferOut, onActivate }: PatientDetailsProps) {
  const { isAdmin } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToVisits(patient.id, (data) => {
      setVisits(data as Visit[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [patient.id]);

  const isEditable = (createdAt?: any) => {
    if (isAdmin) return true;
    if (!createdAt) return true; 
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 48;
  };

  const isAboutToGraduate = patient.age >= 24;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="flex-1 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {patient.firstName} {patient.lastName}
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  Clinic No: {patient.clinicNumber}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(patient)}
                disabled={!isEditable(patient.createdAt)}
                title={isEditable(patient.createdAt) ? "Edit Profile" : "Edit locked (48h passed)"}
              >
                Edit Profile
              </Button>
              <Button size="sm" onClick={() => onRecordVisit(patient)}>
                Record Visit
              </Button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Age / Gender</p>
                <p className="font-medium">{patient.age} years / {patient.gender}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Phone Number</p>
                <p className="font-medium">{patient.phone || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Address</p>
                <p className="font-medium">{patient.address || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <Clock className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Enrolled Since</p>
                <p className="font-medium">{formatDate(patient.enrollmentDate)}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4 lg:w-80">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Current Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Clinic Status</span>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold",
                  patient.ltfuStatus === 'Active' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                )}>
                  {patient.ltfuStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">VL Status</span>
                {patient.vlSuppressed !== undefined ? (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-bold",
                    patient.vlSuppressed ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {patient.vlSuppressed ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {patient.vlSuppressed ? 'Suppressed' : 'Unsuppressed'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No Record</span>
                )}
              </div>
              {isAboutToGraduate && patient.ltfuStatus === 'Active' && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-700">
                  <GraduationCap className="h-5 w-5" />
                  <span className="text-xs font-bold">About to Graduate (Age {patient.age})</span>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <Button 
                variant="outline" 
                className="w-full gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-100"
                onClick={() => onTransferOut(patient)}
                disabled={patient.ltfuStatus === 'Transferred Out'}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Out Client
              </Button>

              {patient.ltfuStatus !== 'Active' && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-100"
                  onClick={() => onActivate(patient)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Reactivate Client
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* History Section */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 p-6">
          <History className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-900">Clinical History</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Visit Type</th>
                <th className="px-6 py-4">VL Result</th>
                <th className="px-6 py-4">Next Appointment</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      Loading history...
                    </div>
                  </td>
                </tr>
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      No clinical history found for this patient.
                    </div>
                  </td>
                </tr>
              ) : (
                visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                      {formatDate(visit.date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        {visit.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {visit.vlResult !== undefined ? (
                        <span className={cn(
                          "font-bold",
                          visit.vlResult < 50 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {visit.vlResult} c/ml
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {formatDate(visit.nextAppointmentDate)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                      {visit.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
