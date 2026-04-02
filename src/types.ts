/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LtfuStatus = 'Active' | 'LTFU' | 'Dead' | 'Transferred Out';

export interface Patient {
  id: string;
  clinicNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  dateOfBirth?: string;
  gender: 'Male' | 'Female';
  phone?: string;
  address?: string;
  enrollmentDate: string;
  ltfuStatus: LtfuStatus;
  lastVisitDate?: string;
  nextAppointmentDate?: string;
  vlSuppressed?: boolean;
  lastVlDate?: string;
  lastVlResult?: number;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  type: 'Drug Pickup & VL Test' | 'Drug Pickup (Proxy)' | 'Clinical Review' | 'Counselling' | 'Other';
  notes?: string;
  vlResult?: number;
  nextAppointmentDate?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  clinicNumber: string;
  phone?: string;
  date: string;
  status: 'Pending' | 'Completed' | 'Missed';
}

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  ltfuPatients: number;
  suppressedPatients: number;
  pendingVl: number;
  upcomingVisits: number;
}
