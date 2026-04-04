/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from '@/src/components/ui/Card';
import {
  Users,
  Activity,
  AlertCircle,
  Calendar,
  TrendingUp,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Patient, Visit, CounselingTrack } from '@/src/types';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Dashboard({ patients, appointments, visits, tracks = [] }: { patients: Patient[], appointments: any[], visits: Visit[], tracks?: CounselingTrack[] }) {
  const activePatients = patients.filter(p => p.ltfuStatus === 'Active').length;
  const ltfuPatients = patients.filter(p => p.ltfuStatus === 'LTFU').length;
  const suppressedPatients = patients.filter(p => p.vlSuppressed).length;
  const upcomingVisits = appointments.filter(a => a.status === 'Pending').length;
  const pendingCounseling = tracks.filter(t => !t.completed).length;

  // Calculate monthly visits for the last 6 months
  const monthlyVisitsData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(new Date(), 5 - i);
    const monthName = format(monthDate, 'MMM');
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const count = visits.filter(v => {
      const visitDate = parseISO(v.date);
      return isWithinInterval(visitDate, { start: monthStart, end: monthEnd });
    }).length;

    return { name: monthName, visits: count };
  });

  const stats = [
    {
      label: 'Total Patients',
      value: patients.length.toString(),
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      trend: 'Total registered',
    },
    {
      label: 'Active on ART',
      value: activePatients.toString(),
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: `${((activePatients / (patients.length || 1)) * 100).toFixed(1)}% retention`,
    },
    {
      label: 'LTFU Patients',
      value: ltfuPatients.toString(),
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      trend: 'Require follow-up',
    },
    {
      label: 'Upcoming Visits',
      value: upcomingVisits.toString(),
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      trend: 'Pending appointments',
    },
    {
      label: 'High VL Counseling',
      value: pendingCounseling.toString(),
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      trend: 'Require counseling',
    },
  ];

  const suppressionRate = Math.round((suppressedPatients / (patients.filter(p => p.vlSuppressed !== undefined).length || 1)) * 100);
  
  const vlStatusData = [
    { name: 'Suppressed', value: suppressionRate },
    { name: 'Not Suppressed', value: 100 - suppressionRate },
  ];

  const recentVisits = [...visits]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Clinic Dashboard
        </h1>
        <p className="text-slate-500">
          Overview of clinic performance and patient tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className={cn('rounded-xl p-3', stat.bg)}>
                  <Icon className={cn('h-6 w-6', stat.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </h3>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-400">
                <TrendingUp className="h-3 w-3" />
                <span>{stat.trend}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Monthly Visits</h3>
            <select className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyVisitsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar
                  dataKey="visits"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">Viral Load Suppression</h3>
            <p className="text-xs text-slate-500">Current suppression status across active patients</p>
          </div>
          <div className="flex h-[300px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vlStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vlStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-8">
              {vlStatusData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-xs text-slate-500">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View All
            </button>
          </div>
          <div className="space-y-6">
            {recentVisits.length > 0 ? (
              recentVisits.map((visit) => {
                const patient = patients.find(p => p.id === visit.patientId);
                return (
                  <div key={visit.id} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900">
                        Visit recorded for patient <span className="text-indigo-600">{patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}</span>
                      </p>
                      <p className="text-xs text-slate-500">{visit.type} • {format(parseISO(visit.date), 'MMM d, yyyy')}</p>
                    </div>
                    <span className="text-xs text-slate-400">{format(parseISO(visit.date), 'MMM d')}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-slate-500">No recent activity recorded.</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Register Patient</p>
                <p className="text-xs text-slate-500">Add a new client to the system</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Record Visit</p>
                <p className="text-xs text-slate-500">Log a clinic visit or drug pickup</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Generate Report</p>
                <p className="text-xs text-slate-500">Export monthly clinic statistics</p>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { cn } from '@/src/utils';
