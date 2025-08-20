import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, FilterX, Search, ArrowRightLeft, ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';

import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import KPICard from '../components/KPICard';
import DatePeriodSelector from '../components/DatePeriodSelector';
import { ContaBancaria, TransacaoBanco, Categoria, TipoCategoria, ModalState, NavigationState } from '../types';
import { getCategoryIcon, CORES_CARTAO, CORES_BANCO } from '../constants';
import { formatCurrency, formatDate, calculateSaldo } from '../utils/format';
import MobileSelector from '../components/MobileSelector';

const getTodayString = () => new Date().toISOString().split('T')[0];

type SortKey = 'data' | 'descricao' | 'categoria_id' | 'valor';
type SortDirection = 'ascending' | 'descending';

function getBankColorFromName(name: string): string | null {
    if (!name) return null;
    const normalizedName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const bankName in CORES_BANCO) {
        if (normalizedName.includes(bankName)) {
            return CORES_BANCO[bankName as keyof typeof CORES_BANCO];
        }
    }
    return null;
}

const isDebitTransfer = (t: TransacaoBanco, allTrans: TransacaoBanco[]): boolean => {
    if (t.tipo !== TipoCategoria.Transferencia || t.meta_pagamento || t.meta_saldo_inicial) return false;
    const pair = allTrans.find(p => p.id === t.transferencia_par_id);
    return !!pair && t.id < pair.id;
};

interface ContasExtratoPageProps {
  contas: ContaBancaria[];
  transacoes: TransacaoBanco[];
  categorias: Categoria[];
  addConta: (conta: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }) => ContaBancaria | null;
  updateConta: (conta: Omit<ContaBancaria, 'saldo_inicial'>, novoSaldoInicial: number, novaDataInicial: string) => void;
  deleteConta: (id: string) => void;
  deleteTransacao: (id: string) => void;
  deleteTransacoes: (ids: string[]) => void;
  updateTransacoesCategoria: (ids: string[], newCategoryId: string) => void;
  toggleTransactionRealizado: (id: string) => void;
  modalState: ModalState;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
  selectedView: 'all' | string;
  setSelectedView: (id: 'all' | string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  navigationState: NavigationState | null;
  clearNavigationState: () => void;
}

const ContasExtratoPage: React.FC<ContasExtratoPageProps> = ({
  contas, transacoes, categorias, addConta, updateConta, deleteConta, deleteTransacao, deleteTransacoes, updateTransacoesCategoria,
  toggleTransactionRealizado, modalState, openModal, closeModal, selectedView, setSelectedView, selectedMonth, onMonthChange,
  navigationState, clearNavigationState
}) => {
  const [filters, setFilters] = useState({ categoriaFiltro: '', tipoFiltro: '', textoFiltro: '' });
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'data', direction: 'descending' });
  
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [isSaldoInicialEditBlocked, setSaldoInicialEditBlocked] = useState(false);
  const [isMassEditModalOpen, setIsMassEditModalOpen] = useState(false);
  const [massEditCategoryId, setMassEditCategoryId] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form states
  const [contaForm, setContaForm] = useState({ nome: '', saldo_inicial: '', data_inicial: getTodayString(), ativo: true, cor: CORES_CARTAO[0].value });
  const [isColorManuallySet, setIsColorManuallySet] = useState(false);
  
  const isContaModalOpen = modalState.modal === 'nova-conta' || modalState.modal === 'editar-conta';

  useEffect(() => {
    let stateProcessed = false;
    if (navigationState?.viewId) {
        setSelectedView(navigationState.viewId);
        stateProcessed = true;
    }
    if (navigationState?.action === 'open-add-modal') {
        openModal('nova-conta');
        stateProcessed = true;
    }
    if (navigationState?.filters) {
        setFilters(f => ({ ...f, ...navigationState.filters }));
        stateProcessed = true;
    }

    if (stateProcessed) {
        clearNavigationState();
    }
  }, [navigationState, clearNavigationState, setSelectedView, openModal, setFilters]);

  const contasComSaldo = useMemo(() => {
    return contas.map(conta => ({
      ...conta,
      saldoAtual: calculateSaldo(conta.id, transacoes),
    }));
  }, [contas, transacoes]);

  const kpisData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const contasAtivas = contasComSaldo.filter(c => c.ativo);
    const contasVisiveis = selectedView === 'all' ? contasAtivas : contasAtivas.filter(c => c.id === selectedView);
    const contasVisiveisIds = new Set(contasVisiveis.map(c => c.id));
    
    const saldoConsolidadoTotal = contasAtivas.reduce((sum, c) => sum + c.saldoAtual, 0);
    const saldoContaSelecionada = selectedView !== 'all' ? contasComSaldo.find(c => c.id === selectedView)?.saldoAtual : undefined;

    const transacoesMes = transacoes.filter(t => 
        t.data >= startDate && t.data <= endDate && contasVisiveisIds.has(t.conta_id) && t.realizado
    );
    
    const entradasMes = transacoesMes
        .filter(t =>
            t.tipo === TipoCategoria.Entrada ||
            (
              t.tipo === TipoCategoria.Transferencia &&
              !isDebitTransfer(t, transacoes) &&
              !t.meta_pagamento &&
              !t.meta_saldo_inicial
            )
        )
        .reduce((sum, t) => sum + t.valor, 0);
        
    const saidasMes = transacoesMes
        .filter(t => t.tipo === TipoCategoria.Saida || t.meta_pagamento || (t.tipo === TipoCategoria.Transferencia && isDebitTransfer(t, transacoes)))
        .reduce((sum, t) => sum + t.valor, 0);

    const investimentosMes = transacoesMes
        .filter(t => t.tipo === TipoCategoria.Investimento)
        .reduce((sum, t) => sum + t.valor, 0);

    return { saldoConsolidadoTotal, saldoContaSelecionada, entradasMes, saidasMes, investimentosMes };
  }, [contasComSaldo, transacoes, selectedView, selectedMonth]);

  const transacoesFiltradas = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const contasVisiveisIds = selectedView === 'all' ? new Set(contas.map(c => c.id)) : new Set([selectedView]);
    const categoriaMap = new Map(categorias.map(c => [c.id, c.nome]));

    return transacoes
      .filter(t => t.data >= startDate && t.data <= endDate)
      .filter(t => contasVisiveisIds.has(t.conta_id))
      .filter(t => !filters.categoriaFiltro || t.categoria_id === filters.categoriaFiltro)
      .filter(t => !filters.tipoFiltro || t.tipo === filters.tipoFiltro)
      .filter(t => !filters.textoFiltro || t.descricao.toLowerCase().includes(filters.textoFiltro.toLowerCase()))
      .sort((a, b) => {
        const key = sortConfig.key;
        const direction = sortConfig.direction === 'ascending' ? 1 : -1;

        let valA, valB;
        if (key === 'categoria_id') {
            valA = categoriaMap.get(a.categoria_id) || '';
            valB = categoriaMap.get(b.categoria_id) || '';
        } else {
            valA = a[key];
            valB = b[key];
        }

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        }

        if (comparison !== 0) return comparison * direction;
        
        // Secondary sort by date
        return b.data.localeCompare(a.data);
      });
  }, [transacoes, selectedMonth, selectedView, contas, filters, sortConfig, categorias]);
  
  useEffect(() => {
    if (isContaModalOpen) {
        const conta = modalState.data?.conta as ContaBancaria | null;
        setEditingConta(conta);
        if (conta) {
            const transacaoSaldoInicial = transacoes.find(t => t.conta_id === conta.id && t.meta_saldo_inicial);
            const outrasTransacoes = transacoes.some(t => t.conta_id === conta.id && !t.meta_saldo_inicial);
            setSaldoInicialEditBlocked(outrasTransacoes);
          setContaForm({ 
              nome: conta.nome, 
              saldo_inicial: String((transacaoSaldoInicial?.valor || 0) * 100), 
              data_inicial: conta.data_inicial,
              ativo: conta.ativo,
              cor: conta.cor || CORES_CARTAO[0].value,
          });
          setIsColorManuallySet(true);
        } else {
          setSaldoInicialEditBlocked(false);
          setContaForm({ nome: '', saldo_inicial: '', data_inicial: getTodayString(), ativo: true, cor: CORES_CARTAO[0].value });
          setIsColorManuallySet(false);
        }
    }
  }, [isContaModalOpen, modalState.data, transacoes]);

  useEffect(() => {
    if (isContaModalOpen && !editingConta && !isColorManuallySet) {
        const detectedColor = getBankColorFromName(contaForm.nome);
        if (detectedColor) {
            setContaForm(prev => ({ ...prev, cor: detectedColor }));
        }
    }
  }, [contaForm.nome, isContaModalOpen, editingConta, isColorManuallySet]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };

  const isAllSelected = transacoesFiltradas.length > 0 && selectedIds.size === transacoesFiltradas.length;

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(transacoesFiltradas.map(t => t.id)));
  };
  
  const handleConfirmMassEdit = () => {
    if (!massEditCategoryId) return;
    updateTransacoesCategoria(Array.from(selectedIds), massEditCategoryId);
    setIsMassEditModalOpen(false);
    setSelectedIds(new Set());
    setMassEditCategoryId('');
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, selectedView, selectedMonth, sortConfig]);

  const handleContaSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!contaForm.nome || !contaForm.data_inicial) return;
      const saldo = parseFloat(contaForm.saldo_inicial) / 100 || 0;
      
      if (editingConta) {
          const contaDataToUpdate: Omit<ContaBancaria, 'saldo_inicial'> = {
            id: editingConta.id,
            nome: contaForm.nome,
            data_inicial: contaForm.data_inicial,
            ativo: contaForm.ativo,
            cor: contaForm.cor,
            createdAt: editingConta.createdAt,
            updatedAt: editingConta.updatedAt,
          };
          updateConta(contaDataToUpdate, saldo, contaForm.data_inicial);
          closeModal();
      } else {
          const novaConta = addConta({ nome: contaForm.nome, saldo_inicial: saldo, ativo: contaForm.ativo, data_inicial: contaForm.data_inicial, cor: contaForm.cor });
          if (novaConta) closeModal();
      }
  };

  const handleEditClick = (t: TransacaoBanco) => {
    if (t.transferencia_par_id && !t.meta_pagamento) openModal('editar-transferencia', { transferencia: t });
    else openModal('editar-transacao', { transacao: t });
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => setFilters(prev => ({ ...prev, [filterName]: value }));
  const clearFilters = () => setFilters({ categoriaFiltro: '', tipoFiltro: '', textoFiltro: '' });

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderTransactionRow = (t: TransacaoBanco, isMobile = false) => {
    const categoria = categorias.find(c => c.id === t.categoria_id);
    const conta = contas.find(c => c.id === t.conta_id);
    const isTransfer = t.tipo === TipoCategoria.Transferencia && !t.meta_pagamento && !t.meta_saldo_inicial;
    const pair = isTransfer ? transacoes.find(p => p.id === t.transferencia_par_id) : null;
    const isDebit = isTransfer && pair && t.id < pair.id;
    const transferAccountName = isTransfer && pair ? contas.find(c => c.id === (isDebit ? pair.conta_id : pair?.conta_id))?.nome : '';
    const valorColor = t.tipo === TipoCategoria.Entrada ? 'text-green-500 dark:text-green-400' : (t.tipo === TipoCategoria.Saida || t.meta_pagamento) ? 'text-red-500 dark:text-red-400' : t.tipo === TipoCategoria.Investimento ? 'text-blue-500 dark:text-blue-400' : 'text-yellow-500 dark:text-yellow-400';

    if(isMobile) {
        return (
            <div key={t.id} className={`relative border-t border-gray-200 dark:border-gray-700 ${selectedIds.has(t.id) ? 'bg-green-50 dark:bg-green-900/50' : ''}`} onClick={() => handleSelect(t.id)}>
                <div className="absolute left-0 top-0 h-full w-1.5 rounded-r-sm" style={{ backgroundColor: conta?.cor || 'transparent' }}></div>
                <div className="p-4 pl-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center space-x-2">
                                {isTransfer && <span title={`Transferência ${isDebit ? 'para' : 'de'} ${transferAccountName}`}><ArrowRightLeft size={14} className="text-yellow-500 dark:text-yellow-400 flex-shrink-0" /></span>}
                                <span className="font-semibold text-gray-800 dark:text-white">{t.descricao}</span>
                            </div>
                             <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">{categoria && getCategoryIcon(categoria.tipo)}<span>{categoria?.nome || 'N/A'}</span></div>
                        </div>
                        <div className="text-right ml-2">
                            <div className={`font-bold ${valorColor}`}>{formatCurrency(t.valor)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{formatDate(t.data)}</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                         <button
                            onClick={(e) => { e.stopPropagation(); if (!t.realizado) toggleTransactionRealizado(t.id); }}
                            disabled={t.realizado}
                            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${t.realizado ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400 hover:bg-green-500/40 cursor-pointer'}`}
                         >
                            {t.realizado ? 'Realizado' : 'Previsto'}
                         </button>
                         <div className="flex justify-center space-x-3">
                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"><Pencil size={16}/></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTransacao(t.id); }} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={16}/></button>
                         </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <tr key={t.id} className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedIds.has(t.id) ? 'bg-green-50 dark:bg-green-900/50' : ''}`} style={{ borderLeft: `4px solid ${conta?.cor || 'transparent'}` }} onClick={() => handleSelect(t.id)}>
            <td className="p-3 text-center"><input type="checkbox" className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-green-500 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-green-500" checked={selectedIds.has(t.id)} onChange={() => handleSelect(t.id)} onClick={(e) => e.stopPropagation()} /></td>
            <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(t.data)}</td>
            <td className="p-3"><div className="flex items-center space-x-2 text-gray-800 dark:text-white">{isTransfer && <span title={`Transferência ${isDebit ? 'para' : 'de'} ${transferAccountName}`}><ArrowRightLeft size={14} className="text-yellow-500 dark:text-yellow-400 flex-shrink-0" /></span>}<span>{t.descricao}</span></div></td>
            <td className="p-3 flex items-center space-x-2 text-gray-700 dark:text-gray-300">{categoria && getCategoryIcon(categoria.tipo)}<span>{categoria?.nome || 'N/A'}</span></td>
            <td className={`p-3 text-right font-semibold ${valorColor}`}>{formatCurrency(t.valor)}</td>
            <td className="p-3 text-center">
                <button
                    onClick={(e) => { e.stopPropagation(); if (!t.realizado) toggleTransactionRealizado(t.id); }}
                    disabled={t.realizado}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${t.realizado ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400 hover:bg-green-500/40 cursor-pointer'}`}
                >
                    {t.realizado ? 'Realizado' : 'Previsto'}
                </button>
            </td>
            <td className="p-3 text-center flex justify-center space-x-3">
                <button onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"><Pencil size={16}/></button>
                <button onClick={(e) => { e.stopPropagation(); deleteTransacao(t.id); }} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={16}/></button>
            </td>
        </tr>
    );
  };
  
  const SortableHeader: React.FC<{ sortKey: SortKey, label: string }> = ({ sortKey, label }) => (
    <th className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50" onClick={() => requestSort(sortKey)}>
        <div className="flex items-center space-x-2">
            <span>{label}</span>
            {sortConfig.key === sortKey && (
                sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            )}
        </div>
    </th>
  );


  return (
    <div className="animate-fade-in flex flex-col h-full md:flex-row md:space-x-6">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex-col h-full flex shadow-sm dark:shadow-none border dark:border-transparent">
              <div className="flex-grow space-y-2 overflow-y-auto no-scrollbar">
                  <div className={`w-full text-left rounded-lg flex justify-between items-center transition-colors relative overflow-hidden ${selectedView === 'all' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                    <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: '#10b981' }}></div>
                    <button onClick={() => setSelectedView('all')} className="flex-grow p-3 pl-5 text-left text-gray-800 dark:text-white">
                        <span className="font-semibold block truncate">Todas as Contas</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(kpisData.saldoConsolidadoTotal)}</span>
                    </button>
                  </div>
                  <hr className="border-gray-200 dark:border-gray-700" />
                  {contasComSaldo.filter(c => c.ativo).sort((a,b) => a.nome.localeCompare(b.nome)).map(conta => (
                    <div key={conta.id} className={`w-full rounded-lg flex justify-between items-center transition-colors relative overflow-hidden ${selectedView === conta.id ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: conta.cor || '#6b7280' }}></div>
                        <button onClick={() => setSelectedView(conta.id)} className="flex-grow p-3 pl-5 text-left overflow-hidden text-gray-800 dark:text-white">
                           <span className="font-semibold block truncate">{conta.nome}</span>
                           <span className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(conta.saldoAtual)}</span>
                        </button>
                        <div className="flex flex-shrink-0 space-x-1 pr-3 z-10 text-gray-500 dark:text-current">
                            <button onClick={(e) => { e.stopPropagation(); openModal('editar-conta', { conta }); }} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-black/20" title="Editar Conta"><Pencil size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteConta(conta.id); }} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-black/20" title="Excluir Conta"><Trash2 size={16} /></button>
                        </div>
                    </div>
                  ))}
              </div>
              <div className="pt-3 mt-auto border-t border-gray-200 dark:border-gray-700/50">
                  <button onClick={() => openModal('nova-conta')} className="w-full text-center p-2 rounded-lg flex items-center justify-center space-x-2 transition-colors bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white opacity-80 dark:opacity-70 hover:opacity-100">
                      <Plus size={16} /><span>Nova Conta</span>
                  </button>
              </div>
          </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
          <DatePeriodSelector 
            title="Bancos e Extrato"
            selectedMonth={selectedMonth} 
            onMonthChange={onMonthChange} 
          />
          
          <div className="md:hidden">
              <MobileSelector
                  allLabel={(
                    <div className="flex items-center space-x-3">
                        <div className="w-1.5 h-10 flex-shrink-0 rounded-full bg-green-500"></div>
                        <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Todas as Contas</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(kpisData.saldoConsolidadoTotal)}</div>
                        </div>
                    </div>
                  )}
                  options={contasComSaldo.filter(c => c.ativo).sort((a,b) => a.nome.localeCompare(b.nome)).map(c => ({
                      value: c.id,
                      label: (
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <div className="w-1.5 h-10 flex-shrink-0 rounded-full" style={{ backgroundColor: c.cor || 'transparent' }}></div>
                                <div className="overflow-hidden">
                                    <div className="font-semibold text-gray-900 dark:text-white truncate">{c.nome}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(c.saldoAtual)}</div>
                                </div>
                            </div>
                            <div className="flex space-x-1 flex-shrink-0 pl-2 text-gray-800 dark:text-white">
                                <button onClick={(e) => { e.stopPropagation(); openModal('editar-conta', { conta: c }); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Pencil size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteConta(c.id); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Trash2 size={18} /></button>
                            </div>
                        </div>
                      )
                  }))}
                  value={selectedView}
                  onChange={setSelectedView}
                  onAddNew={() => openModal('nova-conta')}
                  addNewLabel="Adicionar nova conta"
              />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
            <KPICard label="Saldo Consolidado" value={kpisData.saldoConsolidadoTotal} icon="bank" projectedValue={kpisData.saldoContaSelecionada} projectedLabel={kpisData.saldoContaSelecionada !== undefined ? contas.find(c => c.id === selectedView)?.nome : undefined} />
            <KPICard label="Entradas no Mês" value={kpisData.entradasMes} icon="up" />
            <KPICard label="Saídas no Mês" value={kpisData.saidasMes} icon="down" />
            <KPICard label="Investimentos no Mês" value={kpisData.investimentosMes} icon="invest" />
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col overflow-hidden shadow-sm dark:shadow-none border dark:border-transparent">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Pesquisar por descrição..." value={filters.textoFiltro} onChange={e => handleFilterChange('textoFiltro', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white" />
              </div>
              <div className="relative">
                <select value={filters.categoriaFiltro} onChange={e => handleFilterChange('categoriaFiltro', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none text-gray-900 dark:text-white"><option value="">Todas as categorias</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
              <div className="relative">
                <select value={filters.tipoFiltro} onChange={e => handleFilterChange('tipoFiltro', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none text-gray-900 dark:text-white"><option value="">Todos os tipos</option>{Object.values(TipoCategoria).map(t => <option key={t} value={t}>{t}</option>)}</select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>
            {(filters.categoriaFiltro || filters.tipoFiltro || filters.textoFiltro) && <button onClick={clearFilters} className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1 hover:text-gray-800 dark:hover:text-white mb-2"><FilterX size={14} /><span>Limpar filtros</span></button>}
            
            {/* Desktop Table */}
            <div className="overflow-y-auto flex-grow hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <tr className="text-gray-600 dark:text-gray-300">
                        <th className="p-3 w-10 text-center"><input type="checkbox" className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-green-500 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-green-500" checked={isAllSelected} onChange={handleSelectAll} title={isAllSelected ? "Desmarcar todos" : "Marcar todos"}/></th>
                        <SortableHeader sortKey="data" label="Data" />
                        <SortableHeader sortKey="descricao" label="Descrição" />
                        <SortableHeader sortKey="categoria_id" label="Categoria" />
                        <th className="p-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50" onClick={() => requestSort('valor')}>
                            <div className="flex items-center justify-end space-x-2">
                                <span>Valor</span>
                                {sortConfig.key === 'valor' && ( sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} /> )}
                            </div>
                        </th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody>{transacoesFiltradas.map(t => renderTransactionRow(t, false))}{transacoesFiltradas.length === 0 && (<tr><td colSpan={7} className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma transação encontrada.</td></tr>)}</tbody>
              </table>
            </div>
             {/* Mobile List */}
            <div className="overflow-y-auto flex-grow md:hidden">
                {transacoesFiltradas.length > 0 ? transacoesFiltradas.map(t => renderTransactionRow(t, true)) : (<div className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma transação encontrada.</div>)}
            </div>
          </div>
      </div>
      
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg flex justify-between items-center z-20 animate-fade-in-up">
            <span className="text-gray-800 dark:text-white font-medium">{selectedIds.size} selecionada(s)</span>
            <div className="flex space-x-3">
                <button onClick={() => setIsMassEditModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"><Pencil size={16} /><span>Alterar Categoria</span></button>
                <button onClick={() => { deleteTransacoes(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"><Trash2 size={16} /><span>Excluir</span></button>
            </div>
        </div>
      )}

      <Modal 
          isOpen={isContaModalOpen} 
          onClose={closeModal} 
          title={editingConta ? 'Editar Conta' : 'Nova Conta'}
          footer={(
              <>
                  <button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold transition-colors">Cancelar</button>
                  <button type="submit" form="conta-form" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">Salvar</button>
              </>
          )}
      >
        <form id="conta-form" onSubmit={handleContaSubmit} className="space-y-4">
            <div>
                <input type="text" placeholder="Nome da Conta" value={contaForm.nome} onChange={e => setContaForm({...contaForm, nome: e.target.value})} required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <CurrencyInput placeholder="Saldo Inicial" value={contaForm.saldo_inicial} onValueChange={v => setContaForm({...contaForm, saldo_inicial: v})} required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500" disabled={isSaldoInicialEditBlocked}/>
                <input type="date" value={contaForm.data_inicial} onChange={e => setContaForm({...contaForm, data_inicial: e.target.value})} required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500" disabled={isSaldoInicialEditBlocked} />
            </div>
            {isSaldoInicialEditBlocked && <small className="text-yellow-500 dark:text-yellow-400 text-xs px-1">Saldo e data inicial não podem ser alterados pois a conta já possui movimentações.</small>}
            
            <div className="flex items-center text-gray-800 dark:text-gray-200 pt-2">
                <input type="checkbox" id="conta-ativa" checked={contaForm.ativo} onChange={e => setContaForm({...contaForm, ativo: e.target.checked})} className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"/> 
                <label htmlFor="conta-ativa" className="ml-2 font-medium">Conta ativa</label>
            </div>
             
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor Identificadora</label>
                <div className="flex flex-wrap gap-3">
                    {CORES_CARTAO.map(cor => (
                        <button key={cor.value} type="button" title={cor.label} onClick={() => { setContaForm({ ...contaForm, cor: cor.value }); setIsColorManuallySet(true); }} className={`w-9 h-9 rounded-full transition-transform transform hover:scale-110 ${contaForm.cor === cor.value ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''}`} style={{ backgroundColor: cor.value }} />
                    ))}
                </div>
            </div>
        </form>
      </Modal>
      <Modal isOpen={isMassEditModalOpen} onClose={() => setIsMassEditModalOpen(false)} title="Alterar Categoria em Massa" footer={<><button onClick={() => setIsMassEditModalOpen(false)} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button><button onClick={handleConfirmMassEdit} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg" disabled={!massEditCategoryId}>Confirmar</button></>}><div className="space-y-4"><p className="text-gray-700 dark:text-gray-300">Selecione a nova categoria para as {selectedIds.size} transações selecionadas.</p><div><label htmlFor="mass-edit-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova Categoria</label><select id="mass-edit-category" value={massEditCategoryId} onChange={e => setMassEditCategoryId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white"><option value="" disabled>Selecione...</option>{categorias.filter(c => !c.sistema).map(c => (<option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>))}</select></div></div></Modal>
    </div>
  );
};

export default ContasExtratoPage;