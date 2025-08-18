
import React, { useState, useMemo, useEffect } from 'react';
import { Categoria, TransacaoBanco, TipoCategoria, CompraCartao, ModalState, ParcelaCartao, Settings, NavigationState } from '../types';
import Modal from '../components/Modal';
import { getCategoryIcon } from '../constants';
import { Plus, Pencil, Trash2, Lock, ChevronDown } from 'lucide-react';
import DatePeriodSelector from '../components/DatePeriodSelector';
import CurrencyInput from '../components/CurrencyInput';
import { formatCurrency } from '../utils/format';
import MobileSelector from '../components/MobileSelector';
import ConfiguracoesPage from './ConfiguracoesPage';

type PerfilTab = 'categorias' | 'visualizacao' | 'configuracoes';

interface PerfilPageProps {
  categorias: Categoria[];
  transacoes: TransacaoBanco[];
  compras: CompraCartao[];
  parcelas: ParcelaCartao[];
  addCategoria: (categoria: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>) => void;
  updateCategoria: (categoria: Categoria) => void;
  deleteCategoria: (id: string) => void;
  modalState: ModalState;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  handleDeleteAllData: () => void;
  handleExportData: () => void;
  handleImportData: (file: File) => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  navigationState: NavigationState | null;
  clearNavigationState: () => void;
}

const CATEGORY_FILTERS = [
    { id: 'all', label: 'Todas as Categorias' },
    { id: TipoCategoria.Entrada, label: 'Entradas' },
    { id: TipoCategoria.Saida, label: 'Saídas' },
    { id: TipoCategoria.Investimento, label: 'Investimentos' },
];

const PerfilPage: React.FC<PerfilPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<PerfilTab>('categorias');

  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoCategoria>(TipoCategoria.Saida);
  const [orcamento, setOrcamento] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<TipoCategoria | 'all'>('all');

  const { 
    categorias, transacoes, compras, parcelas, addCategoria, updateCategoria, deleteCategoria, 
    modalState, openModal, closeModal, selectedMonth, onMonthChange 
  } = props;
  
  const isModalOpen = modalState.modal === 'nova-categoria' || modalState.modal === 'editar-categoria';

  useEffect(() => {
    if (props.navigationState) {
        if (props.navigationState.viewId && ['categorias', 'visualizacao', 'configuracoes'].includes(props.navigationState.viewId)) {
            setActiveTab(props.navigationState.viewId as PerfilTab);
            if(props.navigationState.viewId === 'categorias' && props.navigationState.action === 'open-add-modal') {
                openModal('nova-categoria');
            }
        }
        props.clearNavigationState();
    }
  }, [props.navigationState, props.clearNavigationState, openModal]);

  const gastosPorCategoria = useMemo(() => {
    const gastos: Record<string, number> = {};
    transacoes
        .filter(t => t.realizado && t.tipo === TipoCategoria.Saida && t.data.startsWith(selectedMonth))
        .forEach(t => {
            gastos[t.categoria_id] = (gastos[t.categoria_id] || 0) + t.valor;
        });
    parcelas
      .filter(p => p.competencia_fatura === selectedMonth)
      .forEach(p => {
          const compra = compras.find(c => c.id === p.compra_id && !c.estorno);
          if (compra) {
              gastos[compra.categoria_id] = (gastos[compra.categoria_id] || 0) + p.valor_parcela;
          }
      });
    return gastos;
  }, [transacoes, compras, parcelas, selectedMonth]);

  const groupedCategorias = useMemo(() => {
    const groups: { [key in TipoCategoria]?: Categoria[] } = {};
    const filtered = categorias.filter(cat => selectedFilter === 'all' || cat.tipo === selectedFilter);

    filtered.forEach(cat => {
      if (!groups[cat.tipo]) groups[cat.tipo] = [];
      groups[cat.tipo]!.push(cat);
    });
    
    for (const key in groups) {
      groups[key as TipoCategoria]?.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return groups;
  }, [categorias, selectedFilter]);

  useEffect(() => {
    if (isModalOpen) {
      const categoriaToEdit = modalState.data?.categoria as Categoria | null;
      setEditingCategoria(categoriaToEdit || null);
      if (categoriaToEdit) {
        setNome(categoriaToEdit.nome);
        setTipo(categoriaToEdit.tipo);
        setOrcamento(categoriaToEdit.orcamento_mensal ? String(categoriaToEdit.orcamento_mensal * 100) : '');
      } else {
        setNome('');
        setTipo(TipoCategoria.Saida);
        setOrcamento('');
      }
    }
  }, [isModalOpen, modalState.data]);

  const handleOpenEditModal = (categoria: Categoria) => {
    openModal('editar-categoria', { categoria });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim() === '') return;

    const categoriaData = { 
        nome: nome.trim(), 
        tipo,
        orcamento_mensal: orcamento ? parseFloat(orcamento) / 100 : null
    };
    
    if (editingCategoria) {
      updateCategoria({ ...editingCategoria, ...categoriaData });
    } else {
      addCategoria({ ...categoriaData });
    }
    
    closeModal();
  };

  const renderCategoryItem = (categoria: Categoria) => {
    const isProtected = categoria.sistema;
    const gasto = gastosPorCategoria[categoria.id] || 0;
    const orcamentoDefinido = categoria.orcamento_mensal && categoria.orcamento_mensal > 0;
    const progresso = orcamentoDefinido ? Math.min((gasto / categoria.orcamento_mensal!) * 100, 100) : 0;
    const progressoCor = progresso > 90 ? 'bg-red-500' : progresso > 75 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div key={categoria.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {getCategoryIcon(categoria.tipo)}
                    <span className="text-gray-900 dark:text-white">{categoria.nome}</span>
                    {categoria.sistema && <span title="Categoria de sistema"><Lock size={14} className="text-yellow-500 dark:text-yellow-400" /></span>}
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => handleOpenEditModal(categoria)} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" aria-label={`Editar categoria ${categoria.nome}`}><Pencil size={18} /></button>
                    <button onClick={() => deleteCategoria(categoria.id)} disabled={isProtected} className={`transition-colors ${isProtected ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'}`} title={isProtected ? "Categorias de sistema não podem ser excluídas." : "Excluir"} aria-label={`Excluir categoria ${categoria.nome}`}><Trash2 size={18} /></button>
                </div>
            </div>
            {categoria.tipo === TipoCategoria.Saida && (
                <div className="mt-2">
                    {orcamentoDefinido ? (
                        <div>
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                                <span>{formatCurrency(gasto)}</span>
                                <span>{formatCurrency(categoria.orcamento_mensal!)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${progressoCor}`} style={{ width: `${progresso}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500">Sem orçamento definido</div>
                    )}
                </div>
            )}
        </div>
    );
  };

  const renderCategorias = () => (
    <div className="animate-fade-in flex flex-col h-full md:flex-row md:space-x-6">
        <div className="hidden md:flex flex-col w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 h-full flex flex-col shadow-sm dark:shadow-none border dark:border-transparent">
                <div className="flex-grow space-y-2 overflow-y-auto no-scrollbar">
                    {CATEGORY_FILTERS.map(filter => (
                        <button key={filter.id} onClick={() => setSelectedFilter(filter.id as any)} className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${selectedFilter === filter.id ? 'bg-green-500 text-white font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                           <span>{filter.label}</span>
                        </button>
                    ))}
                </div>
                <div className="pt-3 mt-auto border-t border-gray-200 dark:border-gray-700/50">
                    <button onClick={() => openModal('nova-categoria')} className="w-full text-center p-2 rounded-lg flex items-center justify-center space-x-2 transition-colors bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white opacity-80 dark:opacity-70 hover:opacity-100">
                        <Plus size={16} /><span>Nova Categoria</span>
                    </button>
                </div>
            </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
            <DatePeriodSelector title="Orçamentos e Categorias" selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
             <div className="md:hidden">
                <MobileSelector
                    allLabel="Todas as Categorias"
                    options={CATEGORY_FILTERS.filter(f => f.id !== 'all').map(f => ({ value: f.id, label: f.label }))}
                    value={selectedFilter}
                    onChange={(val) => setSelectedFilter(val as any)}
                    onAddNew={() => openModal('nova-categoria')}
                    addNewLabel="Adicionar nova categoria"
                />
            </div>
            <div className="mt-6 space-y-8 flex-grow overflow-y-auto">
              {Object.entries(groupedCategorias).map(([tipo, cats]) => {
                if (!cats || cats.length === 0) return null;
                return (
                  <div key={tipo}>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-gray-700 pb-2">{tipo}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cats.map(renderCategoryItem)}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
        <Modal 
            isOpen={isModalOpen} 
            onClose={closeModal} 
            title={editingCategoria ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
            footer={
                <>
                    <button onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" form="categoria-form" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Salvar</button>
                </>
            }
        >
            <form id="categoria-form" onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                    <label htmlFor="nome-cat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Categoria</label>
                    <input type="text" id="nome-cat" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" required />
                </div>
                <div className="relative">
                    <label htmlFor="tipo-cat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    {editingCategoria ? (
                        <input id="tipo-cat" type="text" value={tipo} readOnly className="w-full bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-500 dark:text-gray-300 cursor-not-allowed focus:outline-none" />
                    ) : (
                        <>
                            <select id="tipo-cat" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCategoria)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pl-3 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none">
                                {Object.values(TipoCategoria).filter(t => ![TipoCategoria.Estorno, TipoCategoria.Transferencia].includes(t)).map(val => ( <option key={val} value={val}>{val}</option>))}
                            </select>
                            <ChevronDown className="absolute right-3 top-[calc(50%+8px)] -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </>
                    )}
                </div>
                {[TipoCategoria.Saida, TipoCategoria.Entrada, TipoCategoria.Investimento].includes(tipo) && (
                    <div>
                        <label htmlFor="orcamento-cat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                             {tipo === TipoCategoria.Saida ? 'Orçamento Mensal (Opcional)' : 'Meta Mensal (Opcional)'}
                        </label>
                        <CurrencyInput value={orcamento} onValueChange={setOrcamento} placeholder="R$ 0,00" className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                )}
            </form>
        </Modal>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div>
        {activeTab === 'categorias' && renderCategorias()}
        {activeTab === 'visualizacao' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto animate-fade-in shadow-sm dark:shadow-none">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Opções de Visualização</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <label htmlFor="show-percentage" className="font-medium text-gray-800 dark:text-white">Mostrar Variação Percentual</label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Exibe a mudança percentual nos cards da tela de Resumo.</p>
                        </div>
                        <label htmlFor="show-percentage" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="show-percentage" className="sr-only peer" checked={props.settings.showPercentageChange} onChange={() => props.setSettings(prev => ({ ...prev, showPercentageChange: !prev.showPercentageChange }))}/>
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'configuracoes' && (
          <ConfiguracoesPage
            handleDeleteAllData={props.handleDeleteAllData}
            handleExportData={props.handleExportData}
            handleImportData={props.handleImportData}
          />
        )}
      </div>
    </div>
  );
};

export default PerfilPage;
