import React, { useState, useMemo } from 'react';
import DoughnutChart, { ORANGE_RED_SCALE } from '@/components/DoughnutChart';
import GraficoBarrasESI from '@/components/GraficoBarrasESI';
import { TransacaoBanco, CompraCartao, ParcelaCartao, Categoria, TipoCategoria } from '@/types/types';

type Period = 'monthly' | 'yearly';
interface ChartContainerProps {
  transacoes: TransacaoBanco[];
  compras: CompraCartao[];
  parcelas: ParcelaCartao[];
  categorias: Categoria[];
  currentMonth: string; // YYYY-MM
}

const ChartContainer: React.FC<ChartContainerProps> = ({ transacoes, compras, parcelas, categorias, currentMonth }) => {
  const [activeTab, setActiveTab] = useState<'categorias' | 'evolucao'>('categorias');
  const [period, setPeriod] = useState<Period>('monthly');
  
  const { startDate, endDate } = useMemo(() => {
    if (period === 'yearly') {
        const year = currentMonth.substring(0, 4);
        return { startDate: `${year}-01-01`, endDate: `${year}-12-31`};
    }
    // monthly
    const [year, month] = currentMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { startDate: `${currentMonth}-01`, endDate: `${currentMonth}-${lastDay}` };
  }, [period, currentMonth]);

  const despesasPorCategoria = useMemo(() => {
    const gastos: Record<string, number> = {};
    const categoriaMap = new Map<string, string>(categorias.map(c => [c.id, c.nome]));

    transacoes
      .filter(t => t.realizado && t.tipo === TipoCategoria.Saida && t.data >= startDate && t.data <= endDate)
      .forEach(t => {
        const nomeCat: string = categoriaMap.get(t.categoria_id) ?? 'Desconhecido';
        gastos[nomeCat] = (gastos[nomeCat] || 0) + t.valor;
      });

    parcelas
      .filter(p => p.competencia_fatura >= startDate.substring(0, 7) && p.competencia_fatura <= endDate.substring(0, 7))
      .forEach(p => {
        const compra = compras.find(c => c.id === p.compra_id && !c.estorno);
        if (compra) {
          const nomeCat: string = categoriaMap.get(compra.categoria_id) ?? 'Desconhecido';
          gastos[nomeCat] = (gastos[nomeCat] || 0) + p.valor_parcela;
        }
      });
      
    return Object.entries(gastos).map(([categoria, valor]) => ({ categoria, valor }));
  }, [transacoes, compras, parcelas, categorias, startDate, endDate]);

    const getMonthData = (month: string) => {
        const transacoesRealizadasMes = transacoes.filter(t => t.data.startsWith(month) && t.realizado);
        const entradas = transacoesRealizadasMes.filter(t => t.tipo === TipoCategoria.Entrada).reduce((sum, t) => sum + t.valor, 0);
        const saidasBanco = transacoesRealizadasMes.filter(t => t.tipo === TipoCategoria.Saida).reduce((sum, t) => sum + t.valor, 0);
        const investimentosMes = transacoesRealizadasMes.filter(t => t.tipo === TipoCategoria.Investimento).reduce((sum, t) => sum + t.valor, 0);
        const parcelasMes = parcelas.filter(p => p.competencia_fatura === month);
        const comprasNoCartao = parcelasMes.filter(p => compras.some(c => c.id === p.compra_id && !c.estorno)).reduce((sum, p) => sum + p.valor_parcela, 0);
        return { entradas, saidas: saidasBanco + comprasNoCartao, investimentos: investimentosMes };
    };

  const historicoMensal = useMemo(() => {
    const data = [];
    const date = new Date(`${currentMonth}-15T12:00:00Z`);
    for (let i = 4; i >= 0; i--) {
      const targetDate = new Date(date);
      targetDate.setUTCMonth(targetDate.getUTCMonth() - i);
      const monthStr = targetDate.toISOString().slice(0, 7);
      const monthData = getMonthData(monthStr);
      data.push({
        mes: targetDate.toLocaleDateString('pt-BR', { month: 'short' }),
        entradas: monthData.entradas,
        saidas: monthData.saidas,
        investimentos: monthData.investimentos,
      });
    }
    return data;
  }, [currentMonth, transacoes, parcelas, compras]);


  const tabButtonClasses = (isActive: boolean) => 
    `px-3 h-9 inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold rounded-md transition-colors ${
      isActive ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600/50'
    }`;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex flex-col shadow-sm dark:shadow-none">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {activeTab === 'categorias' ? 'Despesas por Categoria' : 'Evolução Mensal'}
        </h3>
        <div className="flex items-center space-x-4">
            {activeTab === 'categorias' && (
                 <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700/80 p-1 rounded-lg">
                    <button onClick={() => setPeriod('monthly')} className={tabButtonClasses(period === 'monthly')}>Este Mês</button>
                    <button onClick={() => setPeriod('yearly')} className={tabButtonClasses(period === 'yearly')}>Este Ano</button>
                </div>
            )}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700/80 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('categorias')} 
                className={tabButtonClasses(activeTab === 'categorias')}
            >
                Categorias
            </button>
            <button 
                onClick={() => setActiveTab('evolucao')} 
                className={tabButtonClasses(activeTab === 'evolucao')}
            >
                Evolução
            </button>
            </div>
        </div>
      </div>
      <div className="mt-2">
        {activeTab === 'categorias' && <DoughnutChart rows={despesasPorCategoria} colors={ORANGE_RED_SCALE} />}
        {activeTab === 'evolucao' && <GraficoBarrasESI data={historicoMensal} />}
      </div>
    </div>
  );
};

export default ChartContainer;