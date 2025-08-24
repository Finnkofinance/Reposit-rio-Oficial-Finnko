
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/format';

// Paleta padrão em tons de verde (maior valor = verde mais escuro)
const GREEN_SCALE = ['#065F46','#0F766E','#15803D','#16A34A','#22C55E','#4ADE80','#86EFAC','#BBF7D0'];
// Paleta para despesas: vermelho (maior valor) → laranja (menor valor)
export const ORANGE_RED_SCALE = ['#991B1B','#B91C1C','#DC2626','#EF4444','#F97316','#FB923C','#FDBA74','#FED7AA'];
const OTHERS_COLOR = '#9CA3AF';

type Row = { categoria: string; valor: number };
type Props = {
  rows: Row[];
  onLegendClick?: (categoria: string) => void;
  colors?: string[];
};

const percentFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function DoughnutChart({ rows, onLegendClick, colors }: Props) {
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

  const hasData = total > 0 && dataForChart.length > 0;
  const colorScale = colors && colors.length > 0 ? colors : GREEN_SCALE;
  const visibleLegendCount = Math.min(dataForChart.length, 3);
  const legendRowPx = 56; // aprox altura de cada linha
  const legendMaxHeight = visibleLegendCount * legendRowPx;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className={`relative ${hasData ? 'h-64' : 'h-40'}`}>
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
              {dataForChart.map((entry, i) => {
                const color = entry.categoria === 'Outras' ? OTHERS_COLOR : colorScale[i % colorScale.length];
                return <Cell key={`cell-${i}`} fill={color} />;
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-gray-500 dark:text-slate-400 text-sm">Total</span>
          <span className="text-gray-900 dark:text-white font-extrabold text-2xl">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-1 no-scrollbar" style={{ maxHeight: legendMaxHeight }}>
        {dataForChart.map((d, i) => (
          <button
            key={d.categoria}
            onClick={() => onLegendClick?.(d.categoria)}
            className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800 text-left w-full disabled:cursor-default disabled:hover:bg-gray-50 dark:disabled:hover:bg-slate-800/60"
            disabled={!onLegendClick || d.categoria === 'Outras'}
            title={d.categoria === 'Outras' ? 'Categoria agregada' : `Ver detalhes de ${d.categoria}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-block w-3.5 h-3.5 rounded-full shrink-0" style={{ background: d.categoria === 'Outras' ? OTHERS_COLOR : colorScale[i % colorScale.length] }} />
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