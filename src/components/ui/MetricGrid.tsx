import React from 'react';
import { cn } from '@/utils/classNames';

interface MetricItem {
  /** Unique identifier used for stable React keys */
  id: string | number;
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

interface MetricGridProps {
  metrics: MetricItem[];
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

const gridCols: Record<Required<MetricGridProps>['cols'], string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export const MetricGrid: React.FC<MetricGridProps> = ({ metrics, cols = 3, className }) => {
  return (
    <div className={cn('grid gap-4 sm:gap-6', gridCols[cols], className)}>
      {metrics.map((m) => (
        <div
          key={m.id}
          className={cn(
            'bg-white border border-gray-200 rounded-lg p-3 sm:p-4 text-center sm:text-left',
            m.className
          )}
        >
          <div className="flex items-center justify-center sm:justify-start mb-2">
            {m.icon && <div className="text-gray-500 mr-2">{m.icon}</div>}
            <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{m.label}</h4>
          </div>
          <div className={cn('text-xl sm:text-2xl font-semibold text-[var(--primary-green)]', m.valueClassName)}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
};



