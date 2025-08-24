import React from 'react';
import { Landmark, ArrowUpCircle, ArrowDownCircle, CreditCard, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface KPICardProps {
  label: string;
  value: number;
  icon: 'bank' | 'up' | 'down' | 'card' | 'invest';
  projectedValue?: number;
  projectedLabel?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, projectedValue, projectedLabel }) => {
  const ICONS = {
    bank: <Landmark size={18} className="text-blue-500 dark:text-blue-400 sm:size-6" />,
    up: <ArrowUpCircle size={18} className="text-green-500 dark:text-green-400 sm:size-6" />,
    down: <ArrowDownCircle size={18} className="text-red-500 dark:text-red-400 sm:size-6" />,
    card: <CreditCard size={18} className="text-purple-500 dark:text-purple-400 sm:size-6" />,
    invest: <PiggyBank size={18} className="text-blue-500 dark:text-blue-400 sm:size-6" />,
  };

  return (
    <div className="min-h-[96px] rounded-xl sm:rounded-2xl bg-white dark:bg-gray-800 px-3.5 py-3 sm:px-4 sm:py-4 flex flex-col justify-between shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2">
        <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700/50 rounded-full">
          {ICONS[icon]}
        </div>
        <span className="text-[12px] sm:text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div>
        <span className="block text-[17px] sm:text-2xl font-semibold text-gray-900 dark:text-white">{formatCurrency(value)}</span>
        {projectedValue !== undefined && projectedLabel && (
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">{projectedLabel}:</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{formatCurrency(projectedValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;