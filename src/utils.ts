/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined) {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function getDaysUntil(date: string | undefined) {
  if (!date) return null;
  const d = parseISO(date);
  const today = new Date();
  return differenceInDays(d, today);
}

export function getLtfuStatus(lastVisitDate: string | undefined, thresholdDays = 90) {
  if (!lastVisitDate) return 'Active';
  const d = parseISO(lastVisitDate);
  const today = new Date();
  const daysSinceLastVisit = differenceInDays(today, d);
  return daysSinceLastVisit > thresholdDays ? 'LTFU' : 'Active';
}

export function maskName(name: string | undefined, privacyMode: boolean): string {
  if (!name) return 'N/A';
  if (!privacyMode) return name;
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      return part[0] + '*'.repeat(Math.max(1, part.length - 1));
    })
    .join(' ');
}

export function maskPhone(phone: string | undefined, privacyMode: boolean): string {
  if (!phone) return 'N/A';
  if (!privacyMode) return phone;
  if (phone.length <= 4) return '***';
  const visibleLast = phone.slice(-4);
  const prefix = phone.slice(0, 3);
  return `${prefix} **** ${visibleLast}`;
}

export function maskId(idStr: string | undefined, privacyMode: boolean): string {
  if (!idStr) return 'N/A';
  if (!privacyMode) return idStr;
  if (idStr.length <= 4) return '***';
  return idStr.slice(0, 2) + '*'.repeat(Math.max(2, idStr.length - 4)) + idStr.slice(-2);
}

export type VLSuppressionStatus = 'Suppressed' | 'Unsuppressed' | 'Pending';

export interface VLMetrics {
  suppressed: number;
  unsuppressed: number;
  pending: number;
  tested: number;
  suppressionRate: number;
  unsuppressionRate: number;
  total: number;
}

/**
 * Determines exact viral load suppression status for a patient.
 * Suppressed is strictly < 50 c/mL (or explicit boolean true).
 * Unsuppressed is >= 50 c/mL (or explicit boolean false).
 * Pending is when no valid viral load result has been recorded yet.
 */
export function getPatientVlStatus(patient: {
  vlSuppressed?: boolean | null;
  lastVlResult?: number | string | null;
  viralLoadResult?: number | string | null;
  baselineVlResult?: number | string | null;
  isBaselineNil?: boolean | null;
  baselineVlStatus?: string | null;
}): VLSuppressionStatus {
  // 1. Explicit boolean on patient record
  if (patient.vlSuppressed === true) return 'Suppressed';
  if (patient.vlSuppressed === false) return 'Unsuppressed';

  // 2. Latest routine VL result
  const routineVl = patient.lastVlResult ?? patient.viralLoadResult;
  if (routineVl !== undefined && routineVl !== null && routineVl !== '') {
    const num = Number(routineVl);
    if (!isNaN(num)) {
      return num < 50 ? 'Suppressed' : 'Unsuppressed';
    }
  }

  // 3. Baseline VL if routine test is not yet performed
  if (!patient.isBaselineNil && patient.baselineVlStatus !== 'Nil' && patient.baselineVlResult !== undefined && patient.baselineVlResult !== null && patient.baselineVlResult !== '') {
    const num = Number(patient.baselineVlResult);
    if (!isNaN(num)) {
      return num < 50 ? 'Suppressed' : 'Unsuppressed';
    }
  }

  return 'Pending';
}

/**
 * Accurately calculates viral load metrics and percentage rates.
 * The suppression rate is calculated solely among tested clients (tested = suppressed + unsuppressed).
 * Pending clients are not miscalculated as unsuppressed.
 */
export function calculateVlMetrics(patients: Array<any>): VLMetrics {
  let suppressed = 0;
  let unsuppressed = 0;
  let pending = 0;

  for (const p of patients) {
    const status = getPatientVlStatus(p);
    if (status === 'Suppressed') {
      suppressed++;
    } else if (status === 'Unsuppressed') {
      unsuppressed++;
    } else {
      pending++;
    }
  }

  const tested = suppressed + unsuppressed;
  const suppressionRate = tested > 0 ? Math.round((suppressed / tested) * 100) : 0;
  const unsuppressionRate = tested > 0 ? 100 - suppressionRate : 0;

  return {
    suppressed,
    unsuppressed,
    pending,
    tested,
    suppressionRate,
    unsuppressionRate,
    total: patients.length,
  };
}
