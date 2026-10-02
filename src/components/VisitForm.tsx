/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Patient, Visit } from '@/src/types';
import React, { useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface VisitFormProps {
  patient: Patient;
  initialType?: string;
  onSubmit: (data: Partial<Visit>) => Promise<void> | void;
  onCancel: () => void;
}

export function VisitForm({ patient, initialType, onSubmit, onCancel }: VisitFormProps) {
  // Check if patient has had a VL test in the last 6 months (180 days)
  const hasRecentVl = patient.lastVlDate ? (() => {
    const vlDate = new Date(patient.lastVlDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - vlDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 180;
  })() : false;

  const getVlAgeMessage = () => {
    if (!patient.lastVlDate) return '';
    const vlDate = new Date(patient.lastVlDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - vlDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    
    if (months === 0) {
      return `${diffDays} days ago`;
    }
    return `${months} month${months > 1 ? 's' : ''}${days > 0 ? ` and ${days} day${days > 1 ? 's' : ''}` : ''} ago`;
  };

  const [formData, setFormData] = useState<Partial<Visit>>({
    patientId: patient.id,
    date: new Date().toISOString().split('T')[0],
    type: (initialType as any) || (hasRecentVl ? 'Drug Pickup (Client)' : 'Drug Pickup & VL Test'),
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return; // Prevent double click
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Error submitting visit form:', err);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-900">
          Recording visit for: <span className="text-indigo-600">{patient.firstName} {patient.lastName}</span>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <p className="text-xs text-slate-500">MH NO: {patient.clinicNumber}</p>
          {patient.phone && <p className="text-xs text-slate-500">Phone: {patient.phone}</p>}
        </div>
      </div>

      {hasRecentVl && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 space-y-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Recent Viral Load Test Detected</h4>
              <p className="text-xs text-amber-700 mt-1">
                This client had a Viral Load test recorded on <span className="font-bold">{patient.lastVlDate}</span> ({getVlAgeMessage()}), which is within the 6-month window. A new Viral Load test is not required today.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-100/60 mt-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Drug Pickup (Client)' })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition cursor-pointer ${
                formData.type === 'Drug Pickup (Client)'
                  ? "bg-amber-600 text-white font-medium"
                  : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/50"
              }`}
            >
              Select "Drug Pickup (Client)" (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Drug Pickup (Proxy)' })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition cursor-pointer ${
                formData.type === 'Drug Pickup (Proxy)'
                  ? "bg-amber-600 text-white font-medium"
                  : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/50"
              }`}
            >
              Select "Drug Pickup (Proxy)"
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Clinical Review' })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition cursor-pointer ${
                formData.type === 'Clinical Review'
                  ? "bg-amber-600 text-white font-medium"
                  : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-100/50"
              }`}
            >
              Select "Clinical Review"
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Drug Pickup & VL Test' })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                formData.type === 'Drug Pickup & VL Test'
                  ? "bg-amber-800 text-amber-950 font-bold underline decoration-amber-500 underline-offset-4"
                  : "text-amber-700 hover:underline"
              }`}
            >
              Keep "Drug Pickup & VL Test" anyway
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Visit Date"
          type="date"
          required
          value={formData.date ?? ''}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Visit Type</label>
          <select
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={formData.type ?? 'Drug Pickup & VL Test'}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          >
            <option value="Drug Pickup & VL Test">Drug Pickup & VL Test</option>
            <option value="Drug Pickup (Client)">Drug Pickup (Client)</option>
            <option value="Drug Pickup (Proxy)">Drug Pickup (Proxy)</option>
            <option value="Clinical Review">Clinical Review</option>
            <option value="Counselling">Counselling</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Viral Load Result (copies/ml)"
          type="number"
          placeholder="Leave blank if no result"
          value={formData.vlResult != null ? formData.vlResult : ''}
          onChange={(e) => setFormData({ ...formData, vlResult: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Input
          label="Next Appointment Date"
          type="date"
          value={formData.nextAppointmentDate ?? ''}
          onChange={(e) => setFormData({ ...formData, nextAppointmentDate: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Clinical Notes</label>
        <textarea
          className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          value={formData.notes ?? ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter any clinical observations or notes..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving Visit...
            </>
          ) : (
            'Save Visit Record'
          )}
        </Button>
      </div>
    </form>
  );
}
