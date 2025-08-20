
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/format';

// Consistent color palette
const COLORS = ['#19CF67','#FF6B6B','#4F7DFF','#F59E0B','#A855F7','#06B6D4','#F43F5E','#84CC16','#10B981','#EAB308','#EC4899','#60A5FA'];

type Row = { categoria: string; valor: number };
type Props = {
  rows: Row[];
  onLegendClick?: (categoria: string) => void;
};

const percentFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function DoughnutChart({ rows, onLegendClick }: Props) {
  const { dataFinal, total } = useMemo(() => {
    const validRows = rows.filter(r => r.valor > 0);
    const totalValue = validRows.reduce((s, r) => s + r.valor, 0);

    const sorted = [...validRows].sort((a, b) => b.valor - a.valor);
    const MAX_SLICES = 11;
    let finalData = sorted;

    if (sorted.length > MAX_SLICES) {
      const top = sorted.slice(0, MAX_SLICES);
      const otherValue = sorted.slice(MAX_SLICES).reduce((s, r) => s + r.valor, 0);
      finalData = [...top, { categoria: 'Outras', valor: otherValue }];
    }

    return { dataFinal: finalData, total: totalValue };
  }, [rows]);

  const dataForChart = useMemo(() => {
    return dataFinal.map(d => ({
      ...d,
      percent: total > 0 ? d.valor / total : 0,
    }));
  }, [dataFinal, total]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="z-[60] rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 px-3 py-2 shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="font-semibold">{p.categoria}</div>
        <div>{formatCurrency(p.valor)} • {percentFormatter.format(p.percent)}</div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center min-h-[350px]">
      <div className="relative h-80">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={dataForChart}
              dataKey="valor"
              nameKey="categoria"
              innerRadius="70%"
              outerRadius="100%"
              minAngle={4}
              strokeWidth={2}
              stroke="currentColor"
              className="text-white dark:text-gray-800"
              isAnimationActive={false}
            >
              {dataForChart.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-gray-500 dark:text-slate-400 text-sm">Total de Despesas</span>
          <span className="text-gray-900 dark:text-white font-extrabold text-2xl">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-1 h-80 no-scrollbar">
        {dataForChart.map((d, i) => (
          <button
            key={d.categoria}
            onClick={() => onLegendClick?.(d.categoria)}
            className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800 text-left w-full disabled:cursor-default disabled:hover:bg-gray-50 dark:disabled:hover:bg-slate-800/60"
            disabled={!onLegendClick || d.categoria === 'Outras'}
            title={d.categoria === 'Outras' ? 'Categoria agregada' : `Ver detalhes de ${d.categoria}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-block w-3.5 h-3.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate text-gray-800 dark:text-slate-100">{d.categoria}</span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-gray-800 dark:text-slate-100 font-medium">{percentFormatter.format(d.percent)}</div>
              <div className="text-gray-500 dark:text-slate-400 text-xs">{formatCurrency(d.valor)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}