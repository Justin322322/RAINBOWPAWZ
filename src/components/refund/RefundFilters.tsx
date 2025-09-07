'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Select from '../ui/Select';

interface RefundFiltersType {
  status: string;
  limit: number;
  offset: number;
}

interface RefundFiltersProps {
  filters: RefundFiltersType;
  onFilterChange: (filters: Partial<RefundFiltersType>) => void;
}

export function RefundFilters({ filters, onFilterChange }: RefundFiltersProps) {
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'succeeded', label: 'Succeeded' },
    { value: 'failed', label: 'Failed' },
    { value: 'processing', label: 'Processing' },
    { value: 'pending', label: 'Pending' }
  ];

  const limitOptions = [
    { value: '10', label: '10 per page' },
    { value: '20', label: '20 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              options={statusOptions}
              value={filters.status}
              onChange={(value: string) => onFilterChange({ status: value })}
              placeholder="All Statuses"
            />
          </div>

          {/* Items Per Page */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items per page
            </label>
            <Select
              options={limitOptions}
              value={filters.limit.toString()}
              onChange={(value: string) => onFilterChange({ limit: parseInt(value), offset: 0 })}
              placeholder="20 per page"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
