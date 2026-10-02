import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Patient, ActivityLog, UserProfile, Visit } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Activity & Audit Logging Helpers
export async function logAuditTrail(
  action: string,
  resourceType: string,
  resourceId: string,
  details: string
) {
  if (!auth.currentUser) return;
  const path = 'activity_logs';
  try {
    const newDocRef = doc(collection(db, path));
    await setDoc(newDocRef, {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email || 'N/A',
      userName: auth.currentUser.displayName || auth.currentUser.email || 'Unknown User',
      action,
      resourceType,
      resourceId,
      details,
      timestamp: Timestamp.now(),
      type: 'Audit'
    });
  } catch (error) {
    console.warn('Warning: Could not save audit trail entry:', error);
  }
}

export async function logActivity(action: string, details: string, type: ActivityLog['type']) {
  if (!auth.currentUser) return;
  const path = 'activity_logs';
  try {
    const newDocRef = doc(collection(db, path));
    await setDoc(newDocRef, {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email || 'N/A',
      userName: auth.currentUser.displayName || auth.currentUser.email || 'Unknown User',
      action,
      details,
      type,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.warn('Warning: Could not save activity log:', error);
  }
}

export function subscribeToActivityLogs(callback: (logs: ActivityLog[]) => void) {
  const path = 'activity_logs';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
    callback(logs);
  }, (error) => {
    console.warn('Activity logs snapshot warning:', error);
  });
}

export function subscribeToAuditLogs(callback: (logs: ActivityLog[]) => void) {
  const path = 'activity_logs';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(200));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog))
      .filter(doc => doc.type === 'Audit');
    callback(logs);
  }, (error) => {
    console.warn('Audit logs snapshot warning:', error);
  });
}

export async function cleanupOldLogs(days: number = 30) {
  const path = 'activity_logs';
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const q = query(collection(db, path), where('timestamp', '<', Timestamp.fromDate(cutoff)));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    await logActivity('System Cleanup', `Deleted ${snapshot.size} logs older than ${days} days.`, 'System');
    return snapshot.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updatePatientVL(patientId: string, vlResult: number, vlDate: string) {
  const path = 'patients';
  try {
    const patientRef = doc(db, path, patientId);
    const patientSnap = await getDoc(patientRef);
    const patientData = patientSnap.data();
    
    const vlSuppressed = vlResult < 50;
    
    await updateDoc(patientRef, {
      lastVlResult: vlResult,
      viralLoadResult: vlResult,
      lastVlDate: vlDate,
      vlSuppressed: vlSuppressed,
      updatedAt: Timestamp.now()
    });
    
    await logActivity(
      'Viral Load Updated',
      `Updated VL for patient ID: ${patientId} to ${vlResult} copies/mL`,
      'Patient'
    );

    // Save/update in visits collection so Clinical History reflects this test
    try {
      const visitsQuery = query(
        collection(db, 'visits'),
        where('patientId', '==', patientId)
      );
      const visitsSnapshot = await getDocs(visitsQuery);
      
      const existingVisit = visitsSnapshot.docs.find(d => {
        const v = d.data();
        return v.date === vlDate || v.vlResult === undefined || v.vlResult === null;
      });

      if (existingVisit) {
        await updateDoc(existingVisit.ref, {
          vlResult: vlResult,
          updatedAt: Timestamp.now()
        });
      } else {
        const newVisitRef = doc(collection(db, 'visits'));
        await setDoc(newVisitRef, {
          patientId,
          date: vlDate,
          type: 'Drug Pickup & VL Test',
          vlResult: vlResult,
          notes: `Viral Load Result: ${vlResult} c/mL (Entered from Pending VL Entry)`,
          createdAt: Timestamp.now()
        });
      }
    } catch (visitErr) {
      console.warn('Could not update visits collection:', visitErr);
    }

    // If viral load is unsuppressed, enroll in counseling track if not already in one
    if (vlResult >= 50 && patientData) {
      const tracksQuery = query(
        collection(db, 'counseling_tracks'), 
        where('patientId', '==', patientId),
        where('completed', '==', false)
      );
      const tracksSnapshot = await getDocs(tracksQuery);
      
      if (tracksSnapshot.empty) {
        await addCounselingTrack({
          patientId,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          clinicNumber: patientData.clinicNumber,
          startDate: vlDate,
          vlResult: vlResult,
          session1: { status: 'Pending' },
          session2: { status: 'Pending' },
          session3: { status: 'Pending' },
          completed: false,
          nextCounselingDate: null,
        });
      } else {
        const trackId = tracksSnapshot.docs[0].id;
        await updateCounselingTrack(trackId, {
          vlResult: vlResult,
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function graduatePatientsOver25() {
  const path = 'patients';
  try {
    const q = query(collection(db, path), where('ltfuStatus', '==', 'Active'));
    const snapshot = await getDocs(q);
    
    let batch = writeBatch(db);
    let count = 0;
    
    for (const document of snapshot.docs) {
      const patient = document.data() as Patient;
      if (patient.age > 25) {
        batch.update(document.ref, { ltfuStatus: 'Graduated' });
        count++;
        
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    if (count > 0) {
      await logActivity(
        'Patients Graduated',
        `Graduated ${count} patients over the age of 25`,
        'System'
      );
    }
    
    return count;
  } catch (error) {
    console.error('Error graduating patients:', error);
    throw error;
  }
}

export async function clearAllActivityLogs() {
  const path = 'activity_logs';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    
    let batch = writeBatch(db);
    let count = 0;
    
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
      count++;
      if (count === 500) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    
    await logActivity(
      'System Cleanup',
      'Cleared all activity logs',
      'System'
    );
    
    return snapshot.size;
  } catch (error) {
    console.error('Error clearing logs:', error);
    throw error;
  }
}

export async function saveUserProfile(user: any, defaultRole: 'admin' | 'staff' = 'staff') {
  const path = 'users';
  try {
    const userRef = doc(db, path, user.uid);
    const userSnap = await getDoc(userRef);
    
    const now = new Date().toISOString();
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: defaultRole,
        createdAt: now,
        lastLogin: now
      });
    } else {
      await updateDoc(userRef, {
        displayName: user.displayName || userSnap.data().displayName,
        photoURL: user.photoURL || userSnap.data().photoURL,
        lastLogin: now
      });
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const path = 'users';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data() as UserProfile);
    callback(users);
  }, (error) => {
    console.error('Error subscribing to users:', error);
  });
}

export async function updateUserRole(uid: string, newRole: UserProfile['role']) {
  const path = 'users';
  try {
    const userRef = doc(db, path, uid);
    await updateDoc(userRef, { role: newRole });
    await logActivity('System', `Updated user role for ${uid} to ${newRole}`, 'System');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

async function clearCollectionData(collectionName: string, logMessage: string) {
  try {
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    let batch = writeBatch(db);
    let count = 0;
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
      count++;
      if (count === 500) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    await logActivity('System Cleanup', logMessage, 'System');
    return snapshot.size;
  } catch (error) {
    console.error(`Error clearing ${collectionName}:`, error);
    throw error;
  }
}

export const clearAllVisits = () => clearCollectionData('visits', 'Cleared all visit records');
export const clearAllCounseling = () => clearCollectionData('counseling_tracks', 'Cleared all counseling records');
export const clearAllAppointments = () => clearCollectionData('appointments', 'Cleared all appointment records');

export async function wipeAllTestData() {
  const collectionsToClear = ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs'];
  
  try {
    for (const collectionName of collectionsToClear) {
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      
      let batch = writeBatch(db);
      let count = 0;
      
      for (const document of snapshot.docs) {
        batch.delete(document.ref);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }
    
    await logActivity(
      'Factory Reset',
      'Wiped all test data from the system',
      'System'
    );
    
    return true;
  } catch (error) {
    console.error('Error wiping test data:', error);
    throw error;
  }
}

// Patients
export function subscribeToPatients(callback: (patients: any[]) => void) {
  const path = 'patients';
  return onSnapshot(collection(db, path), (snapshot) => {
    const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(patients);
  }, (error) => {
    console.warn('Patients snapshot listener warning:', error);
  });
}

export async function getPatients(): Promise<Patient[]> {
  const path = 'patients';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function getPatient(patientId: string): Promise<Patient | null> {
  const path = `patients/${patientId}`;
  try {
    const snap = await getDoc(doc(db, 'patients', patientId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Patient;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

function sanitizeData(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

export async function addPatient(patient: any) {
  const path = 'patients';
  try {
    // Check for existing patient with identical clinicNumber
    if (patient.clinicNumber) {
      const q = query(collection(db, path), where('clinicNumber', '==', patient.clinicNumber.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error(`DUPLICATE_CLINIC_NUMBER: A patient with Clinic/ART ID "${patient.clinicNumber.trim()}" is already registered.`);
      }
    }
    const newDocRef = doc(collection(db, path));
    const safeData = sanitizeData({ 
      ...patient, 
      clinicNumber: patient.clinicNumber.trim(), 
      createdAt: Timestamp.now() 
    });
    await setDoc(newDocRef, safeData);
    await logActivity('Patient Registered', `New patient ${patient.firstName} ${patient.lastName} (${patient.clinicNumber}) added.`, 'Patient');
    return newDocRef.id;
  } catch (error) {
    if (error instanceof Error && error.message.includes('DUPLICATE_CLINIC_NUMBER')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function bulkAddPatients(patients: any[]) {
  const path = 'patients';
  try {
    const BATCH_SIZE = 500;
    for (let i = 0; i < patients.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = patients.slice(i, i + BATCH_SIZE);
      
      chunk.forEach((patient) => {
        const newDocRef = doc(collection(db, path));
        const safeData = sanitizeData({ ...patient, createdAt: Timestamp.now() });
        batch.set(newDocRef, safeData);
      });
      
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updatePatient(id: string, patient: any) {
  const path = `patients/${id}`;
  try {
    const safeData = sanitizeData({ ...patient, updatedAt: Timestamp.now() });
    await updateDoc(doc(db, 'patients', id), safeData);
    await logActivity('Patient Updated', `Patient record (ID: ${id}) modified.`, 'Patient');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePatient(id: string) {
  const path = `patients/${id}`;
  try {
    const patientDoc = await getDoc(doc(db, 'patients', id));
    const patientData = patientDoc.data();
    const patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : id;
    
    await deleteDoc(doc(db, 'patients', id));
    await logActivity('Patient Deleted', `Patient ${patientName} (ID: ${id}) was permanently removed.`, 'Patient');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Visits
export function subscribeToVisits(patientId: string, callback: (visits: any[]) => void) {
  const path = 'visits';
  const q = query(collection(db, path), where('patientId', '==', patientId));
  return onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    callback(visits);
  }, (error) => {
    console.warn(`Visits snapshot listener warning for patient ${patientId}:`, error);
  });
}

export function subscribeToAllVisits(callback: (visits: any[]) => void) {
  const path = 'visits';
  return onSnapshot(collection(db, path), (snapshot) => {
    const visits = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    callback(visits);
  }, (error) => {
    console.warn('All visits snapshot listener warning:', error);
  });
}

export async function getAllVisits(): Promise<Visit[]> {
  const path = 'visits';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Visit))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function getPatientVisits(patientId: string): Promise<Visit[]> {
  const path = 'visits';
  try {
    const q = query(collection(db, path), where('patientId', '==', patientId));
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Visit))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function addVisit(patientId: string, visit: any, idempotencyKey?: string) {
  const path = 'visits';
  try {
    // Idempotency guard: prevent duplicate visit creations from rapid double-clicks
    try {
      const q = query(collection(db, path), where('patientId', '==', patientId));
      const existingSnap = await getDocs(q);
      const now = Date.now();
      const duplicate = existingSnap.docs.find(d => {
        const data = d.data();
        const sameDate = data.date === visit.date;
        const sameType = data.type === visit.type;
        const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : null;
        const isRecent = createdAtMs ? (now - createdAtMs < 15000) : false;
        const sameKey = Boolean(idempotencyKey && data.idempotencyKey === idempotencyKey);
        return (sameDate && sameType && isRecent) || sameKey;
      });

      if (duplicate) {
        console.warn(`Idempotency: Reusing existing visit ${duplicate.id} instead of creating duplicate.`);
        await updateDoc(duplicate.ref, {
          ...visit,
          updatedAt: Timestamp.now()
        });
        return duplicate.id;
      }
    } catch (checkErr) {
      console.warn('Idempotency check warning in addVisit:', checkErr);
    }

    const batch = writeBatch(db);
    const newDocRef = doc(collection(db, path));
    const patientRef = doc(db, 'patients', patientId);
    
    batch.set(newDocRef, { 
      ...visit, 
      patientId, 
      idempotencyKey: idempotencyKey || null,
      createdAt: Timestamp.now() 
    });
    
    const patientUpdate: any = {
      lastVisitDate: visit.date,
      nextAppointmentDate: visit.nextAppointmentDate || null,
      updatedAt: Timestamp.now(),
    };
    
    const vlResultSafe = visit.vlResult !== undefined && visit.vlResult !== null && visit.vlResult !== '' 
      ? Number(visit.vlResult) 
      : undefined;
    
    if (vlResultSafe !== undefined && !isNaN(vlResultSafe)) {
      patientUpdate.vlSuppressed = vlResultSafe < 50;
      patientUpdate.lastVlDate = visit.date;
      patientUpdate.lastVlResult = vlResultSafe;
      patientUpdate.viralLoadResult = vlResultSafe;
    } else if (visit.type === 'Drug Pickup & VL Test') {
      patientUpdate.lastVlDate = null;
      patientUpdate.vlSuppressed = null;
      patientUpdate.lastVlResult = null;
      patientUpdate.viralLoadResult = null;
    }
    
    if (visit.nextCounselingDate) {
      patientUpdate.nextCounselingDate = visit.nextCounselingDate;
    }

    batch.update(patientRef, patientUpdate);
    
    // Atomically commit visit write & patient update
    await batch.commit();

    const patientDoc = await getDoc(patientRef);
    const patientData = patientDoc.data();
    const patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : patientId;

    await logActivity('Visit Recorded', `New ${visit.type} visit recorded for ${patientName}.`, 'Visit');

    if (vlResultSafe !== undefined && vlResultSafe >= 50) {
      if (patientData) {
        const tracksQuery = query(
          collection(db, 'counseling_tracks'), 
          where('patientId', '==', patientId),
          where('completed', '==', false)
        );
        const tracksSnapshot = await getDocs(tracksQuery);
        
        if (tracksSnapshot.empty) {
          await addCounselingTrack({
            patientId,
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            clinicNumber: patientData.clinicNumber,
            startDate: visit.date,
            vlResult: vlResultSafe,
            session1: { status: 'Pending' },
            session2: { status: 'Pending' },
            session3: { status: 'Pending' },
            completed: false,
            nextCounselingDate: visit.nextCounselingDate || null,
          });
        } else {
          const trackId = tracksSnapshot.docs[0].id;
          await updateCounselingTrack(trackId, {
            vlResult: vlResultSafe,
            nextCounselingDate: visit.nextCounselingDate || null,
          });
        }
      }
    } else if (visit.type === 'Counselling') {
      const tracksQuery = query(
        collection(db, 'counseling_tracks'), 
        where('patientId', '==', patientId),
        where('completed', '==', false)
      );
      const tracksSnapshot = await getDocs(tracksQuery);
      if (!tracksSnapshot.empty) {
        const trackId = tracksSnapshot.docs[0].id;
        await updateCounselingTrack(trackId, {
          nextCounselingDate: visit.nextCounselingDate || null,
        });
      }
    }

    if (visit.nextAppointmentDate) {
      if (patientData) {
        await addAppointment({
          patientId,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          clinicNumber: patientData.clinicNumber,
          phone: patientData.phone || '',
          date: visit.nextAppointmentDate,
          type: 'Clinic Visit',
          status: 'Pending'
        });
      }
    }

    if (visit.nextCounselingDate) {
      if (patientData) {
        await addAppointment({
          patientId,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          clinicNumber: patientData.clinicNumber,
          phone: patientData.phone || '',
          date: visit.nextCounselingDate,
          type: 'Counseling',
          status: 'Pending'
        });
      }
    }

    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Appointments
export function subscribeToAppointments(callback: (appointments: any[]) => void) {
  const path = 'appointments';
  return onSnapshot(collection(db, path), (snapshot) => {
    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(appointments);
  }, (error) => {
    console.warn('Appointments snapshot listener warning:', error);
  });
}

export async function addAppointment(appointment: any, idempotencyKey?: string) {
  const path = 'appointments';
  try {
    // Idempotency guard: prevent duplicate pending appointments for the same client and date
    try {
      const q = query(
        collection(db, path),
        where('patientId', '==', appointment.patientId)
      );
      const existingSnap = await getDocs(q);
      const now = Date.now();
      const existing = existingSnap.docs.find(d => {
        const data = d.data();
        const sameDate = data.date === appointment.date;
        const sameType = data.type === appointment.type;
        const isPending = data.status === 'Pending';
        const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : null;
        const isRecent = createdAtMs ? (now - createdAtMs < 15000) : false;
        const sameKey = Boolean(idempotencyKey && data.idempotencyKey === idempotencyKey);
        return (sameDate && sameType && (isPending || isRecent)) || sameKey;
      });

      if (existing) {
        console.warn(`Idempotency: Reusing existing appointment ${existing.id} instead of creating duplicate.`);
        return existing.id;
      }
    } catch (checkErr) {
      console.warn('Idempotency check warning in addAppointment:', checkErr);
    }

    const newDocRef = doc(collection(db, path));
    await setDoc(newDocRef, { 
      ...appointment, 
      idempotencyKey: idempotencyKey || null,
      createdAt: Timestamp.now() 
    });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const path = `appointments/${id}`;
  try {
    await updateDoc(doc(db, 'appointments', id), { status, updatedAt: Timestamp.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Counseling Tracks
export function subscribeToCounselingTracks(callback: (tracks: any[]) => void) {
  const path = 'counseling_tracks';
  return onSnapshot(collection(db, path), (snapshot) => {
    const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tracks);
  }, (error) => {
    console.warn('Counseling tracks snapshot listener warning:', error);
  });
}

export async function addCounselingTrack(track: any) {
  const path = 'counseling_tracks';
  try {
    const newDocRef = doc(collection(db, path));
    await setDoc(newDocRef, { ...track, createdAt: Timestamp.now() });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCounselingTrack(id: string, track: any) {
  const path = `counseling_tracks/${id}`;
  try {
    await updateDoc(doc(db, 'counseling_tracks', id), { ...track, updatedAt: Timestamp.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function exportDatabaseBackup() {
  const collections = ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs', 'users'];
  const collectionsData: Record<string, any[]> = {};
  let totalRecordCount = 0;
  
  for (const collName of collections) {
    try {
      const q = query(collection(db, collName));
      const snapshot = await getDocs(q);
      const docsData = snapshot.docs.map(doc => {
        const cleanData = { id: doc.id, ...doc.data() } as any;
        
        for (const key of Object.keys(cleanData)) {
          const value = cleanData[key];
          if (value instanceof Timestamp) {
            cleanData[key] = {
              seconds: value.seconds,
              nanoseconds: value.nanoseconds,
              formatted: value.toDate().toISOString()
            };
          } else if (value && typeof value === 'object') {
            for (const nestedKey of Object.keys(value)) {
              if (value[nestedKey] instanceof Timestamp) {
                value[nestedKey] = {
                  seconds: value[nestedKey].seconds,
                  nanoseconds: value[nestedKey].nanoseconds,
                  formatted: value[nestedKey].toDate().toISOString()
                };
              }
            }
          }
        }
        return cleanData;
      });
      collectionsData[collName] = docsData;
      totalRecordCount += docsData.length;
    } catch (err) {
      console.error(`Failed to export collection ${collName}:`, err);
      collectionsData[collName] = [];
    }
  }

  const exportPayload = {
    _metadata: {
      facility: 'OTZ Adolescent EMR Clinic',
      exportTimestamp: new Date().toISOString(),
      schemaVersion: '2.0-Production-EMR',
      exportedBy: auth.currentUser?.email || 'Admin',
      totalRecords: totalRecordCount,
      collectionStats: Object.keys(collectionsData).reduce((acc, key) => {
        acc[key] = collectionsData[key].length;
        return acc;
      }, {} as Record<string, number>)
    },
    ...collectionsData
  };
  
  await logAuditTrail(
    'Database Backup Generated',
    'DatabaseSnapshot',
    'system_backup',
    `Exported snapshot containing ${totalRecordCount} total records across ${collections.length} collections.`
  );
  
  return exportPayload;
}

export async function seedDummyData() {
  return true;
}

export async function importDatabaseBackup(backupData: Record<string, any>) {
  const supportedCollections = ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs'];
  let importedCount = 0;

  for (const collName of supportedCollections) {
    const records = backupData[collName];
    if (!Array.isArray(records) || records.length === 0) continue;

    let batch = writeBatch(db);
    let batchCount = 0;

    for (const item of records) {
      let docData: any = {};
      let docId = item.id;

      // Check if data came from SQLite stringified format
      if (item.data && typeof item.data === 'string') {
        try {
          docData = JSON.parse(item.data);
        } catch {
          docData = { ...item };
        }
      } else {
        docData = { ...item };
      }

      if (!docId) {
        docId = docData.id || doc(collection(db, collName)).id;
      }
      delete docData.id;

      const docRef = doc(db, collName, docId);
      batch.set(docRef, docData, { merge: true });
      batchCount++;
      importedCount++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  await logAuditTrail(
    'Database Backup Restored',
    'DatabaseRestore',
    'system_restore',
    `Imported ${importedCount} records from backup file.`
  );

  return { success: true, count: importedCount };
}
