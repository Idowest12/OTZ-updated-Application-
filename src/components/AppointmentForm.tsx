import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Patient } from '@/src/types';
import React, { useState } from 'react';

interface AppointmentFormProps {
  patient: Patient;
  onSubmit: (date: string, type: 'Clinic Visit' | 'Counseling') => void;
  onCancel: () => void;
}

export function AppointmentForm({ patient, onSubmit, onCancel }: AppointmentFormProps) {
  const [date, setDate] = useState('');
  const [type, setType] = useState<'Clinic Visit' | 'Counseling'>('Clinic Visit');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Appointment date is required');
      return;
    }
    setError('');
    onSubmit(date, type);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-900">
          Scheduling appointment for: <span className="text-indigo-600">{patient.firstName} {patient.lastName}</span>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <p className="text-xs text-slate-500">MH NO: {patient.clinicNumber}</p>
          {patient.phone && <p className="text-xs text-slate-500">Phone: {patient.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Appointment Date"
          type="date"
          required
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (error) setError('');
          }}
          error={error}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Appointment Type</label>
          <select
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={type}
            onChange={(e) => setType(e.target.value as 'Clinic Visit' | 'Counseling')}
          >
            <option value="Clinic Visit">Clinic Visit</option>
            <option value="Counseling">Counseling</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Schedule Appointment
        </Button>
      </div>
    </form>
  );
}
