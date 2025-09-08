import React from 'react';

interface GCashIconProps {
  className?: string;
  size?: number;
}

const GCashIcon: React.FC<GCashIconProps> = ({ className = "h-6 w-6", size }) => {
  const iconSize = size ? `${size}px` : undefined;
  
  return (
    <svg
      width={iconSize || "24"}
      height={iconSize || "24"}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* GCash Logo - Simplified version */}
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="3"
        fill="#0070F3"
      />
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="#FFFFFF"
      />
      {/* G letter */}
      <path
        d="M8 8H14C15.1046 8 16 8.89543 16 10V14C16 15.1046 15.1046 16 14 16H10C8.89543 16 8 15.1046 8 14V12H12V14H14V10H8V8Z"
        fill="#0070F3"
      />
      {/* Cash symbol */}
      <circle
        cx="18"
        cy="10"
        r="2"
        fill="#0070F3"
      />
      <text
        x="18"
        y="11"
        textAnchor="middle"
        fontSize="8"
        fill="white"
        fontWeight="bold"
      >
        ₱
      </text>
    </svg>
  );
};

export default GCashIcon;
