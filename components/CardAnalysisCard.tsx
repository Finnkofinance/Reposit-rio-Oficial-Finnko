import React, { useState, useMemo } from 'react';
import DoughnutChart from './DoughnutChart';
import { CompraCartao, ParcelaCartao, Categoria, Cartao } from '../types';
import { ChevronDown } from 'lucide-react';

interface CardAnalysisCardProps {
  compras: CompraCartao[];
  parcelas: ParcelaCartao[];
  categorias: Categoria[];
  cartoes: Cartao[];
  currentMonth: string;
}

const CardAnalysisCard: React.FC<CardAnalysisCardProps> = ({ compras, parcelas, categorias, cartoes, currentMonth }) => {
  const [selectedCardId, setSelectedCardId] = useState('all');

  const cardExpensesData = useMemo(() => {
    const gastos: Record<string, number> = {};
    const categoriaMap = new Map(categorias.map(c => [c.id, c.nome]));

    parcelas
      .filter(p => p.competencia_fatura === currentMonth)
      .forEach(p => {
        const compra = compras.find(c => c.id === p.compra_id && !c.estorno);
        if (!compra) return;

        if (selectedCardId !== 'all' && compra.cartao_id !== selectedCardId) {
            return;
        }

        const nomeCat = categoriaMap.get(compra.categoria_id) || 'Desconhecido';
        gastos[nomeCat] = (gastos[nomeCat] || 0) + p.valor_parcela;
      });
      
    return Object.entries(gastos).map(([categoria, valor]) => ({ categoria, valor }));
  }, [compras, parcelas, categorias, currentMonth, selectedCardId]);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl h-full flex flex-col shadow-sm dark:shadow-none">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Análise de Despesas do Cartão
        </h3>
        <div className="relative">
          <select 
            value={selectedCardId}
            onChange={e => setSelectedCardId(e.target.value)}
            className="bg-gray-100 dark:bg-gray-700/80 p-2 pl-3 pr-10 rounded-lg text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
          >
            <option value="all">Todos os Cartões</option>
            {cartoes.map(cartao => (
              <option key={cartao.id} value={cartao.id}>{cartao.apelido}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" size={18} />
        </div>
      </div>
      <div className="flex-grow">
        {cardExpensesData.length > 0 ? (
            <DoughnutChart rows={cardExpensesData} />
        ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 min-h-[350px]">
                <p>Nenhuma despesa no cartão para o período/filtro selecionado.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CardAnalysisCard;