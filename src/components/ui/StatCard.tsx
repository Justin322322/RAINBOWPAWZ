import React from 'react';

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'green' | 'blue' | 'purple' | 'amber' | 'yellow';
};

export default function StatCard({
  icon,
  label,
  value,
  color
}: StatCardProps) {
  const colorMap = {
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      text: 'text-green-700',
      border: 'border-green-100',
      hover: 'hover:bg-green-50',
    },
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      text: 'text-blue-700',
      border: 'border-blue-100',
      hover: 'hover:bg-blue-50',
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      text: 'text-purple-700',
      border: 'border-purple-100',
      hover: 'hover:bg-purple-50',
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      text: 'text-amber-700',
      border: 'border-amber-100',
      hover: 'hover:bg-amber-50',
    },
    yellow: {
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      text: 'text-yellow-700',
      border: 'border-yellow-100',
      hover: 'hover:bg-yellow-50',
    }
  }[color];

  // Format the value if it's a number
  const formattedValue = typeof value === 'number' ? 
    value.toLocaleString() : 
    value;

  return (
    <div className={`h-full p-6 xs:p-5 sm:p-5 rounded-xl border ${colorMap.border} ${colorMap.bg} ${colorMap.hover} shadow-md hover:shadow-lg transition-all duration-200`}>
      <div className="flex items-start">
        <div className={`p-2.5 rounded-lg ${colorMap.iconBg} ${colorMap.iconColor} mr-4 flex-shrink-0`}>
          <div className="h-5 w-5 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className={`text-2xl font-bold ${colorMap.text} mt-1`}>
            {formattedValue}
          </p>
        </div>
      </div>
    </div>
  );
}
