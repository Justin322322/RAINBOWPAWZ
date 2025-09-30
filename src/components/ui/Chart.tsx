'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export type LinePoint = { label: string; value: number };

type ChartBaseProps = {
  className?: string;
  height?: number;
};

type LineProps = ChartBaseProps & { data: LinePoint[]; color?: string };
export function RefundsLineChart({ data, height = 220, className, color = '#1B4D3E' }: LineProps) {
  const hasData = Array.isArray(data) && data.length > 0 && data.some(d => Number(d.value) > 0);
  return (
    <div className={className} style={{ height }}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={(v: number) => `₱${Number(v).toLocaleString()}`} />
            <Tooltip formatter={(v: number) => `₱${Number(v).toLocaleString()}`} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-md border border-dashed border-gray-200">
          No data available for this period
        </div>
      )}
    </div>
  );
}

type BarPoint = { label: string; value: number };
export function BookingsBarChart({ data, height = 220, className }: { data: BarPoint[] } & ChartBaseProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip />
          <Bar dataKey="value" fill="var(--primary-green)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type PiePoint = { name: string; value: number };
export function StatusPieChart({ data, height = 220, className }: { data: PiePoint[] } & ChartBaseProps) {
  const colors = ['#1B4D3E', '#2C7A62', '#86EFAC', '#FBBF24', '#F87171'];
  const hasData = Array.isArray(data) && data.some(d => Number(d.value) > 0);
  return (
    <div className={className} style={{ height }}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie dataKey="value" data={data} outerRadius={80} label>
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-md border border-dashed border-gray-200">
          No bookings to visualize for this period
        </div>
      )}
    </div>
  );
}


