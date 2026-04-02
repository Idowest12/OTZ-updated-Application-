/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Patient } from '@/src/types';
import { formatDate, cn } from '@/src/utils';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Plus,
} from 'lucide-react';

const mockPendingVl: Patient[] = [
  {
    id: '4',
    clinicNumber: 'OTZ-004',
    firstName: 'Sarah',
    lastName: 'Connor',
    age: 19,
    gender: 'Female',
    enrollmentDate: '2024-05-10',
    ltfuStatus: 'Active',
    lastVlDate: '2024-11-15',
  },
  {
    id: '5',
    clinicNumber: 'OTZ-005',
    firstName: 'David',
    lastName: 'Miller',
    age: 17,
    gender: 'Male',
    enrollmentDate: '2024-06-20',
    ltfuStatus: 'Active',
    lastVlDate: '2024-12-01',
  },
];

export function ViralLoadPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Viral Load Management
        </h1>
        <p className="text-slate-500">
          Track VL tests, suppression rates and pending results.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Pending VL Results</h3>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {mockPendingVl.length} Pending
            </span>
          </div>
          <div className="space-y-4">
            {mockPendingVl.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Clinic No: {patient.clinicNumber} • Ordered: {formatDate(patient.lastVlDate)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Enter Result
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-6">
          <h3 className="font-semibold text-slate-900">VL Statistics</h3>
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900">Suppressed</span>
                </div>
                <span className="text-lg font-bold text-emerald-900">85%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-200">
                <div className="h-full w-[85%] rounded-full bg-emerald-600" />
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span className="text-sm font-medium text-rose-900">Unsuppressed</span>
                </div>
                <span className="text-lg font-bold text-rose-900">15%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-rose-200">
                <div className="h-full w-[15%] rounded-full bg-rose-600" />
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">Tests Ordered</span>
                </div>
                <span className="text-lg font-bold text-indigo-900">14</span>
              </div>
              <p className="mt-1 text-xs text-indigo-600">This month</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
