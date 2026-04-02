/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Patient } from '@/src/types';
import React, { useState, useEffect } from 'react';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: Partial<Patient>) => void;
  onCancel: () => void;
}

export function PatientForm({ patient, onSubmit, onCancel }: PatientFormProps) {
  const [formData, setFormData] = useState<Partial<Patient>>({
    clinicNumber: '',
    firstName: '',
    lastName: '',
    age: 0,
    dateOfBirth: '',
    gender: 'Male',
    phone: '',
    address: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    ltfuStatus: 'Active',
  });

  useEffect(() => {
    if (patient) {
      setFormData(patient);
    }
  }, [patient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleDobChange = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setFormData({ ...formData, dateOfBirth: dob, age: age > 0 ? age : 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Clinic Number"
          required
          value={formData.clinicNumber}
          onChange={(e) => setFormData({ ...formData, clinicNumber: e.target.value })}
          placeholder="e.g. OTZ-001"
        />
        <Input
          label="Enrollment Date"
          type="date"
          required
          value={formData.enrollmentDate}
          onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First Name"
          required
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          placeholder="First Name"
        />
        <Input
          label="Last Name"
          required
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          placeholder="Last Name"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Date of Birth"
          type="date"
          required
          value={formData.dateOfBirth}
          onChange={(e) => handleDobChange(e.target.value)}
        />
        <Input
          label="Calculated Age"
          type="number"
          readOnly
          value={formData.age}
          className="bg-slate-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Gender</label>
          <select
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <Input
          label="Phone Number"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Phone Number"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Residential Address"
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">LTFU Status</label>
          <select
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={formData.ltfuStatus}
            onChange={(e) => setFormData({ ...formData, ltfuStatus: e.target.value as any })}
          >
            <option value="Active">Active</option>
            <option value="LTFU">LTFU</option>
            <option value="Dead">Dead</option>
            <option value="Transferred Out">Transferred Out</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {patient ? 'Update Patient' : 'Register Patient'}
        </Button>
      </div>
    </form>
  );
}
