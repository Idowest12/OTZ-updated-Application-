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
      default: 'bg-white shadow-sm border border-slate-100',
      outline: 'border border-slate-200 bg-transparent',
      ghost: 'bg-slate-50 border-none',
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
