/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Patient, OtzPlusType } from '@/src/types';
import React, { useState, useEffect } from 'react';
import { Heart, Baby, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { cn } from '@/src/utils';

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
    gender: 'Female',
    phone: '',
    address: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    ltfuStatus: 'Active',
    isOtzPlus: false,
    otzPlusType: undefined,
    edd: '',
    childDob: '',
    childAgeMonths: undefined,
    childFeedingMethod: undefined,
    isBaselineNil: false,
    baselineVlStatus: undefined,
    baselineVlResult: undefined,
    baselineVlDate: '',
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        ...patient,
        isOtzPlus: patient.isOtzPlus || (patient.otzPlusType != null),
        isBaselineNil: patient.isBaselineNil || patient.baselineVlStatus === 'Nil',
      });
    }
  }, [patient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submissionData = { ...formData };

    // Format OTZ Plus data
    if (!submissionData.isOtzPlus) {
      submissionData.otzPlusType = undefined;
      submissionData.edd = '';
      submissionData.childDob = '';
      submissionData.childAgeMonths = undefined;
      submissionData.childFeedingMethod = undefined;
    }

    // Format Baseline VL
    if (submissionData.isBaselineNil) {
      submissionData.baselineVlStatus = 'Nil';
      submissionData.baselineVlResult = undefined;
      submissionData.isBaselineNil = true;
    } else if (submissionData.baselineVlResult !== undefined && submissionData.baselineVlResult !== null && String(submissionData.baselineVlResult).trim() !== '') {
      const numVal = Number(submissionData.baselineVlResult);
      submissionData.baselineVlResult = isNaN(numVal) ? undefined : numVal;
      submissionData.baselineVlStatus = isNaN(numVal) ? undefined : 'Recorded';
      submissionData.isBaselineNil = false;

      // If patient does not have a routine test result yet, use baseline as initial reference
      if (submissionData.lastVlResult === undefined && !isNaN(numVal)) {
        submissionData.lastVlResult = numVal;
        submissionData.viralLoadResult = numVal;
        submissionData.vlSuppressed = numVal < 50;
        if (submissionData.baselineVlDate) {
          submissionData.lastVlDate = submissionData.baselineVlDate;
        }
      }
    } else {
      submissionData.baselineVlStatus = undefined;
      submissionData.baselineVlResult = undefined;
      submissionData.isBaselineNil = false;
    }

    onSubmit(submissionData);
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

  const handleToggleNilBaseline = () => {
    if (formData.isBaselineNil) {
      // Revert from Nil to entering a number
      setFormData({
        ...formData,
        isBaselineNil: false,
        baselineVlStatus: undefined,
        baselineVlResult: undefined,
      });
    } else {
      // Mark as Nil
      setFormData({
        ...formData,
        isBaselineNil: true,
        baselineVlStatus: 'Nil',
        baselineVlResult: undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="MH NO"
          required
          value={formData.clinicNumber}
          onChange={(e) => setFormData({ ...formData, clinicNumber: e.target.value })}
          placeholder="e.g. OTZ-001"
        />
        <Input
          label="OTZ Enrollment Date"
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
            <option value="Female">Female</option>
            <option value="Male">Male</option>
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
          <label className="text-sm font-medium text-slate-700">ART STATUS</label>
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

      {/* SECTION 1: OTZ PLUS IDENTIFICATION (Pregnant / Mother with Child) */}
      <div className="rounded-2xl border-2 border-fuchsia-100 bg-gradient-to-br from-fuchsia-50/60 via-purple-50/30 to-pink-50/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700 shadow-xs">
              <Heart className="h-5 w-5 fill-fuchsia-500 text-fuchsia-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">OTZ Category</h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold text-fuchsia-800">
                  <Sparkles className="h-3 w-3" />
                  OTZ Plus Support
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Identify pregnant adolescents or young mothers with a child (OTZ Plus)
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-fuchsia-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isOtzPlus: false, otzPlusType: undefined })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                !formData.isOtzPlus
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Standard OTZ
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({ 
                  ...formData, 
                  isOtzPlus: true, 
                  otzPlusType: formData.otzPlusType || 'Pregnant',
                  gender: 'Female' // OTZ Plus is for pregnant or mothers with child
                });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                formData.isOtzPlus
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-xs'
                  : 'text-fuchsia-700 hover:bg-fuchsia-50'
              )}
            >
              <Heart className="h-3.5 w-3.5 fill-current" />
              OTZ Plus
            </button>
          </div>
        </div>

        {/* Detailed OTZ Plus Options */}
        {formData.isOtzPlus && (
          <div className="rounded-xl border border-fuchsia-200/80 bg-white/90 p-4 space-y-4 backdrop-blur-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-fuchsia-900">
                  OTZ Plus Status / Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="flex h-10 w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                  value={formData.otzPlusType || 'Pregnant'}
                  onChange={(e) => setFormData({ ...formData, otzPlusType: e.target.value as OtzPlusType })}
                >
                  <option value="Pregnant">Pregnant</option>
                  <option value="Mother with Child">Mother with Child (Postnatal / Breastfeeding)</option>
                  <option value="Pregnant & Mother with Child">Pregnant & Mother with Child</option>
                </select>
              </div>

              {(formData.otzPlusType === 'Pregnant' || formData.otzPlusType === 'Pregnant & Mother with Child') && (
                <Input
                  label="Expected Delivery Date (EDD)"
                  type="date"
                  value={formData.edd || ''}
                  onChange={(e) => setFormData({ ...formData, edd: e.target.value })}
                  placeholder="Expected Delivery Date"
                />
              )}

              {(formData.otzPlusType === 'Mother with Child' || formData.otzPlusType === 'Pregnant & Mother with Child') && (
                <Input
                  label="Child's Date of Birth"
                  type="date"
                  value={formData.childDob || ''}
                  onChange={(e) => setFormData({ ...formData, childDob: e.target.value })}
                  placeholder="Child DOB"
                />
              )}

              {(formData.otzPlusType === 'Mother with Child' || formData.otzPlusType === 'Pregnant & Mother with Child') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-fuchsia-900">
                    Infant Feeding Method
                  </label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
                    value={formData.childFeedingMethod || ''}
                    onChange={(e) => setFormData({ ...formData, childFeedingMethod: e.target.value as any })}
                  >
                    <option value="">-- Select Feeding Practice --</option>
                    <option value="Exclusive Breastfeeding">Exclusive Breastfeeding (EBF)</option>
                    <option value="Mixed Feeding">Mixed Feeding (MF)</option>
                    <option value="Replacement Feeding">Replacement Feeding (RF)</option>
                    <option value="Weaned">Weaned</option>
                  </select>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-fuchsia-50/80 px-3 py-2 text-xs text-fuchsia-800 flex items-center gap-2">
              <Baby className="h-4 w-4 shrink-0 text-fuchsia-600" />
              <span>
                <strong>OTZ Plus Enrolled:</strong> Client will be flagged with a special OTZ Plus badge and tracked for PMTCT, adherence, and infant monitoring.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: BASELINE / PRE-JOINING VIRAL LOAD WITH NIL BUTTON */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Baseline Viral Load</h4>
              <span className="text-xs font-medium text-slate-500">(Result Before Joining OTZ)</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record the client&apos;s latest VL test result before joining OTZ, or click <strong>&quot;Nil&quot;</strong> if no prior result exists.
            </p>
          </div>

          {/* Quick Nil Toggle Button */}
          <Button
            type="button"
            variant={formData.isBaselineNil ? 'primary' : 'outline'}
            size="sm"
            onClick={handleToggleNilBaseline}
            className={cn(
              'shrink-0 text-xs font-semibold gap-1.5 transition-all',
              formData.isBaselineNil
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-xs'
                : 'hover:border-amber-400 hover:text-amber-700'
            )}
          >
            {formData.isBaselineNil ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Baseline Marked: Nil
              </>
            ) : (
              <>
                <span className="font-bold underline">Click for Nil</span> (No Result)
              </>
            )}
          </Button>
        </div>

        {formData.isBaselineNil ? (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold">Recorded as: Nil (No Prior Result Available)</p>
                <p className="text-amber-700">Client joined OTZ with no prior viral load result. Routine test will be requested at next visit.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleNilBaseline}
              className="text-xs font-semibold text-amber-800 underline hover:text-amber-950 ml-3"
            >
              Enter number instead
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Baseline VL Result (copies / mL)"
                type="number"
                min="0"
                value={formData.baselineVlResult !== undefined ? formData.baselineVlResult : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  setFormData({
                    ...formData,
                    baselineVlResult: val,
                    isBaselineNil: false,
                    baselineVlStatus: val !== undefined ? 'Recorded' : undefined,
                  });
                }}
                placeholder="e.g. 20, 450, 1500 (or click 'Nil')"
              />
              {formData.baselineVlResult !== undefined && formData.baselineVlResult !== null && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
                  {formData.baselineVlResult < 50 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Baseline Suppressed (&lt;50 c/ml)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <AlertCircle className="h-3 w-3" /> Baseline Unsuppressed (≥50 c/ml)
                    </span>
                  )}
                </div>
              )}
            </div>

            <Input
              label="Baseline VL Test Date"
              type="date"
              value={formData.baselineVlDate || ''}
              onChange={(e) => setFormData({ ...formData, baselineVlDate: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
