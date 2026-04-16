import { io } from 'socket.io-client';

const socket = io(window.location.origin);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleSocketError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Socket Error:', operationType, path, error);
}

// Activity Logs
export async function logActivity(action: string, details: string, user: string) {
  socket.emit('add_document', {
    collection: 'activity_logs',
    data: { action, details, user, timestamp: new Date().toISOString() }
  });
}

export function subscribeToActivityLogs(callback: (logs: any[]) => void) {
  socket.on('activity_logs_update', callback);
  socket.emit('subscribe', 'activity_logs');
  return () => socket.off('activity_logs_update', callback);
}

export async function clearActivityLogs() {
  socket.emit('clear_collection', { collection: 'activity_logs' });
}

export async function clearAllActivityLogs() {
  socket.emit('clear_collection', { collection: 'activity_logs' });
}

export async function cleanupOldLogs() {
  // In a real app, this would delete logs older than 30 days.
  // For now, just clear all logs.
  socket.emit('clear_collection', { collection: 'activity_logs' });
}

// Users
export async function saveUserProfile(user: any, defaultRole: 'admin' | 'staff' = 'staff') {
  // Handled by the backend on login/register in a real app
}

export function subscribeToUsers(callback: (users: any[]) => void) {
  socket.on('users_update', callback);
  socket.emit('subscribe', 'users');
  return () => socket.off('users_update', callback);
}

export async function updateUserRole(uid: string, newRole: 'admin' | 'staff') {
  socket.emit('update_document', { collection: 'users', id: uid, data: { role: newRole } });
}

// Data Wiping
export const clearAllVisits = () => socket.emit('clear_collection', { collection: 'visits' });
export const clearAllCounseling = () => socket.emit('clear_collection', { collection: 'counseling_tracks' });
export const clearAllAppointments = () => socket.emit('clear_collection', { collection: 'appointments' });

export async function wipeAllTestData() {
  ['patients', 'visits', 'appointments', 'counseling_tracks', 'activity_logs'].forEach(collection => {
    socket.emit('clear_collection', { collection });
  });
  return true;
}

// Patients
export function subscribeToPatients(callback: (patients: any[]) => void) {
  socket.on('patients_update', callback);
  socket.emit('subscribe', 'patients');
  return () => socket.off('patients_update', callback);
}

export async function addPatient(patient: any) {
  return new Promise((resolve) => {
    socket.emit('add_document', { collection: 'patients', data: patient });
    socket.once('operation_success', ({ id }) => resolve(id));
  });
}

export async function bulkAddPatients(patients: any[]) {
  patients.forEach(patient => {
    socket.emit('add_document', { collection: 'patients', data: patient });
  });
}

export async function updatePatient(id: string, patient: any) {
  socket.emit('update_document', { collection: 'patients', id, data: patient });
}

export async function updatePatientVL(id: string, vlResult: number, date: string) {
  socket.emit('update_document', { 
    collection: 'patients', 
    id, 
    data: { 
      vlSuppressed: vlResult < 50,
      lastVlDate: date,
      lastVlResult: vlResult
    } 
  });
}

export async function deletePatient(id: string) {
  socket.emit('delete_document', { collection: 'patients', id });
}

export async function graduatePatientsOver25() {
  // In a real app, this would query patients over 25 and update their status.
  // For now, we'll just emit a custom event or let the backend handle it.
  socket.emit('graduate_patients');
}

// Visits
export function subscribeToVisits(patientId: string, callback: (visits: any[]) => void) {
  const handler = (visits: any[]) => {
    callback(visits.filter(v => v.patientId === patientId));
  };
  socket.on('visits_update', handler);
  socket.emit('subscribe', 'visits');
  return () => socket.off('visits_update', handler);
}

export function subscribeToAllVisits(callback: (visits: any[]) => void) {
  socket.on('visits_update', callback);
  socket.emit('subscribe', 'visits');
  return () => socket.off('visits_update', callback);
}

export async function addVisit(patientId: string, visit: any) {
  return new Promise((resolve) => {
    socket.emit('add_document', { collection: 'visits', data: { ...visit, patientId } });
    
    // Also update patient logic
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
    
    updatePatient(patientId, patientUpdate);
    
    socket.once('operation_success', ({ id }) => resolve(id));
  });
}

// Appointments
export function subscribeToAppointments(callback: (appointments: any[]) => void) {
  socket.on('appointments_update', callback);
  socket.emit('subscribe', 'appointments');
  return () => socket.off('appointments_update', callback);
}

export async function addAppointment(appointment: any) {
  return new Promise((resolve) => {
    socket.emit('add_document', { collection: 'appointments', data: appointment });
    socket.once('operation_success', ({ id }) => resolve(id));
  });
}

export async function updateAppointmentStatus(id: string, status: string) {
  socket.emit('update_document', { collection: 'appointments', id, data: { status } });
}

// Counseling Tracks
export function subscribeToCounselingTracks(callback: (tracks: any[]) => void) {
  socket.on('counseling_tracks_update', callback);
  socket.emit('subscribe', 'counseling_tracks');
  return () => socket.off('counseling_tracks_update', callback);
}

export async function addCounselingTrack(track: any) {
  return new Promise((resolve) => {
    socket.emit('add_document', { collection: 'counseling_tracks', data: track });
    socket.once('operation_success', ({ id }) => resolve(id));
  });
}

export async function updateCounselingTrack(id: string, track: any) {
  socket.emit('update_document', { collection: 'counseling_tracks', id, data: track });
}
