'use client';

import React from 'react';

export type LinePoint = { label: string; value: number };

type RefundsLineChartProps = {
  data: LinePoint[];
  height?: number;
  className?: string;
};

// Lightweight, dependency-free responsive SVG line chart
export function RefundsLineChart({ data, height = 220, className }: RefundsLineChartProps) {
  const width = 600; // virtual width; will scale via viewBox
  const padding = { top: 16, right: 16, bottom: 32, left: 40 };

  const values = data.map(d => d.value);
  const max = Math.max(1, ...values);
  const min = 0;

  const xStep = (width - padding.left - padding.right) / Math.max(1, data.length - 1);
  const yScale = (v: number) => {
    const usable = height - padding.top - padding.bottom;
    return padding.top + usable - ((v - min) / (max - min)) * usable;
  };

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: yScale(d.value)
  }));

  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(' ');

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid */}
        <g stroke="#e5e7eb" strokeWidth={1} opacity={0.7}>
          {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
            const y = padding.top + (height - padding.top - padding.bottom) * t;
            return <line key={idx} x1={padding.left} y1={y} x2={width - padding.right} y2={y} />;
          })}
        </g>

        {/* Line */}
        <path d={path} fill="none" stroke="var(--primary-green)" strokeWidth={3} />

        {/* Area */}
        <path
          d={`${path} L ${padding.left + (data.length - 1) * xStep},${height - padding.bottom} L ${padding.left},${height - padding.bottom} Z`}
          fill="rgba(27, 77, 62, 0.08)"
        />

        {/* Dots */}
        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={3} fill="var(--primary-green)" />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={padding.left + i * xStep}
            y={height - 8}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}


