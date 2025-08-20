
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { brMoney } from '@/utils/format';

type ChartData = {
  mes: string;
  entradas: number;
  saidas: number;
  investimentos: number;
};

interface GraficoBarrasESIProps {
  data: ChartData[];
}

export default function GraficoBarrasESI({ data }: GraficoBarrasESIProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-bold text-gray-900 dark:text-white mb-2">{`Mês: ${label}`}</p>
          {payload.map((pld: any) => (
            <div key={pld.dataKey} style={{ color: pld.color }} className="flex justify-between space-x-4">
              <span className="text-gray-700 dark:text-gray-300">{pld.name}:</span>
              <span className="font-semibold">{brMoney.format(pld.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 h-full flex flex-col shadow-sm dark:shadow-none">
      <div className="font-semibold text-gray-900 dark:text-white mb-4">Entradas x Saídas x Investimentos (5 meses)</div>
      <div className="flex-grow h-72 min-h-[300px] text-gray-600 dark:text-gray-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
            <XAxis dataKey="mes" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis 
                stroke="currentColor"
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(v) => brMoney.format(v as number).replace('R$', '').trim()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.1 }} />
            <Legend wrapperStyle={{fontSize: "14px", paddingTop: "15px"}}/>
            <Bar dataKey="entradas" name="Entradas" fill="#19CF67" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="investimentos" name="Investimentos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}