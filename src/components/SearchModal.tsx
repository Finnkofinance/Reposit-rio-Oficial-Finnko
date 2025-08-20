
import React from 'react';
import Modal from '@/components/Modal';
import { Search, Landmark, CreditCard, ShoppingCart, ArrowRightLeft, Plus, Target, BarChartHorizontal, TrendingUp } from 'lucide-react';
import { ContaBancaria, Cartao, TransacaoBanco, CompraCartao, ObjetivoInvestimento, Categoria, Ativo } from '@/types/types';
import { formatCurrency, formatDate } from '@/utils/format';

interface SearchAction {
  id: string;
  label: string;
  onClick: () => void;
}

interface SearchResults {
  actions: SearchAction[];
  contas: ContaBancaria[];
  cartoes: Cartao[];
  transacoes: TransacaoBanco[];
  compras: CompraCartao[];
  objetivos: ObjetivoInvestimento[];
  categorias: Categoria[];
  ativos: Ativo[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  results: SearchResults;
  onResultClick: (item: any, type: 'conta' | 'cartao' | 'transacao' | 'compra' | 'objetivo' | 'categoria' | 'action' | 'ativo') => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, searchTerm, onSearchTermChange, results, onResultClick }) => {
  const hasResults = Object.values(results).some(arr => arr.length > 0);

  const renderResultItem = (item: any, type: 'conta' | 'cartao' | 'transacao' | 'compra' | 'objetivo' | 'categoria' | 'action' | 'ativo') => {
    let icon, title, subtitle, value;
    switch (type) {
      case 'action':
        icon = <Plus size={20} className="text-transparent bg-clip-text bg-gradient-to-r from-[#19CF67] to-[#00DE5F]" />;
        title = item.label;
        subtitle = "Ação Rápida";
        break;
      case 'conta':
        icon = <Landmark size={20} className="text-blue-400" />;
        title = item.nome;
        subtitle = "Conta Bancária";
        break;
      case 'cartao':
        icon = <CreditCard size={20} className="text-purple-400" />;
        title = item.apelido;
        subtitle = "Cartão de Crédito";
        break;
      case 'objetivo':
        icon = <Target size={20} className="text-lime-400" />;
        title = item.nome;
        subtitle = "Meta de Investimento";
        break;
      case 'categoria':
        icon = <BarChartHorizontal size={20} className="text-indigo-400" />;
        title = item.nome;
        subtitle = `Categoria (${item.tipo})`;
        break;
      case 'ativo':
        icon = <TrendingUp size={20} className="text-teal-400" />;
        title = item.nome;
        subtitle = `Ativo (${item.categoria})`;
        break;
      case 'transacao':
        icon = <ArrowRightLeft size={20} className="text-yellow-400" />;
        title = item.descricao;
        subtitle = `Transação em ${formatDate(item.data)}`;
        value = formatCurrency(item.tipo === 'Entrada' ? item.valor : -item.valor);
        break;
      case 'compra':
        icon = <ShoppingCart size={20} className="text-orange-400" />;
        title = item.descricao;
        subtitle = `Compra em ${formatDate(item.data_compra)}`;
        value = formatCurrency(item.estorno ? item.valor_total : -item.valor_total);
        break;
    }

    return (
      <button
        key={item.id}
        onClick={() => onResultClick(item, type)}
        className="w-full text-left p-3 flex items-center space-x-4 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <div className="p-2 bg-gray-700/50 rounded-full">{icon}</div>
        <div className="flex-1 overflow-hidden">
          <p className="font-semibold text-white truncate">{title}</p>
          <p className="text-sm text-gray-400 truncate">{subtitle}</p>
        </div>
        {value && <p className={`font-mono font-semibold ${value.startsWith('-') ? 'text-red-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-[#19CF67] to-[#00DE5F]'}`}>{value}</p>}
      </button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Busca Global">
      <div className="flex flex-col h-[70vh]">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Pesquisar ou executar um comando..."
            value={searchTerm}
            onChange={e => onSearchTermChange(e.target.value)}
            className="w-full bg-gray-700 p-3 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19CF67] text-white"
            autoFocus
          />
        </div>
        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
          {searchTerm && !hasResults && (
            <div className="text-center text-gray-400 py-16">
              <p>Nenhum resultado encontrado para "{searchTerm}".</p>
            </div>
          )}

          {results.actions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Ações</h4>
              {results.actions.map(item => renderResultItem(item, 'action'))}
            </div>
          )}

          {results.contas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Contas</h4>
              {results.contas.map(item => renderResultItem(item, 'conta'))}
            </div>
          )}

          {results.cartoes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Cartões</h4>
              {results.cartoes.map(item => renderResultItem(item, 'cartao'))}
            </div>
          )}
          
          {results.objetivos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Metas</h4>
              {results.objetivos.map(item => renderResultItem(item, 'objetivo'))}
            </div>
          )}

          {results.ativos.length > 0 && (
            <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Ativos</h4>
                {results.ativos.map(item => renderResultItem(item, 'ativo'))}
            </div>
          )}
          
          {results.categorias.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Categorias</h4>
              {results.categorias.map(item => renderResultItem(item, 'categoria'))}
            </div>
          )}

          {results.transacoes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Transações</h4>
              {results.transacoes.map(item => renderResultItem(item, 'transacao'))}
            </div>
          )}

          {results.compras.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase px-3 mb-1">Compras no Cartão</h4>
              {results.compras.map(item => renderResultItem(item, 'compra'))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SearchModal;