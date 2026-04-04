/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

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

// Patients
export function subscribeToPatients(callback: (patients: any[]) => void) {
  const path = 'patients';
  return onSnapshot(collection(db, path), (snapshot) => {
    const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(patients);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addPatient(patient: any) {
  const path = 'patients';
  try {
    const newDocRef = doc(collection(db, path));
    await setDoc(newDocRef, { ...patient, createdAt: Timestamp.now() });
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function bulkAddPatients(patients: any[]) {
  const path = 'patients';
  try {
    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 500;
    for (let i = 0; i < patients.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = patients.slice(i, i + BATCH_SIZE);
      
      chunk.forEach((patient) => {
        const newDocRef = doc(collection(db, path));
        batch.set(newDocRef, { ...patient, createdAt: Timestamp.now() });
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
    await updateDoc(doc(db, 'patients', id), { ...patient, updatedAt: Timestamp.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePatient(id: string) {
  const path = `patients/${id}`;
  try {
    await deleteDoc(doc(db, 'patients', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Visits
export function subscribeToVisits(patientId: string, callback: (visits: any[]) => void) {
  const path = 'visits';
  const q = query(collection(db, path), where('patientId', '==', patientId), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(visits);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export function subscribeToAllVisits(callback: (visits: any[]) => void) {
  const path = 'visits';
  return onSnapshot(collection(db, path), (snapshot) => {
    const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(visits);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addVisit(patientId: string, visit: any) {
  const path = 'visits';
  try {
    const newDocRef = doc(collection(db, path));
    await setDoc(newDocRef, { ...visit, patientId, createdAt: Timestamp.now() });
    
    // Update patient's last visit date and status
    const vlSuppressed = visit.vlResult !== undefined ? visit.vlResult < 50 : undefined;
    await updateDoc(doc(db, 'patients', patientId), {
      lastVisitDate: visit.date,
      nextAppointmentDate: visit.nextAppointmentDate || null,
      vlSuppressed,
      lastVlDate: visit.vlResult !== undefined ? visit.date : undefined,
      lastVlResult: visit.vlResult !== undefined ? visit.vlResult : undefined,
    });

    // If VL is unsuppressed, create a counseling track
    if (visit.vlResult !== undefined && visit.vlResult >= 50) {
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      const patientData = patientDoc.data();
      if (patientData) {
        await addCounselingTrack({
          patientId,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          clinicNumber: patientData.clinicNumber,
          startDate: visit.date,
          vlResult: visit.vlResult,
          session1: { status: 'Pending' },
          session2: { status: 'Pending' },
          session3: { status: 'Pending' },
          completed: false,
        });
      }
    }

    // Also create/update appointment if nextAppointmentDate is provided
    if (visit.nextAppointmentDate) {
      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      const patientData = patientDoc.data();
      if (patientData) {
        await addAppointment({
          patientId,
          patientName: `${patientData.firstName} ${patientData.lastName}`,
          clinicNumber: patientData.clinicNumber,
          phone: patientData.phone || '',
          date: visit.nextAppointmentDate,
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
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addAppointment(appointment: any) {
  const path = 'appointments';
  try {
    const newDocRef = doc(collection(db, path));
    await setDoc(newDocRef, { ...appointment, createdAt: Timestamp.now() });
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
    handleFirestoreError(error, OperationType.GET, path);
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
