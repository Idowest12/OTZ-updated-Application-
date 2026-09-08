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
