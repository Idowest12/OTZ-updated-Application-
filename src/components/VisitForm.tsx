/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Patient, Visit } from '@/src/types';
import React, { useState } from 'react';

interface VisitFormProps {
  patient: Patient;
  initialType?: string;
  onSubmit: (data: Partial<Visit>) => void;
  onCancel: () => void;
}

export function VisitForm({ patient, initialType, onSubmit, onCancel }: VisitFormProps) {
  const [formData, setFormData] = useState<Partial<Visit>>({
    patientId: patient.id,
    date: new Date().toISOString().split('T')[0],
    type: (initialType as any) || 'Drug Pickup & VL Test',
    notes: '',
    vlResult: undefined,
    nextAppointmentDate: '',
    nextCounselingDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.nextAppointmentDate) {
      newErrors.nextAppointmentDate = 'Next appointment date is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-900">
          Recording visit for: <span className="text-indigo-600">{patient.firstName} {patient.lastName}</span>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <p className="text-xs text-slate-500">Clinic No: {patient.clinicNumber}</p>
          {patient.phone && <p className="text-xs text-slate-500">Phone: {patient.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Visit Date"
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Visit Type</label>
          <select
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          >
            <option value="Drug Pickup & VL Test">Drug Pickup & VL Test</option>
            <option value="Drug Pickup (Proxy)">Drug Pickup (Proxy)</option>
            <option value="Clinical Review">Clinical Review</option>
            <option value="Counselling">Counselling</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4">
          <Input
            label="Next Appointment Date"
            type="date"
            required
            value={formData.nextAppointmentDate}
            onChange={(e) => {
              setFormData({ ...formData, nextAppointmentDate: e.target.value });
              if (errors.nextAppointmentDate) {
                setErrors({ ...errors, nextAppointmentDate: '' });
              }
            }}
            error={errors.nextAppointmentDate}
            className="border-indigo-200 focus:ring-indigo-500"
          />
          <p className="mt-1 text-[10px] text-indigo-600 font-medium uppercase tracking-wider">
            Mandatory: Schedule the next clinic visit
          </p>
        </div>
        <Input
          label="Viral Load Result (if applicable)"
          type="number"
          value={formData.vlResult === undefined ? '' : formData.vlResult}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : parseInt(e.target.value);
            setFormData({ ...formData, vlResult: val });
          }}
          placeholder="e.g. 50"
        />
      </div>

      {(formData.type === 'Counselling' || (formData.vlResult && formData.vlResult >= 50)) && (
        <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-4">
          <Input
            label="Next Counseling Appointment"
            type="date"
            value={formData.nextCounselingDate}
            onChange={(e) => setFormData({ ...formData, nextCounselingDate: e.target.value })}
            className="border-amber-200 focus:ring-amber-500"
          />
          <p className="mt-1 text-[10px] text-amber-600 font-medium uppercase tracking-wider">
            Separate date for online or clinic counseling
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Clinical Notes</label>
        <textarea
          className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter any clinical observations or notes..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Visit Record
        </Button>
      </div>
    </form>
  );
}
