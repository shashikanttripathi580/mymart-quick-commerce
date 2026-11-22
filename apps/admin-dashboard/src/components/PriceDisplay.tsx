import React from 'react';
import { formatPaiseToRupees, calculateDiscountPercentage } from '@mymart/shared';

interface PriceDisplayProps {
  sellingPricePaise: number;
  mrpPaise?: number;
  showDiscountBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  sellingPricePaise,
  mrpPaise,
  showDiscountBadge = true,
  size = 'md',
}) => {
  const discount = mrpPaise ? calculateDiscountPercentage(mrpPaise, sellingPricePaise) : 0;

  const fontSizes = {
    sm: { main: 'text-sm font-semibold', mrp: 'text-xs', badge: 'text-[10px] px-1.5 py-0.5' },
    md: { main: 'text-base font-bold', mrp: 'text-xs', badge: 'text-xs px-2 py-0.5' },
    lg: { main: 'text-xl font-extrabold', mrp: 'text-sm', badge: 'text-xs px-2.5 py-1' },
  }[size];

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <span className={`${fontSizes.main} text-slate-900`}>
        {formatPaiseToRupees(sellingPricePaise)}
      </span>

      {mrpPaise && mrpPaise > sellingPricePaise && (
        <span className={`${fontSizes.mrp} text-slate-400 line-through font-medium`}>
          {formatPaiseToRupees(mrpPaise)}
        </span>
      )}

      {showDiscountBadge && discount > 0 && (
        <span className={`${fontSizes.badge} font-bold text-emerald-700 bg-emerald-100 rounded-md`}>
          {discount}% OFF
        </span>
      )}
    </div>
  );
};
