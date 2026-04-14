/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Users,
  Activity,
  AlertCircle,
  FlaskConical
} from 'lucide-react';
import { Patient, Visit, CounselingTrack } from '@/src/types';
import { format, parseISO, subDays, isBefore, subMonths } from 'date-fns';

export function Reports({ patients, visits, tracks = [] }: { patients: Patient[], visits: Visit[], tracks?: CounselingTrack[] }) {
  const [reportPeriod, setReportPeriod] = useState<string>('cumulative');

  const monthOptions = [
    { value: 'cumulative', label: 'Cumulative (All Time)' },
    ...Array.from({ length: 12 }).map((_, i) => {
      const d = subMonths(new Date(), i);
      return {
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy')
      };
    })
  ];
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] === null || row[header] === undefined ? '' : row[header];
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateDetailedCounselingReport = () => {
    const now = new Date();
    const reportData = tracks.map(track => {
      const patient = patients.find(p => p.id === track.patientId);
      return {
        ClinicNumber: track.clinicNumber,
        PatientName: track.patientName,
        VLResult: track.vlResult,
        StartDate: track.startDate,
        Session1_Status: track.session1.status,
        Session1_Date: track.session1.date || 'N/A',
        Session2_Status: track.session2.status,
        Session2_Date: track.session2.date || 'N/A',
        Session3_Status: track.session3.status,
        Session3_Date: track.session3.date || 'N/A',
        Completed: track.completed ? 'Yes' : 'No',
        CompletionDate: track.completionDate || 'N/A'
      };
    });

    downloadCSV(reportData, 'Detailed_Counseling_Tracker');
  };

  const generateMonthlyCounselingCompletionReport = () => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    const completedThisMonth = tracks.filter(t => t.completed && t.completionDate?.startsWith(currentMonth));
    const pendingThisMonth = tracks.filter(t => !t.completed);

    const reportData = [
      ...completedThisMonth.map(t => ({
        Month: currentMonth,
        Status: 'Completed',
        ClinicNumber: t.clinicNumber,
        Name: t.patientName,
        CompletionDate: t.completionDate
      })),
      ...pendingThisMonth.map(t => ({
        Month: currentMonth,
        Status: 'Pending',
        ClinicNumber: t.clinicNumber,
        Name: t.patientName,
        SessionsDone: (t.session1.status === 'Completed' ? 1 : 0) + 
                      (t.session2.status === 'Completed' ? 1 : 0) + 
                      (t.session3.status === 'Completed' ? 1 : 0)
      }))
    ];

    downloadCSV(reportData, `Counseling_Monthly_Status_${currentMonth}`);
  };

  const generateVisitReport = () => {
    const filteredVisits = visits.filter(v => {
      if (reportPeriod === 'cumulative') return true;
      return v.date.startsWith(reportPeriod);
    });

    const reportData = filteredVisits.map(v => {
      const patient = patients.find(p => p.id === v.patientId);
      return {
        Date: v.date,
        MH_NO: patient?.clinicNumber || 'N/A',
        PatientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        VisitType: v.type,
        VLResult: v.vlResult !== undefined && v.vlResult !== null ? v.vlResult : '',
        Notes: v.notes || ''
      };
    });

    const filename = reportPeriod === 'cumulative' ? 'Cumulative_Clinic_Visits' : `Clinic_Visits_${reportPeriod}`;
    downloadCSV(reportData, filename);
  };

  const generateVLTestReport = () => {
    const filteredVisits = visits.filter(v => {
      const hasTest = v.vlResult !== undefined && v.vlResult !== null;
      if (!hasTest) return false;
      if (reportPeriod === 'cumulative') return true;
      return v.date.startsWith(reportPeriod);
    });

    const reportData = filteredVisits.map(v => {
      const patient = patients.find(p => p.id === v.patientId);
      return {
        Date: v.date,
        MH_NO: patient?.clinicNumber || 'N/A',
        PatientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        Age: patient?.age || '',
        Gender: patient?.gender || '',
        VLResult: v.vlResult,
        Suppressed: (v.vlResult as number) < 50 ? 'Yes' : 'No'
      };
    });

    const filename = reportPeriod === 'cumulative' ? 'Cumulative_VL_Tests' : `VL_Tests_${reportPeriod}`;
    downloadCSV(reportData, filename);
  };

  const generateLTFUReport = () => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    const ltfuList = patients.filter(p => {
      if (!p.lastVisitDate) return true;
      return isBefore(parseISO(p.lastVisitDate), ninetyDaysAgo);
    });

    const reportData = ltfuList.map(p => ({
      ClinicNumber: p.clinicNumber,
      Name: `${p.firstName} ${p.lastName}`,
      Age: p.age,
      Gender: p.gender,
      LastVisit: p.lastVisitDate || 'Never',
      Status: p.ltfuStatus
    }));

    downloadCSV(reportData, 'LTFU_Tracking_List');
  };

  const generateVLStatsReport = () => {
    const reportData = patients.map(p => ({
      ClinicNumber: p.clinicNumber,
      Name: `${p.firstName} ${p.lastName}`,
      Age: p.age,
      Gender: p.gender,
      LastVLDate: p.lastVlDate || 'N/A',
      LastVLResult: p.lastVlResult || 'N/A',
      Suppressed: p.vlSuppressed ? 'Yes' : 'No'
    }));

    downloadCSV(reportData, 'Viral_Load_Statistics');
  };

  const generateEnrollmentReport = () => {
    const reportData = patients.map(p => ({
      ClinicNumber: p.clinicNumber,
      Name: `${p.firstName} ${p.lastName}`,
      EnrollmentDate: p.enrollmentDate,
      AgeAtEnrollment: p.age,
      Gender: p.gender,
      Status: p.ltfuStatus
    }));

    downloadCSV(reportData, 'Patient_Enrollment_Summary');
  };

  const generateCounsellingReport = () => {
    const counsellingVisits = visits.filter(v => v.type === 'Counselling')
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const patientCounsellingMap = new Map<string, Visit[]>();
    counsellingVisits.forEach(v => {
      const list = patientCounsellingMap.get(v.patientId) || [];
      list.push(v);
      patientCounsellingMap.set(v.patientId, list);
    });

    const reportData = Array.from(patientCounsellingMap.entries()).map(([patientId, pVisits]) => {
      const patient = patients.find(p => p.id === patientId);
      const startDate = pVisits[0].date;
      const completionDate = pVisits.length >= 3 ? pVisits[2].date : 'N/A';
      
      let status = 'In Progress';
      if (pVisits.length >= 3) {
        status = 'Completed';
      } else if (pVisits.length === 1) {
        status = 'Started';
      }

      return {
        ClinicNumber: patient?.clinicNumber || 'N/A',
        Name: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        SessionsCompleted: pVisits.length,
        StartDate: startDate,
        CompletionDate: completionDate,
        Status: status,
        LastSessionDate: pVisits[pVisits.length - 1].date
      };
    });

    downloadCSV(reportData, 'Counselling_Status_Tracker');
  };

  const generateMonthlyCounsellingReport = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const patientCounsellingMap = new Map<string, Visit[]>();
    visits.filter(v => v.type === 'Counselling')
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .forEach(v => {
        const list = patientCounsellingMap.get(v.patientId) || [];
        list.push(v);
        patientCounsellingMap.set(v.patientId, list);
      });

    const reportData = Array.from(patientCounsellingMap.entries()).filter(([_, pVisits]) => {
      // Check if any session occurred in the current month
      return pVisits.some(v => {
        const d = parseISO(v.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }).map(([patientId, pVisits]) => {
      const patient = patients.find(p => p.id === patientId);
      const firstVisit = pVisits[0];
      const firstVisitDate = parseISO(firstVisit.date);
      
      const startedThisMonth = firstVisitDate.getMonth() === currentMonth && firstVisitDate.getFullYear() === currentYear;
      
      const thirdVisit = pVisits[2];
      const finishedThisMonth = thirdVisit && 
        parseISO(thirdVisit.date).getMonth() === currentMonth && 
        parseISO(thirdVisit.date).getFullYear() === currentYear;

      let activity = 'Continuing';
      if (startedThisMonth) activity = 'Started';
      if (finishedThisMonth) activity = 'Completed';

      return {
        ClinicNumber: patient?.clinicNumber || 'N/A',
        Name: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        ActivityThisMonth: activity,
        TotalSessions: pVisits.length,
        LastSessionDate: pVisits[pVisits.length - 1].date
      };
    });

    downloadCSV(reportData, `Monthly_Counselling_Report_${format(now, 'MMM_yyyy')}`);
  };

  const reports = [
    {
      title: 'Monthly Counseling Status',
      description: 'Monthly summary of who completed or is still pending in their 3-session counseling cycle.',
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      onDownload: generateMonthlyCounselingCompletionReport
    },
    {
      title: 'Detailed Counseling Tracker',
      description: 'Full history of all unsuppressed patients in the counseling cycle with session dates.',
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      onDownload: generateDetailedCounselingReport
    },
    {
      title: 'Clinic Visit Report',
      description: 'Summary of patient visits based on the selected time period.',
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      onDownload: generateVisitReport
    },
    {
      title: 'Viral Load Test Report',
      description: 'List of patients who did a Viral Load test in the selected time period.',
      icon: FlaskConical,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      onDownload: generateVLTestReport
    },
    {
      title: 'Monthly Counselling Summary',
      description: 'Track who started, completed, or continued counselling in the current month.',
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      onDownload: generateMonthlyCounsellingReport
    },
    {
      title: 'Counselling Status Tracker',
      description: 'Full history of all patients in the 3-month EAC counselling cycle.',
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      onDownload: generateCounsellingReport
    },
    {
      title: 'LTFU Tracking List',
      description: 'List of patients who have missed their appointments by more than 90 days.',
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      onDownload: generateLTFUReport
    },
    {
      title: 'Viral Load Statistics',
      description: 'Detailed breakdown of suppression rates across different age groups and genders.',
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      onDownload: generateVLStatsReport
    },
    {
      title: 'Patient Enrollment Summary',
      description: 'Tracking of new enrollments and demographic trends over time.',
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      onDownload: generateEnrollmentReport
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reports & Exports
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Generate and export clinic data for analysis and reporting.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Calendar className="h-5 w-5 text-slate-400 ml-2" />
          <select
            className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer pr-8"
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="group transition-all hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className={cn('rounded-xl p-3', report.bg, 'dark:bg-opacity-20')}>
                  <Icon className={cn('h-6 w-6', report.color)} />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {report.description}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                <span className="text-xs text-slate-400 dark:text-slate-500">Real-time data</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                  onClick={report.onDownload}
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">Custom Export</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Select specific data fields to export to CSV.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[
            'Patient Demographics',
            'Visit History',
            'VL Results',
            'Appointments',
            'LTFU Status',
            'Drug Pickups',
            'Clinical Notes',
            'Counseling Records',
          ].map((field) => (
            <label key={field} className="flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{field}</span>
            </label>
          ))}
        </div>
        <div className="mt-8 flex justify-end">
          <Button size="md" className="gap-2" onClick={() => downloadCSV(patients, 'Full_Patient_Export')}>
            <Download className="h-4 w-4" />
            Generate Full Export
          </Button>
        </div>
      </Card>
    </div>
  );
}

import { cn } from '@/src/utils';
