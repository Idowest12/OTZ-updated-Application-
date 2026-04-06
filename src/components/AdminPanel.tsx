/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ActivityLog } from '../types';
import { subscribeToActivityLogs } from '../services/firestoreService';
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
  Clock
} from 'lucide-react';
import { cn } from '../utils';

export function AdminPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ActivityLog['type'] | 'All'>('All');

  useEffect(() => {
    const unsubscribe = subscribeToActivityLogs((data) => {
      setLogs(data);
    });
    return () => unsubscribe();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            Admin Control Center
          </h1>
          <p className="text-slate-500">Monitor system activity and manage administrative tasks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-slate-400" />
              System Activity Log
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="h-9 w-full rounded-lg border-slate-200 bg-white pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

          <div className="relative overflow-hidden rounded-xl border border-slate-100">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {log.timestamp?.toDate ? formatDate(log.timestamp.toDate().toISOString()) : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{log.userName}</div>
                          <div className="text-[10px] text-slate-400">{log.userId.slice(0, 8)}...</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{log.action}</div>
                          <div className="text-xs text-slate-500">{log.details}</div>
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
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
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
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Administrative Rules
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-lg bg-amber-50 p-3 border border-amber-100">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">48-Hour Edit Rule</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Regular staff can only edit entries within 48 hours of creation. After 48 hours, only Admins can modify data.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-rose-50 p-3 border border-rose-100">
                <Trash2 className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-900">Data Deletion</p>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Only administrators have the authority to permanently delete patient records or visit history.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-indigo-50 p-3 border border-indigo-100">
                <UserCheck className="h-5 w-5 text-indigo-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-900">Audit Trail</p>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Every action is logged with a timestamp and user ID. This cannot be modified or deleted.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-semibold text-slate-900">Admin Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start gap-2 text-slate-700">
                <Users className="h-4 w-4" />
                Manage Staff Access
              </Button>
              <Button variant="outline" className="justify-start gap-2 text-slate-700">
                <FileText className="h-4 w-4" />
                Export Full Audit Log
              </Button>
              <Button variant="outline" className="justify-start gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-100">
                <Trash2 className="h-4 w-4" />
                Cleanup Old Logs
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Users, FileText } from 'lucide-react';
