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
    bank: <Landmark size={24} className="text-blue-500 dark:text-blue-400" />,
    up: <ArrowUpCircle size={24} className="text-green-500 dark:text-green-400" />,
    down: <ArrowDownCircle size={24} className="text-red-500 dark:text-red-400" />,
    card: <CreditCard size={24} className="text-purple-500 dark:text-purple-400" />,
    invest: <PiggyBank size={24} className="text-blue-500 dark:text-blue-400" />,
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex-1 flex items-center space-x-4 shadow-sm dark:shadow-none">
      <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-full">
        {ICONS[icon]}
      </div>
      <div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white block">{formatCurrency(value)}</span>
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