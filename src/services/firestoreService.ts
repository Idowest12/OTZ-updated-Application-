import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBRbymmmusPZPXgFvsMU0FAI3vLsTeSQ4w",
  authDomain: "otz-dummy-system.firebaseapp.com",
  projectId: "otz-dummy-system",
  storageBucket: "otz-dummy-system.firebasestorage.app",
  messagingSenderId: "968979776916",
  appId: "1:968979776916:web:cd7a569ef66f726dbd7b81"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

enum OperationType {
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
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId || undefined,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function logActivity(action: string, details: string, user: string) {
  try {
    await addDoc(collection(db, 'activity_logs'), { action, details, user, timestamp: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'activity_logs');
  }
}

export function subscribeToActivityLogs(callback: (logs: any[]) => void) {
  return onSnapshot(collection(db, 'activity_logs'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'activity_logs');
  });
}

export async function clearAllVisits() {}
export async function clearAllCounseling() {}
export async function clearAllAppointments() {}
export async function clearActivityLogs() {}
export async function clearAllActivityLogs() {}
export async function cleanupOldLogs(days?: number) { return 0; }
export async function wipeAllTestData() {
  const collections = ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs'];
  
  let batch = writeBatch(db);
  let count = 0;

  for (const coll of collections) {
    const q = await getDocs(collection(db, coll));
    for (const d of q.docs) {
      batch.delete(doc(db, coll, d.id));
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
  }
  
  if (count > 0) {
    await batch.commit();
  }
  return true;
}

export async function seedDummyData() {
  await wipeAllTestData();
  let patientIds: any[] = [];
  
  // Use batch for inserts
  let batch = writeBatch(db);
  let batchCount = 0;

  const commitBatchAndReset = async () => {
    if (batchCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  };

  const addPatientToBatch = async (patientData: any) => {
    const docRef = doc(collection(db, 'patients'));
    batch.set(docRef, patientData);
    batchCount++;
    if (batchCount >= 400) await commitBatchAndReset(); // Firestore batch limit is 500
    return docRef;
  };

  // Add 175 Active Patients
  for (let i = 0; i < 175; i++) {
    let isPendingVL = i < 3;
    let isSuppressed = isPendingVL ? null : (i < 155 ? true : false);

    const docRef = await addPatientToBatch({
      firstName: "TestClient",
      lastName: `Active${i}`,
      clinicNumber: `MH-${1000 + i}`,
      age: Math.floor(Math.random() * 10) + 12, // 12-21
      gender: i % 2 === 0 ? 'Male' : 'Female',
      ltfuStatus: 'Active',
      enrollmentDate: '2023-01-15',
      dateOfBirth: '2010-01-01',
      lastVisitDate: '2024-05-01', 
      phone: '08012345678',
      address: 'Dummy Address',
      vlSuppressed: isSuppressed,
      lastVlDate: isPendingVL ? null : '2024-04-10',
      lastVlResult: isPendingVL ? null : (isSuppressed ? 20 : 1500)
    });
    patientIds.push({ id: docRef.id, name: `TestClient Active${i}`, clinic: `MH-${1000 + i}`});
  }

  // Add 3 LTFU Patients
  for (let i = 0; i < 3; i++) {
    await addPatientToBatch({
      firstName: "TestClient", lastName: `LTFU${i}`, clinicNumber: `MH-L${i}`, age: 15, gender: 'Male', ltfuStatus: 'LTFU', enrollmentDate: '2022-01-01', dateOfBirth: '2010-01-01'
    });
  }

  // Add 9 Graduated Patients
  for (let i = 0; i < 9; i++) {
    await addPatientToBatch({
      firstName: "TestClient", lastName: `Grad${i}`, clinicNumber: `MH-G${i}`, age: 26, gender: 'Female', ltfuStatus: 'Graduated', enrollmentDate: '2015-01-01', dateOfBirth: '1998-01-01'
    });
  }

  // Add 8 Transferred Out Patients
  for (let i = 0; i < 8; i++) {
    await addPatientToBatch({
      firstName: "TestClient", lastName: `Trans${i}`, clinicNumber: `MH-T${i}`, age: 18, gender: 'Male', ltfuStatus: 'Transferred Out', enrollmentDate: '2020-01-01', dateOfBirth: '2006-01-01'
    });
  }

  await commitBatchAndReset(); // Commit patients before creating relationships

  // Add 27 Upcoming Visits (Appointments)
  for (let i = 0; i < 27; i++) {
    const apptRef = doc(collection(db, 'appointments'));
    batch.set(apptRef, {
      patientId: patientIds[i].id,
      patientName: patientIds[i].name,
      clinicNumber: patientIds[i].clinic,
      date: '2026-06-01',
      status: 'Pending',
      type: 'Clinic Visit'
    });
    batchCount++;
    
    const pRef = doc(db, 'patients', patientIds[i].id);
    batch.update(pRef, { nextAppointmentDate: '2026-06-01' });
    batchCount++;
  }

  // Add 1 High VL Counseling track
  if (patientIds.length > 170) {
    const trackRef = doc(collection(db, 'counseling_tracks'));
    batch.set(trackRef, {
      patientId: patientIds[170].id, // Use an unsuppressed patient
      patientName: patientIds[170].name,
      clinicNumber: patientIds[170].clinic,
      startDate: new Date().toISOString().split('T')[0],
      completed: false,
      sessions: []
    });
    batchCount++;
  }

  await commitBatchAndReset(); // Commit remaining

  return true;
}
export async function saveUserProfile(user?: any, defaultRole?: any) {}
export function subscribeToUsers(callback: (users: any[]) => void) { return () => {}; }
export async function updateUserRole(uid?: string, newRole?: string) {}

export function subscribeToPatients(callback: (patients: any[]) => void) {
  console.log("Subscribing to patients collection...");
  return onSnapshot(collection(db, 'patients'), (snapshot) => {
    console.log(`Received snapshot with ${snapshot.docs.length} patients.`);
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'patients');
  });
}

export async function addPatient(patient: any) {
  const docRef = await addDoc(collection(db, 'patients'), patient);
  return docRef.id;
}

export async function bulkAddPatients(patients: any[]) {
  // Simple iteration for now
  for (const p of patients) {
    await addDoc(collection(db, 'patients'), p);
  }
}

export async function updatePatient(id: string, patient: any) {
  await updateDoc(doc(db, 'patients', id), patient);
}

export async function deletePatient(id: string) {
  await deleteDoc(doc(db, 'patients', id));
}

export async function updatePatientVL(id: string, vlResult: number, date: string) {
  await updateDoc(doc(db, 'patients', id), {
    vlSuppressed: vlResult < 50,
    lastVlDate: date,
    lastVlResult: vlResult
  });
}

export async function graduatePatientsOver25() {}

export function subscribeToVisits(patientId: string, callback: (visits: any[]) => void) {
  return onSnapshot(collection(db, 'visits'), (snapshot) => {
    const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).filter(v => v.patientId === patientId);
    callback(visits);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'visits');
  });
}

export function subscribeToAllVisits(callback: (visits: any[]) => void) {
  return onSnapshot(collection(db, 'visits'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'visits');
  });
}

export async function addVisit(patientId: string, visit: any) {
  const docRef = await addDoc(collection(db, 'visits'), { ...visit, patientId });
  const patientUpdate: any = {
    lastVisitDate: visit.date,
    nextAppointmentDate: visit.nextAppointmentDate || null,
  };
  if (visit.vlResult !== undefined && visit.vlResult !== null) {
    patientUpdate.vlSuppressed = visit.vlResult < 50;
    patientUpdate.lastVlDate = visit.date;
    patientUpdate.lastVlResult = visit.vlResult;
  }
  if (visit.nextCounselingDate) {
    patientUpdate.nextCounselingDate = visit.nextCounselingDate;
  }
  await updateDoc(doc(db, 'patients', patientId), patientUpdate);
  return docRef.id;
}

export function subscribeToAppointments(callback: (appointments: any[]) => void) {
  return onSnapshot(collection(db, 'appointments'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'appointments');
  });
}

export async function addAppointment(appointment: any) {
  const docRef = await addDoc(collection(db, 'appointments'), appointment);
  return docRef.id;
}

export async function updateAppointmentStatus(id: string, status: string) {
  await updateDoc(doc(db, 'appointments', id), { status });
}

export function subscribeToCounselingTracks(callback: (tracks: any[]) => void) {
  return onSnapshot(collection(db, 'counseling_tracks'), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'counseling_tracks');
  });
}

export async function addCounselingTrack(track: any) {
  const docRef = await addDoc(collection(db, 'counseling_tracks'), track);
  return docRef.id;
}

export async function updateCounselingTrack(id: string, track: any) {
  await updateDoc(doc(db, 'counseling_tracks', id), track);
}
