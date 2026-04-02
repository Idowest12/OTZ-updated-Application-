/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Appointment } from '@/src/types';
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
} from 'lucide-react';
import { useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

export function AppointmentCalendar({ appointments, onUpdateStatus }: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthlyAppointments = appointments.filter(a => {
    const date = parseISO(a.date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  const pendingCount = monthlyAppointments.filter(a => a.status === 'Pending').length;
  const completedCount = monthlyAppointments.filter(a => a.status === 'Completed').length;
  const missedCount = monthlyAppointments.filter(a => a.status === 'Missed').length;
  const totalCount = monthlyAppointments.length;

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Appointment Calendar
          </h1>
          <p className="text-slate-500">
            Track upcoming visits and manage clinic schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 w-10 p-0" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-900 min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="sm" className="h-10 w-10 p-0" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Upcoming Appointments</h3>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                <Clock className="h-3 w-3" />
                Pending
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </span>
            </div>
          </div>
          <div className="space-y-4">
            {monthlyAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="mb-2 h-12 w-12 text-slate-200" />
                <p className="text-sm text-slate-500">No appointments scheduled for this month.</p>
              </div>
            ) : (
              monthlyAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <span className="text-xs font-bold uppercase tracking-tighter">
                        {format(parseISO(appointment.date), 'MMM')}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(parseISO(appointment.date), 'd')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {appointment.patientName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Clinic No: {appointment.clinicNumber}</span>
                        {appointment.phone && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-indigo-600 font-medium">
                              <Phone className="h-3 w-3" />
                              {appointment.phone}
                            </span>
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${appointment.phone}`}
                                className="rounded-full p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                title="Call Patient"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                              <a
                                href={`sms:${appointment.phone}`}
                                className="rounded-full p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
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
                    {appointment.status === 'Pending' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-emerald-600"
                          onClick={() => onUpdateStatus(appointment.id, 'Completed')}
                          title="Mark as Completed"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-rose-600"
                          onClick={() => onUpdateStatus(appointment.id, 'Missed')}
                          title="Mark as Missed"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-6">
          <h3 className="font-semibold text-slate-900">Schedule Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Monthly Total</p>
                  <p className="text-sm font-bold text-slate-900">{totalCount}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">This month</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Completed</p>
                  <p className="text-sm font-bold text-slate-900">{completedCount}</p>
                </div>
              </div>
              <span className="text-xs text-emerald-600 font-medium">
                {Math.round((completedCount / (totalCount || 1)) * 100)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
                  <XCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Missed</p>
                  <p className="text-sm font-bold text-slate-900">{missedCount}</p>
                </div>
              </div>
              <span className="text-xs text-rose-600 font-medium">
                {Math.round((missedCount / (totalCount || 1)) * 100)}%
              </span>
            </div>
          </div>
          
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <Clock className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Reminder Tip</h4>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              Call patients 2 days before their appointment to confirm attendance and reduce missed visits.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}


