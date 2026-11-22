import React from 'react';
import { OrderStatus, ORDER_STATUS_DETAILS } from '@mymart/shared';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const details = ORDER_STATUS_DETAILS[status] || {
    label: status,
    color: '#64748b',
    bgColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses}`}
      style={{
        backgroundColor: details.bgColor,
        color: details.color,
        borderColor: details.borderColor,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: details.color }}
      />
      {details.label}
    </span>
  );
};
