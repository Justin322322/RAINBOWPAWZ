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
  color: _color
}: StatCardProps) {
  // All cards now use solid green styling matching app theme
  const colorMap = {
    bg: 'bg-[var(--primary-green)]',
    iconColor: 'text-white',
    text: 'text-white',
    border: 'border-[var(--primary-green)]',
    hover: 'hover:bg-[var(--primary-green-hover)]',
  };

  // Format the value if it's a number
  const formattedValue = typeof value === 'number' ? 
    value.toLocaleString() : 
    value;

  return (
    <div className={`h-full p-6 xs:p-5 sm:p-5 rounded-xl border ${colorMap.border} ${colorMap.bg} ${colorMap.hover} shadow-md hover:shadow-lg transition-all duration-200`}>
      <div className="flex items-start">
        <div className={`${colorMap.iconColor} mr-4 flex-shrink-0`}>
          <div className="h-8 w-8 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80 truncate">{label}</p>
          <p className={`text-2xl font-bold ${colorMap.text} mt-1`}>
            {formattedValue}
          </p>
        </div>
      </div>
    </div>
  );
}
