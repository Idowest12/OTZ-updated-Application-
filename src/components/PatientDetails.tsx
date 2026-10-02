/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Patient, Visit, Appointment } from '../types';
import { formatDate, cn } from '../utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { subscribeToVisits, getPatientVisits } from '../services/firestoreService';
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
  FileText,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

interface PatientDetailsProps {
  patient: Patient;
  appointments?: Appointment[];
  onClose: () => void;
  onEdit: (patient: Patient) => void;
  onRecordVisit: (patient: Patient) => void;
  onScheduleAppointment?: (patient: Patient) => void;
  onTransferOut: (patient: Patient) => void;
  onActivate: (patient: Patient) => void;
  backLabel?: string;
}

export function PatientDetails({ patient, appointments = [], onClose, onEdit, onRecordVisit, onScheduleAppointment, onTransferOut, onActivate, backLabel }: PatientDetailsProps) {
  const { isAdmin } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getPatientVisits(patient.id).then((data) => {
      if (isMounted) {
        setVisits(data as Visit[]);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    const unsubscribe = subscribeToVisits(patient.id, (data) => {
      if (isMounted) {
        setVisits(data as Visit[]);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [patient.id]);

  const displayVisits = useMemo(() => {
    const list = [...visits];
    const patientVL = patient.viralLoadResult ?? patient.lastVlResult;
    if (patient.lastVlDate && patientVL !== undefined && patientVL !== null) {
      const exists = list.some(v => v.date === patient.lastVlDate && v.vlResult !== undefined && v.vlResult !== null);
      if (!exists) {
        list.unshift({
          id: `recorded-${patient.id}-${patient.lastVlDate}`,
          patientId: patient.id,
          date: patient.lastVlDate,
          type: 'Drug Pickup & VL Test',
          vlResult: patientVL,
          notes: `Viral Load Result: ${patientVL} c/mL (Confirmed Record)`
        });
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visits, patient.id, patient.lastVlDate, patient.lastVlResult, patient.viralLoadResult]);

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
      {/* Top Breadcrumb & Back Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel || 'Back to Patients'}
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Patients</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {patient.firstName} {patient.lastName}
            </span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {patient.clinicNumber}
            </span>
          </div>
        </div>
      </div>
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
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <p className="text-sm font-medium text-slate-500">
                    MH NO: {patient.clinicNumber}
                  </p>
                  {(patient.viralLoadResult !== undefined || patient.lastVlResult !== undefined) && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      ((patient.viralLoadResult ?? patient.lastVlResult) ?? 0) < 50
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    )}>
                      Latest VL: {patient.viralLoadResult ?? patient.lastVlResult} c/ml 
                      {patient.lastVlDate ? ` (${formatDate(patient.lastVlDate)})` : ''}
                    </span>
                  )}
                </div>
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
              {onScheduleAppointment && (
                <Button variant="outline" size="sm" onClick={() => onScheduleAppointment(patient)}>
                  Schedule Appointment
                </Button>
              )}
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
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">OTZ Enrollment Date</p>
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
                <span className="text-sm text-slate-600">ART STATUS</span>
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
                    {patient.vlSuppressed ? 'Suppressed (<50)' : 'Unsuppressed (≥50)'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No Record</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Latest Viral Load</span>
                {(patient.viralLoadResult !== undefined || patient.lastVlResult !== undefined) ? (
                  <span className={cn(
                    "text-xs font-bold",
                    ((patient.viralLoadResult ?? patient.lastVlResult) ?? 0) < 50 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {(patient.viralLoadResult ?? patient.lastVlResult)} copies/mL
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Pending / No Record</span>
                )}
              </div>
              {patient.lastVlDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">VL Test Date</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {formatDate(patient.lastVlDate)}
                  </span>
                </div>
              )}
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
      {appointments.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 p-6 bg-indigo-50/50">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Upcoming Appointments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                      {formatDate(apt.date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        {apt.type || 'Clinic Visit'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        apt.status === 'Completed' ? "bg-emerald-50 text-emerald-700" :
                        apt.status === 'Missed' ? "bg-rose-50 text-rose-700" :
                        "bg-amber-50 text-amber-700"
                      )}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      Loading history...
                    </div>
                  </td>
                </tr>
              ) : displayVisits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      No clinical history found for this patient.
                    </div>
                  </td>
                </tr>
              ) : (
                displayVisits.map((visit) => (
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
