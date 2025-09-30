'use client';

import React from 'react';
import { cn } from '@/utils/classNames';

type MetricTileProps = {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
};

export default function MetricTile({ icon, label, value, hint, className }: MetricTileProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow',
        'p-4 md:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="h-10 w-10 rounded-lg bg-[var(--primary-green-bg)] text-[var(--primary-green)] flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
            <div className="mt-1 text-2xl md:text-3xl font-semibold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          </div>
        </div>
        {hint && <div className="text-xs text-gray-400">{hint}</div>}
      </div>
    </div>
  );
}


