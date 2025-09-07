'use client';

import React from 'react';
import { RefundSummary } from '@/types/payment';
import StatCard from '../ui/StatCard';
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface RefundSummaryStatsProps {
  summary: RefundSummary;
}

export function RefundSummaryStats({ summary }: RefundSummaryStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dollar-sign':
        return <CurrencyDollarIcon className="h-5 w-5" />;
      case 'check-circle':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'clock':
        return <ClockIcon className="h-5 w-5" />;
      case 'x-circle':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <CurrencyDollarIcon className="h-5 w-5" />;
    }
  };

  const getColor = (value: number, type: string): 'green' | 'blue' | 'purple' | 'amber' | 'yellow' => {
    if (type === 'success_rate') {
      return value >= 90 ? 'green' : value >= 70 ? 'blue' : 'yellow';
    }
    if (type === 'failed_count') {
      return value === 0 ? 'green' : 'yellow';
    }
    return 'blue';
  };

  const stats = [
    {
      label: 'Total Refunded',
      value: formatCurrency(summary.total_amount),
      icon: 'dollar-sign',
      color: 'green' as const
    },
    {
      label: 'Success Rate',
      value: `${summary.success_rate.toFixed(1)}%`,
      icon: 'check-circle',
      color: getColor(summary.success_rate, 'success_rate')
    },
    {
      label: 'Pending',
      value: summary.pending_count.toString(),
      icon: 'clock',
      color: 'blue' as const
    },
    {
      label: 'Failed',
      value: summary.failed_count.toString(),
      icon: 'x-circle',
      color: getColor(summary.failed_count, 'failed_count')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          label={stat.label}
          value={stat.value}
          icon={getIcon(stat.icon)}
          color={stat.color}
        />
      ))}
    </div>
  );
}
