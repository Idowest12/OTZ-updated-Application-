/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Card } from '@/src/components/ui/Card';
import { PatientListModal } from '@/src/components/PatientListModal';
import {
  Users,
  Activity,
  AlertCircle,
  Calendar,
  TrendingUp,
  CheckCircle2,
  FileText,
  GraduationCap,
  ArrowRightLeft,
  UserMinus,
  Heart
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
import { cn, getPatientVlStatus, calculateVlMetrics } from '@/src/utils';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#4f46e5', '#8b5cf6'];

interface DashboardProps {
  patients: Patient[];
  appointments: any[];
  visits: Visit[];
  tracks?: CounselingTrack[];
  onNavigate?: (view: any) => void;
  onSelectPatient?: (patient: Patient) => void;
}

export function Dashboard({ patients, appointments, visits, tracks = [], onNavigate, onSelectPatient }: DashboardProps) {
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listModalTitle, setListModalTitle] = useState('');
  const [listModalPatients, setListModalPatients] = useState<Patient[]>([]);

  const openPatientList = (title: string, filteredPatients: Patient[]) => {
    setListModalTitle(title);
    setListModalPatients(filteredPatients);
    setListModalOpen(true);
    try {
      window.history.pushState({ ...window.history.state, modal: 'patient-list' }, '', window.location.hash);
    } catch {}
  };

  const closePatientList = () => {
    if (window.history.state?.modal === 'patient-list') {
      window.history.back();
    } else {
      setListModalOpen(false);
    }
  };

  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      if (listModalOpen && (!e.state || e.state.modal !== 'patient-list')) {
        setListModalOpen(false);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [listModalOpen]);

  const activePatientsList = patients.filter(p => p.ltfuStatus === 'Active');
  const activePatients = activePatientsList.length;
  const otzPlusPatients = patients.filter(p => p.isOtzPlus);
  const ltfuPatients = patients.filter(p => p.ltfuStatus === 'LTFU').length;
  const graduatedPatients = patients.filter(p => p.ltfuStatus === 'Graduated').length;
  const transferredOutPatients = patients.filter(p => p.ltfuStatus === 'Transferred Out').length;
  const deadPatients = patients.filter(p => p.ltfuStatus === 'Dead').length;
  const upcomingVisits = appointments.filter(a => a.status === 'Pending').length;
  const pendingCounseling = tracks.filter(t => !t.completed).length;

  // Accurately calculate viral load metrics for active cohort
  const vlMetrics = calculateVlMetrics(activePatientsList);
  const pendingVlPatients = activePatientsList.filter(p => getPatientVlStatus(p) === 'Pending');

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
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      trend: 'Total registered',
      clickable: true,
      onClick: () => openPatientList('All Registered Patients', patients)
    },
    {
      label: 'Active on ART',
      value: activePatients.toString(),
      icon: Activity,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      trend: `${((activePatients / (patients.length || 1)) * 100).toFixed(1)}% retention`,
      clickable: true,
      onClick: () => openPatientList('Active Patients', patients.filter(p => p.ltfuStatus === 'Active'))
    },
    {
      label: 'OTZ Plus',
      value: otzPlusPatients.length.toString(),
      icon: Heart,
      color: 'text-fuchsia-600 dark:text-fuchsia-400',
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
      trend: 'Pregnant / Young Mothers',
      clickable: true,
      onClick: () => openPatientList('OTZ Plus Patients (Pregnant / Young Mothers)', otzPlusPatients)
    },
    {
      label: 'LTFU Patients',
      value: ltfuPatients.toString(),
      icon: AlertCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      trend: 'Require follow-up',
      clickable: true,
      onClick: () => openPatientList('Lost to Follow-Up (LTFU)', patients.filter(p => p.ltfuStatus === 'LTFU'))
    },
    {
      label: 'Graduated',
      value: graduatedPatients.toString(),
      icon: GraduationCap,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      trend: 'Over 25 years',
      clickable: true,
      onClick: () => openPatientList('Graduated Patients', patients.filter(p => p.ltfuStatus === 'Graduated'))
    },
    {
      label: 'Transferred Out',
      value: transferredOutPatients.toString(),
      icon: ArrowRightLeft,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      trend: 'Moved to other facility',
      clickable: true,
      onClick: () => openPatientList('Transferred Out Patients', patients.filter(p => p.ltfuStatus === 'Transferred Out'))
    },
    {
      label: 'Deceased',
      value: deadPatients.toString(),
      icon: UserMinus,
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
      trend: 'Mortality',
      clickable: true,
      onClick: () => openPatientList('Deceased Patients', patients.filter(p => p.ltfuStatus === 'Dead'))
    },
    {
      label: 'Pending VL Entry',
      value: pendingVlPatients.length.toString(),
      icon: Activity,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      trend: 'Needs VL update',
      onClick: () => onNavigate ? onNavigate('pending-vl') : undefined,
      clickable: true
    },
    {
      label: 'Upcoming Visits',
      value: upcomingVisits.toString(),
      icon: Calendar,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      trend: 'Pending appointments',
    },
    {
      label: 'High VL Counseling',
      value: pendingCounseling.toString(),
      icon: AlertCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      trend: 'Require counseling',
    },
  ];

  const vlStatusData = vlMetrics.tested > 0 ? [
    { 
      name: 'Suppressed (<50)', 
      count: vlMetrics.suppressed, 
      value: vlMetrics.suppressionRate, 
      color: '#10b981',
      status: 'Suppressed' as const
    },
    { 
      name: 'Unsuppressed (≥50)', 
      count: vlMetrics.unsuppressed, 
      value: vlMetrics.unsuppressionRate, 
      color: '#ef4444',
      status: 'Unsuppressed' as const
    },
  ] : [
    {
      name: 'Pending VL Tests',
      count: vlMetrics.pending,
      value: 100,
      color: '#f59e0b',
      status: 'Pending' as const
    }
  ];

  const recentVisits = [...visits]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          OTZ DASHBOARD
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Overview of clinic performance and patient tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.label} 
              className={cn(
                "relative overflow-hidden",
                stat.clickable && "cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
              )}
              onClick={stat.onClick}
            >
              <div className="flex items-center gap-4">
                <div className={cn('rounded-xl p-3', stat.bg)}>
                  <Icon className={cn('h-6 w-6', stat.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </h3>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
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
            <h3 className="font-semibold text-slate-900 dark:text-white">Monthly Visits</h3>
            <select className="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Viral Load Suppression</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calculated among tested active cohort ({vlMetrics.tested} of {activePatients} tested)
              </p>
            </div>
            {vlMetrics.tested > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 self-start">
                {vlMetrics.suppressionRate}% Suppressed
              </span>
            )}
          </div>
          <div className="flex h-[300px] items-center justify-center">
            {vlMetrics.tested === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Activity className="h-10 w-10 text-amber-500/60" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No VL Results Recorded Yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">All {activePatients} active patients have pending viral load tests.</p>
                <button
                  onClick={() => onNavigate ? onNavigate('pending-vl') : undefined}
                  className="text-xs font-semibold text-indigo-600 hover:underline mt-2 cursor-pointer"
                >
                  Enter Pending Results &rarr;
                </button>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie
                      data={vlStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      onClick={(data: any) => {
                        if (data.status === 'Suppressed' || data.name?.includes('Suppressed (<50)')) {
                          openPatientList('Suppressed Patients (<50 c/ml)', activePatientsList.filter(p => getPatientVlStatus(p) === 'Suppressed'));
                        } else if (data.status === 'Unsuppressed' || data.name?.includes('Unsuppressed')) {
                          openPatientList('Unsuppressed Patients (≥50 c/ml)', activePatientsList.filter(p => getPatientVlStatus(p) === 'Unsuppressed'));
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {vlStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [`${item.payload.count} clients (${val}%)`, name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 pr-4 flex-1">
                  {vlStatusData.map((item) => (
                    <div 
                      key={item.name} 
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all"
                      onClick={() => {
                        if (item.status === 'Suppressed') {
                          openPatientList('Suppressed Patients (<50 c/ml)', activePatientsList.filter(p => getPatientVlStatus(p) === 'Suppressed'));
                        } else if (item.status === 'Unsuppressed') {
                          openPatientList('Unsuppressed Patients (≥50 c/ml)', activePatientsList.filter(p => getPatientVlStatus(p) === 'Unsuppressed'));
                        }
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.count}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                          ({item.value}%)
                        </span>
                      </div>
                    </div>
                  ))}
                  <div 
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all border-t border-slate-100 dark:border-slate-800 pt-2.5"
                    onClick={() => openPatientList('Pending VL Entry', pendingVlPatients)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-3 w-3 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Pending VL
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {vlMetrics.pending}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">
                        ({activePatients > 0 ? Math.round((vlMetrics.pending / activePatients) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        Visit recorded for patient <span className="text-indigo-600 dark:text-indigo-400">{patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{visit.type} • {format(parseISO(visit.date), 'MMM d, yyyy')}</p>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{format(parseISO(visit.date), 'MMM d')}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity recorded.</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Register Patient</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add a new client to the system</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Record Visit</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Log a clinic visit or drug pickup</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Generate Report</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Export monthly clinic statistics</p>
              </div>
            </button>
          </div>
        </Card>
      </div>

      <PatientListModal
        isOpen={listModalOpen}
        onClose={closePatientList}
        title={listModalTitle}
        patients={listModalPatients}
        onSelectPatient={(p) => {
          closePatientList();
          if (onSelectPatient) onSelectPatient(p);
        }}
      />
    </div>
  );
}
