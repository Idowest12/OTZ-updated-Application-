/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Patient } from '../types';
import { MapPin, AlertTriangle } from 'lucide-react';

interface TransferFormProps {
  patient: Patient;
  onSubmit: (destination: string) => void;
  onCancel: () => void;
}

export function TransferForm({ patient, onSubmit, onCancel }: TransferFormProps) {
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please enter the destination facility name.');
      return;
    }
    onSubmit(destination.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Transfer Out Confirmation</p>
          <p className="mt-1">
            You are about to mark <span className="font-bold">{patient.firstName} {patient.lastName}</span> ({patient.clinicNumber}) as Transferred Out. This will update their status and record a transfer event in their history.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          Destination Facility / Clinic
        </label>
        <Input
          placeholder="Enter the name of the facility receiving the client..."
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            if (error) setError('');
          }}
          className={error ? 'border-rose-500 focus:ring-rose-500' : ''}
          autoFocus
        />
        {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-rose-600 hover:bg-rose-700">
          Confirm Transfer
        </Button>
      </div>
    </form>
  );
}
