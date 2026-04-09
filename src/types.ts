/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LtfuStatus = 'Active' | 'LTFU' | 'Dead' | 'Transferred Out' | 'Graduated';

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
  createdAt?: any; // Firestore Timestamp
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  type: 'Drug Pickup & VL Test' | 'Drug Pickup (Proxy)' | 'Clinical Review' | 'Counselling' | 'Other' | 'Transfer Out' | 'Reactivation';
  notes?: string;
  vlResult?: number;
  nextAppointmentDate?: string;
  nextCounselingDate?: string;
  createdAt?: any; // Firestore Timestamp
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

export interface ActivityLog {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: any; // Firestore Timestamp
  type: 'Patient' | 'Visit' | 'Counseling' | 'System';
}

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  ltfuPatients: number;
  graduatedPatients: number;
  transferredOutPatients: number;
  deadPatients: number;
  suppressedPatients: number;
  pendingVl: number;
  upcomingVisits: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'staff';
  lastLogin: string;
  createdAt: string;
}
