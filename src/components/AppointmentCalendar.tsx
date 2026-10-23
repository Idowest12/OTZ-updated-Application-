/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Appointment, Patient } from '@/src/types';
import { formatDate, cn } from '@/src/utils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  Plus,
  Sparkles,
  Search,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  patients?: Patient[];
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onOpenVisit?: (patient: Patient, appointmentId?: string) => void;
}

export function AppointmentCalendar({ appointments, patients = [], onUpdateStatus, onOpenVisit }: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Missed'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthlyAppointments = useMemo(() => {
    return appointments.filter(a => {
      const date = parseISO(a.date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });
  }, [appointments, monthStart, monthEnd]);

  const pendingCount = monthlyAppointments.filter(a => a.status === 'Pending').length;
  const completedCount = monthlyAppointments.filter(a => a.status === 'Completed').length;
  const missedCount = monthlyAppointments.filter(a => a.status === 'Missed').length;
  const totalCount = monthlyAppointments.length;

  // Prioritize Pending appointments at the very top, sorted chronologically (earliest first)
  const sortedAndFilteredAppointments = useMemo(() => {
    const sorted = [...monthlyAppointments].sort((a, b) => {
      // 1. Pending always comes at the top!
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;

      // 2. If both are Pending, sort by date ascending (nearest upcoming first)
      if (a.status === 'Pending' && b.status === 'Pending') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }

      // 3. For Completed/Missed, sort by date descending (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return sorted.filter(a => {
      const matchesStatus = statusFilter === 'All' ? true : a.status === statusFilter;
      const matchesSearch = searchQuery === '' || 
        (a.patientName && a.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.clinicNumber && a.clinicNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.phone && a.phone.includes(searchQuery));
      return matchesStatus && matchesSearch;
    });
  }, [monthlyAppointments, statusFilter, searchQuery]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Appointment Calendar
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track upcoming visits and manage clinic schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 w-10 p-0 dark:text-slate-300" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-900 dark:text-white min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="sm" className="h-10 w-10 p-0 dark:text-slate-300" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Upcoming Appointments</span>
                  {pendingCount > 0 && (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[11px] font-bold">
                      {pendingCount} Pending at Top
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pending visits appear at the top so you don&apos;t have to scroll.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter('All')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                    statusFilter === 'All'
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Pending')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                    statusFilter === 'Pending'
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Completed')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                    statusFilter === 'Completed'
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Completed ({completedCount})
                </button>
                {missedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Missed')}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                      statusFilter === 'Missed'
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    )}
                  >
                    <XCircle className="h-3 w-3" />
                    Missed ({missedCount})
                  </button>
                )}
              </div>
            </div>

            {/* Quick search input */}
            {monthlyAppointments.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick filter by patient name, clinic number, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
          <div className="space-y-4">
            {sortedAndFilteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="mb-2 h-12 w-12 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery || statusFilter !== 'All' 
                    ? 'No appointments found matching this filter.' 
                    : 'No appointments scheduled for this month.'}
                </p>
              </div>
            ) : (
              sortedAndFilteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 transition-colors",
                    appointment.status === 'Pending'
                      ? "border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10 hover:bg-amber-50/40"
                      : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 flex-col items-center justify-center rounded-lg font-bold",
                      appointment.status === 'Pending'
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700"
                        : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    )}>
                      <span className="text-xs uppercase tracking-tighter">
                        {format(parseISO(appointment.date), 'MMM')}
                      </span>
                      <span className="text-lg leading-none">
                        {format(parseISO(appointment.date), 'd')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {appointment.patientName}
                        </p>
                        {appointment.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                            <Clock className="h-2.5 w-2.5" />
                            Pending
                          </span>
                        )}
                        {appointment.type && (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            appointment.type === 'Counseling' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          )}>
                            {appointment.type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>MH NO: {appointment.clinicNumber}</span>
                        {appointment.phone && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                              <Phone className="h-3 w-3" />
                              {appointment.phone}
                            </span>
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${appointment.phone}`}
                                className="rounded-full p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                                title="Call Patient"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                              <a
                                href={`sms:${appointment.phone}`}
                                className="rounded-full p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors"
                                title="Send SMS"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {appointment.status === 'Pending' ? (
                      <>
                        {onOpenVisit && (
                          <Button 
                            size="sm" 
                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-2.5 shadow-xs font-semibold"
                            onClick={() => {
                              const matched = patients.find(p => p.id === appointment.patientId || (appointment.clinicNumber && p.clinicNumber === appointment.clinicNumber));
                              const patientToOpen: Patient = matched || {
                                id: appointment.patientId,
                                clinicNumber: appointment.clinicNumber,
                                firstName: appointment.patientName.split(' ')[0] || appointment.patientName,
                                lastName: appointment.patientName.split(' ').slice(1).join(' ') || '',
                                age: 0,
                                gender: 'Female',
                                enrollmentDate: appointment.date,
                                ltfuStatus: 'Active',
                                phone: appointment.phone
                              };
                              // Auto-clear appointment as visited & completed immediately
                              onUpdateStatus(appointment.id, 'Completed');
                              onOpenVisit(patientToOpen, appointment.id);
                            }}
                            title="Open visit form & automatically clear appointment as visited"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Open Visit
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-emerald-600 dark:text-emerald-500 dark:hover:bg-emerald-900/20"
                          onClick={() => onUpdateStatus(appointment.id, 'Completed')}
                          title="Mark as Completed"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-rose-600 dark:text-rose-500 dark:hover:bg-rose-900/20"
                          onClick={() => onUpdateStatus(appointment.id, 'Missed')}
                          title="Mark as Missed"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    ) : appointment.status === 'Completed' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Visited
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        <XCircle className="h-3.5 w-3.5" />
                        Missed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">Schedule Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                  <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Total</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{totalCount}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">This month</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{completedCount}</p>
                </div>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {Math.round((completedCount / (totalCount || 1)) * 100)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20">
                  <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Missed</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{missedCount}</p>
                </div>
              </div>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {Math.round((missedCount / (totalCount || 1)) * 100)}%
              </span>
            </div>
          </div>
          
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 mb-2">
              <Clock className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Reminder Tip</h4>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
              Call patients 2 days before their appointment to confirm attendance and reduce missed visits.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}


