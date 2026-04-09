/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ActivityLog } from '../types';
import { 
  subscribeToActivityLogs, 
  cleanupOldLogs, 
  wipeAllTestData, 
  clearAllActivityLogs,
  clearAllVisits,
  clearAllCounseling,
  clearAllAppointments,
  graduatePatientsOver25,
  subscribeToUsers,
  updateUserRole
} from '../services/firestoreService';
import { UserProfile } from '../types';
import { formatDate } from '../utils';
import { 
  Shield, 
  History, 
  UserCheck, 
  Trash2, 
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileText,
  Download,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../utils';
import { Modal } from './ui/Modal';
import { useAuth } from '../contexts/AuthContext';

export function AdminPanel() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ActivityLog['type'] | 'All'>('All');
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [isClearVisitsModalOpen, setIsClearVisitsModalOpen] = useState(false);
  const [isClearCounselingModalOpen, setIsClearCounselingModalOpen] = useState(false);
  const [isClearAppointmentsModalOpen, setIsClearAppointmentsModalOpen] = useState(false);
  const [isGraduateModalOpen, setIsGraduateModalOpen] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [isClearingVisits, setIsClearingVisits] = useState(false);
  const [isClearingCounseling, setIsClearingCounseling] = useState(false);
  const [isClearingAppointments, setIsClearingAppointments] = useState(false);
  const [isGraduating, setIsGraduating] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  // Hardcoded for now as per AuthContext
  const adminEmails = ['idowutosin70@gmail.com', 'idowu6259@gmail.com'];

  useEffect(() => {
    const unsubscribeLogs = subscribeToActivityLogs((data) => {
      setLogs(data);
    });
    
    const unsubscribeUsers = subscribeToUsers((data) => {
      setUsers(data);
    });
    
    return () => {
      unsubscribeLogs();
      unsubscribeUsers();
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'All' || log.type === filter;
    
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'Patient': return 'bg-indigo-100 text-indigo-700';
      case 'Visit': return 'bg-emerald-100 text-emerald-700';
      case 'Counseling': return 'bg-amber-100 text-amber-700';
      case 'System': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleExport = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Type', 'Details'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : 'N/A',
        `"${log.userName}"`,
        `"${log.action}"`,
        log.type,
        `"${log.details.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const deletedCount = await cleanupOldLogs(30);
      alert(`Successfully cleaned up ${deletedCount} logs older than 30 days.`);
      setIsCleanupModalOpen(false);
    } catch (error) {
      alert('Failed to cleanup logs. Please try again.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleClearAllLogs = async () => {
    setIsClearingLogs(true);
    try {
      const deletedCount = await clearAllActivityLogs();
      alert(`Successfully cleared ${deletedCount} activity logs.`);
      setIsClearLogsModalOpen(false);
    } catch (error) {
      alert('Failed to clear logs. Please try again.');
    } finally {
      setIsClearingLogs(false);
    }
  };

  const handleClearVisits = async () => {
    setIsClearingVisits(true);
    try {
      const count = await clearAllVisits();
      alert(`Successfully cleared ${count} visit records.`);
      setIsClearVisitsModalOpen(false);
    } catch (error) {
      alert('Failed to clear visits. Please try again.');
    } finally {
      setIsClearingVisits(false);
    }
  };

  const handleClearCounseling = async () => {
    setIsClearingCounseling(true);
    try {
      const count = await clearAllCounseling();
      alert(`Successfully cleared ${count} counseling records.`);
      setIsClearCounselingModalOpen(false);
    } catch (error) {
      alert('Failed to clear counseling records. Please try again.');
    } finally {
      setIsClearingCounseling(false);
    }
  };

  const handleClearAppointments = async () => {
    setIsClearingAppointments(true);
    try {
      const count = await clearAllAppointments();
      alert(`Successfully cleared ${count} appointment records.`);
      setIsClearAppointmentsModalOpen(false);
    } catch (error) {
      alert('Failed to clear appointments. Please try again.');
    } finally {
      setIsClearingAppointments(false);
    }
  };

  const handleGraduatePatients = async () => {
    setIsGraduating(true);
    try {
      const count = await graduatePatientsOver25();
      alert(`Successfully graduated ${count} patients over the age of 25.`);
      setIsGraduateModalOpen(false);
    } catch (error) {
      alert('Failed to graduate patients. Please try again.');
    } finally {
      setIsGraduating(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'staff') => {
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      try {
        await updateUserRole(uid, newRole);
      } catch (error) {
        alert('Failed to update user role.');
      }
    }
  };

  const handleWipeData = async () => {
    if (wipeConfirmText !== 'DELETE ALL') return;
    
    setIsWiping(true);
    try {
      await wipeAllTestData();
      alert('Successfully wiped all test data. The system is now clean.');
      setIsWipeModalOpen(false);
      setWipeConfirmText('');
    } catch (error) {
      alert('Failed to wipe test data. Please try again.');
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            Admin Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Monitor system activity and manage administrative tasks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-slate-400" />
              System Activity Log
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="h-9 w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64 text-slate-900 dark:text-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="All">All Types</option>
                <option value="Patient">Patient</option>
                <option value="Visit">Visit</option>
                <option value="Counseling">Counseling</option>
                <option value="System">System</option>
              </select>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                          {log.timestamp?.toDate ? formatDate(log.timestamp.toDate().toISOString()) : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{log.userName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{log.userId.slice(0, 8)}...</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{log.action}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{log.details}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            getTypeColor(log.type)
                          )}>
                            {log.type}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                        No activity logs found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Administrative Rules
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-100 dark:border-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-400">48-Hour Edit Rule</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
                    Regular staff can only edit entries within 48 hours of creation. After 48 hours, only Admins can modify data.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 p-3 border border-rose-100 dark:border-rose-900/30">
                <Trash2 className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-400">Data Deletion</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-500 leading-relaxed">
                    Only administrators have the authority to permanently delete patient records or visit history.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-3 border border-indigo-100 dark:border-indigo-900/30">
                <UserCheck className="h-5 w-5 text-indigo-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-400">Audit Trail</p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-500 leading-relaxed">
                    Every action is logged with a timestamp and user ID. This cannot be modified or deleted.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Admin Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-slate-700 dark:text-slate-300"
                onClick={() => setIsStaffModalOpen(true)}
              >
                <Users className="h-4 w-4" />
                Manage Staff Access
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-slate-700 dark:text-slate-300"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Export Full Audit Log
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 border-rose-100 dark:border-rose-900/30"
                onClick={() => setIsCleanupModalOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Cleanup Old Logs
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 border-amber-100 dark:border-amber-900/30"
                onClick={() => setIsClearLogsModalOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear All Activity Logs
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 border-amber-100 dark:border-amber-900/30"
                onClick={() => setIsClearVisitsModalOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear All Visits
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 border-amber-100 dark:border-amber-900/30"
                onClick={() => setIsClearCounselingModalOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear All Counseling
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 border-amber-100 dark:border-amber-900/30"
                onClick={() => setIsClearAppointmentsModalOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear All Appointments
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 border-indigo-100 dark:border-indigo-900/30"
                onClick={() => setIsGraduateModalOpen(true)}
              >
                <UserCheck className="h-4 w-4" />
                Graduate Patients {'>'} 25
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 border-red-200 dark:border-red-900/50 font-bold"
                onClick={() => setIsWipeModalOpen(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                Factory Reset (Wipe All Data)
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Cleanup Confirmation Modal */}
      <Modal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
        title="Cleanup Old Logs"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-rose-50 p-4 text-rose-700">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">
              This action will permanently delete all activity logs older than 30 days. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCleanupModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleCleanup}
              disabled={isCleaning}
            >
              {isCleaning ? 'Cleaning...' : 'Confirm Cleanup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear All Logs Confirmation Modal */}
      <Modal
        isOpen={isClearLogsModalOpen}
        onClose={() => setIsClearLogsModalOpen(false)}
        title="Clear All Activity Logs"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">
              This will permanently delete ALL activity logs. Your patient data, visits, and appointments will NOT be affected.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsClearLogsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleClearAllLogs}
              disabled={isClearingLogs}
            >
              {isClearingLogs ? 'Clearing...' : 'Confirm Clear Logs'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Visits Modal */}
      <Modal
        isOpen={isClearVisitsModalOpen}
        onClose={() => setIsClearVisitsModalOpen(false)}
        title="Clear All Visits"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">
              This will permanently delete ALL visit records. Patient demographics will NOT be affected.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsClearVisitsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleClearVisits}
              disabled={isClearingVisits}
            >
              {isClearingVisits ? 'Clearing...' : 'Confirm Clear Visits'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Counseling Modal */}
      <Modal
        isOpen={isClearCounselingModalOpen}
        onClose={() => setIsClearCounselingModalOpen(false)}
        title="Clear All Counseling Records"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">
              This will permanently delete ALL counseling tracks and sessions. Patient demographics will NOT be affected.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsClearCounselingModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleClearCounseling}
              disabled={isClearingCounseling}
            >
              {isClearingCounseling ? 'Clearing...' : 'Confirm Clear Counseling'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Appointments Modal */}
      <Modal
        isOpen={isClearAppointmentsModalOpen}
        onClose={() => setIsClearAppointmentsModalOpen(false)}
        title="Clear All Appointments"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">
              This will permanently delete ALL appointments. Patient demographics will NOT be affected.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsClearAppointmentsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleClearAppointments}
              disabled={isClearingAppointments}
            >
              {isClearingAppointments ? 'Clearing...' : 'Confirm Clear Appointments'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Graduate Patients Modal */}
      <Modal
        isOpen={isGraduateModalOpen}
        onClose={() => setIsGraduateModalOpen(false)}
        title="Graduate Patients > 25"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
            <UserCheck className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">
              This action will find all active patients who are older than 25 and change their status to "Graduated". This helps keep your active roster focused on the target age group.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsGraduateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleGraduatePatients}
              disabled={isGraduating}
            >
              {isGraduating ? 'Graduating...' : 'Confirm Graduation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* User Management Modal */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title="Manage Staff Access"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
            <ShieldCheck className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">
              Manage roles for users who have signed into the application. Admins have full access, while Staff have restricted access.
            </p>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {users.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">No users found.</p>
            ) : (
              users.map(user => (
                <div key={user.uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {user.displayName || 'Unknown User'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      user.role === 'admin' 
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {user.role.toUpperCase()}
                    </span>
                    
                    <select
                      className="rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as 'admin' | 'staff')}
                      disabled={adminEmails.includes(user.email)} // Prevent changing hardcoded admins
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsStaffModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Wipe Data Confirmation Modal */}
      <Modal
        isOpen={isWipeModalOpen}
        onClose={() => {
          setIsWipeModalOpen(false);
          setWipeConfirmText('');
        }}
        title="Factory Reset (Wipe All Data)"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-bold">
                WARNING: This is a destructive action!
              </p>
              <p className="text-sm">
                This will permanently delete ALL patients, visits, appointments, counseling tracks, and activity logs. It cannot be undone.
              </p>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE ALL</span> to confirm:
            </label>
            <input
              type="text"
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="DELETE ALL"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsWipeModalOpen(false);
                setWipeConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleWipeData}
              disabled={isWiping || wipeConfirmText !== 'DELETE ALL'}
            >
              {isWiping ? 'Wiping Data...' : 'Permanently Delete All Data'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
