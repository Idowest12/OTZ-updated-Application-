/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '@/src/utils';
import { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800',
      outline: 'border border-slate-200 dark:border-slate-700 bg-transparent',
      ghost: 'bg-slate-50 dark:bg-slate-800 border-none',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl p-6', variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
