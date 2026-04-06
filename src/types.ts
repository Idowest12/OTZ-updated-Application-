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
  nextCounselingDate?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  clinicNumber: string;
  phone?: string;
  date: string;
  type?: 'Clinic Visit' | 'Counseling';
  status: 'Pending' | 'Completed' | 'Missed';
}

export interface CounselingSession {
  date?: string;
  status: 'Pending' | 'Completed';
  notes?: string;
}

export interface CounselingTrack {
  id?: string;
  patientId: string;
  patientName: string;
  clinicNumber: string;
  startDate: string;
  vlResult: number;
  session1: CounselingSession; // 1st Online
  session2: CounselingSession; // 2nd Online
  session3: CounselingSession; // Final Clinic (at next visit)
  completed: boolean;
  completionDate?: string;
  nextCounselingDate?: string;
}

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  ltfuPatients: number;
  suppressedPatients: number;
  pendingVl: number;
  upcomingVisits: number;
}
