/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Patient, CounselingTrack, CounselingSession } from '../types';
import { formatDate, cn } from '../utils';
import { 
  TestTube, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  Calendar,
  ChevronRight,
  Bell
} from 'lucide-react';
import { updateCounselingTrack } from '../services/firestoreService';
import { Modal } from './ui/Modal';

interface ViralLoadManagerProps {
  patients: Patient[];
  tracks: CounselingTrack[];
  onRecordVl: (patient: Patient, type?: string) => void;
}

export function ViralLoadManager({ patients, tracks, onRecordVl }: ViralLoadManagerProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Completed'>('Pending');
  const [isPatientSelectOpen, setIsPatientSelectOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = 
      track.patientName.toLowerCase().includes(search.toLowerCase()) ||
      track.clinicNumber.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'All') return matchesSearch;
    if (filter === 'Pending') return matchesSearch && !track.completed;
    if (filter === 'Completed') return matchesSearch && track.completed;
    return matchesSearch;
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const availablePatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.lastName.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.clinicNumber.toLowerCase().includes(patientSearch.toLowerCase())
  ).slice(0, 5);

  const handleUpdateSession = async (track: CounselingTrack, sessionNum: 1 | 2 | 3, status: 'Completed') => {
    const updatedTrack = { ...track };
    const sessionKey = `session${sessionNum}` as 'session1' | 'session2' | 'session3';
    
    updatedTrack[sessionKey] = {
      ...updatedTrack[sessionKey],
      status,
      date: new Date().toISOString().split('T')[0]
    };

    // Check if all sessions are completed
    if (updatedTrack.session1.status === 'Completed' && 
        updatedTrack.session2.status === 'Completed' && 
        updatedTrack.session3.status === 'Completed') {
      updatedTrack.completed = true;
      updatedTrack.completionDate = new Date().toISOString().split('T')[0];
    }

    if (track.id) {
      await updateCounselingTrack(track.id, updatedTrack);
    }
  };

  const getProgress = (track: CounselingTrack) => {
    let completed = 0;
    if (track.session1.status === 'Completed') completed++;
    if (track.session2.status === 'Completed') completed++;
    if (track.session3.status === 'Completed') completed++;
    return (completed / 3) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Viral Load & Counseling</h1>
          <p className="text-slate-500">Track unsuppressed clients and their counseling progress.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {}} className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or clinic number..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 p-1">
              {(['All', 'Pending', 'Completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    filter === f
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredTracks.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <TestTube className="mx-auto h-12 w-12 opacity-20" />
                <p className="mt-2">No counseling tracks found.</p>
              </div>
            ) : (
              filteredTracks.map((track) => (
                <div 
                  key={track.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-indigo-100 hover:shadow-md"
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{track.patientName}</h3>
                        <span className="text-xs font-medium text-slate-400">#{track.clinicNumber}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-rose-500" />
                          VL: <span className="font-bold text-rose-600">{track.vlResult} c/ml</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Started: {formatDate(track.startDate)}
                        </span>
                        {track.nextCounselingDate && (
                          <span className="flex items-center gap-1 text-amber-600 font-bold">
                            <Calendar className="h-3 w-3" />
                            Next Appt: {formatDate(track.nextCounselingDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress</p>
                        <p className="text-sm font-bold text-indigo-600">{Math.round(getProgress(track))}%</p>
                      </div>
                      <div className="h-10 w-10 rounded-full border-2 border-slate-100 p-1">
                        <div 
                          className="h-full w-full rounded-full bg-indigo-600 transition-all"
                          style={{ clipPath: `inset(${100 - getProgress(track)}% 0 0 0)` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Session 1 */}
                    <div className={cn(
                      "rounded-xl border p-4 transition-all",
                      track.session1.status === 'Completed' ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50"
                    )}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1st Online</span>
                        {track.session1.status === 'Completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600">Initial Counseling</p>
                      {track.session1.status === 'Pending' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-3 w-full h-8 text-[10px] font-bold"
                          onClick={() => handleUpdateSession(track, 1, 'Completed')}
                        >
                          Mark Done
                        </Button>
                      ) : (
                        <p className="mt-3 text-[10px] text-emerald-600 font-medium">Done: {formatDate(track.session1.date)}</p>
                      )}
                    </div>

                    {/* Session 2 */}
                    <div className={cn(
                      "rounded-xl border p-4 transition-all",
                      track.session2.status === 'Completed' ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50"
                    )}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2nd Online</span>
                        {track.session2.status === 'Completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600">Follow-up Session</p>
                      {track.session2.status === 'Pending' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-3 w-full h-8 text-[10px] font-bold"
                          disabled={track.session1.status !== 'Completed'}
                          onClick={() => handleUpdateSession(track, 2, 'Completed')}
                        >
                          Mark Done
                        </Button>
                      ) : (
                        <p className="mt-3 text-[10px] text-emerald-600 font-medium">Done: {formatDate(track.session2.date)}</p>
                      )}
                    </div>

                    {/* Session 3 */}
                    <div className={cn(
                      "rounded-xl border p-4 transition-all",
                      track.session3.status === 'Completed' ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50"
                    )}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final Clinic</span>
                        {track.session3.status === 'Completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600">Exit Counseling</p>
                      {track.session3.status === 'Pending' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-3 w-full h-8 text-[10px] font-bold"
                          disabled={track.session2.status !== 'Completed'}
                          onClick={() => handleUpdateSession(track, 3, 'Completed')}
                        >
                          Mark Done
                        </Button>
                      ) : (
                        <p className="mt-3 text-[10px] text-emerald-600 font-medium">Done: {formatDate(track.session3.date)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start gap-3 bg-indigo-600"
                onClick={() => setIsPatientSelectOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Record New VL Result
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  const pending = tracks.filter(t => !t.completed && t.session1.status === 'Pending');
                  if (pending.length > 0) {
                    alert(`Sending reminders to ${pending.length} clients...`);
                  } else {
                    alert('No pending reminders to send.');
                  }
                }}
              >
                <MessageSquare className="h-4 w-4" />
                Send Online Reminder
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Counseling Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Tracks</span>
                <span className="text-sm font-bold text-slate-900">{tracks.filter(t => !t.completed).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Completed (This Month)</span>
                <span className="text-sm font-bold text-emerald-600">
                  {tracks.filter(t => t.completed && t.completionDate?.startsWith(new Date().toISOString().slice(0, 7))).length}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {tracks.filter(t => !t.completed && t.session1.status === 'Pending').length} clients need 1st counseling
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isPatientSelectOpen}
        onClose={() => setIsPatientSelectOpen(false)}
        title="Select Patient for VL Record"
        size="md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search patient by name or clinic number..."
              className="pl-10"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            {availablePatients.map(patient => (
              <button
                key={patient.id}
                onClick={() => {
                  onRecordVl(patient, 'Drug Pickup & VL Test');
                  setIsPatientSelectOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-4 text-left transition-all hover:border-indigo-100 hover:bg-indigo-50/50"
              >
                <div>
                  <p className="font-bold text-slate-900">{patient.firstName} {patient.lastName}</p>
                  <p className="text-xs text-slate-500">MH NO: {patient.clinicNumber}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
            {availablePatients.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No patients found matching your search.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
