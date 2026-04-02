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
