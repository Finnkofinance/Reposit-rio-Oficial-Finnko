import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';

import Modal from '@/components/Modal';
import CurrencyInput from '@/components/CurrencyInput';
import KPICard from '@/components/KPICard';
import DatePeriodSelector from '@/components/DatePeriodSelector';
import { ContaBancaria, TransacaoBanco, Categoria, TipoCategoria, ModalState, NavigationState } from '@/types/types';
import { getCategoryIcon } from '@/constants.tsx';
import { formatDate } from '@/utils/format';
import { CORES_CARTAO, CORES_BANCO } from '@/constants.tsx';
import { formatCurrency, calculateSaldo } from '@/utils/format';
import MobileSelector from '@/components/MobileSelector';

const getTodayString = () => new Date().toISOString().split('T')[0];

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
  type SortKey = keyof Pick<TransacaoBanco, 'data' | 'descricao' | 'valor' | 'categoria_id'>;
  type SortDirection = 'ascending' | 'descending';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'data', direction: 'descending' });
  
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [isSaldoInicialEditBlocked, setSaldoInicialEditBlocked] = useState(false);
  // recursos de edição em massa removidos

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
    // filtros removidos

    if (stateProcessed) {
        clearNavigationState();
    }
  }, [navigationState, clearNavigationState, setSelectedView, openModal]);

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

  type BankHistoryItem = {
    id: string;
    data: string;
    titulo: string;
    subtitulo?: string;
    valor?: number;
    tipo: 'conta_criada' | 'transferencia' | 'entrada' | 'saida';
    contaCor?: string;
  };

  const bankHistory = useMemo<BankHistoryItem[]>(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const contasVisiveisIds = selectedView === 'all' ? new Set(contas.map(c => c.id)) : new Set([selectedView]);
    const contaMap = new Map<string, ContaBancaria>(contas.map(c => [c.id, c]));

    const txs = transacoes
      .filter(t => t.data >= startDate && t.data <= endDate)
      .filter(t => contasVisiveisIds.has(t.conta_id));

    const items: BankHistoryItem[] = [];

    // Conta criada (saldo inicial)
    txs.filter(t => t.meta_saldo_inicial).forEach(t => {
      const conta = contaMap.get(t.conta_id);
      items.push({
        id: `acc-${t.id}`,
        data: t.data,
        titulo: `Conta criada: ${conta?.nome || ''}`,
        subtitulo: `Saldo inicial ${formatCurrency(t.valor)}`,
        tipo: 'conta_criada',
        contaCor: conta?.cor,
      });
    });

    // Transferências (agregar par)
    txs.filter(t => t.tipo === TipoCategoria.Transferencia && !t.meta_saldo_inicial && !t.meta_pagamento)
      .forEach(t => {
        const par = transacoes.find(p => p.id === t.transferencia_par_id);
        if (!par) return;
        // Mostra apenas uma vez, a perna de débito
        if (t.id < par.id) {
          const origem: string = contaMap.get(t.conta_id)?.nome ?? '';
          const destino: string = contaMap.get(par.conta_id)?.nome ?? '';
          items.push({
            id: `trf-${t.id}`,
            data: t.data,
            titulo: `Transferência: ${origem} → ${destino}`,
            subtitulo: undefined,
            valor: t.valor,
            tipo: 'transferencia',
            contaCor: contaMap.get(t.conta_id)?.cor,
          });
        }
      });

    // Entradas
    txs.filter(t => t.tipo === TipoCategoria.Entrada)
      .forEach(t => {
        const conta = contaMap.get(t.conta_id);
        items.push({
          id: `ent-${t.id}`,
          data: t.data,
          titulo: `Entrada em ${conta?.nome || ''}`,
          subtitulo: t.descricao,
          valor: t.valor,
          tipo: 'entrada',
          contaCor: conta?.cor,
        });
      });

    // Saídas (inclui pagamento de cartão como saída)
    txs.filter(t => t.tipo === TipoCategoria.Saida || t.meta_pagamento)
      .forEach(t => {
        const conta = contaMap.get(t.conta_id);
        items.push({
          id: `sai-${t.id}`,
          data: t.data,
          titulo: `Saída em ${conta?.nome || ''}`,
          subtitulo: t.descricao,
          valor: t.valor,
          tipo: 'saida',
          contaCor: conta?.cor,
        });
      });

    // Ordenar por data desc
    return items.sort((a, b) => b.data.localeCompare(a.data));
  }, [transacoes, contas, selectedView, selectedMonth]);

  const transacoesFiltradas = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const contasVisiveisIds = selectedView === 'all' ? new Set(contas.map(c => c.id)) : new Set([selectedView]);
    const categoriaMap = new Map(categorias.map(c => [c.id, c.nome]));

    return transacoes
      .filter(t => t.data >= startDate && t.data <= endDate)
      .filter(t => contasVisiveisIds.has(t.conta_id))
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
  }, [transacoes, selectedMonth, selectedView, contas, sortConfig, categorias]);
  
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

  // seleção/edição em massa removidas

  // sem seleção para resetar

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
  
  // filtros removidos

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
            <div key={t.id} className={`relative border-t border-gray-200 dark:border-gray-700`}>
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
                    <div className="flex justify-end items-center mt-2 space-x-3 text-gray-500 dark:text-gray-400">
                        <button onClick={() => deleteTransacao(t.id)} className="hover:text-red-500 dark:hover:text-red-400"><Trash2 size={16}/></button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <tr key={t.id} className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50`} style={{ borderLeft: `4px solid ${conta?.cor || 'transparent'}` }}>
            <td className="p-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(t.data)}</td>
            <td className="p-3"><div className="flex items-center space-x-2 text-gray-800 dark:text-white">{isTransfer && <span title={`Transferência ${isDebit ? 'para' : 'de'} ${transferAccountName}`}><ArrowRightLeft size={14} className="text-yellow-500 dark:text-yellow-400 flex-shrink-0" /></span>}<span>{t.descricao}</span></div></td>
            <td className="p-3 flex items-center space-x-2 text-gray-700 dark:text-gray-300">{categoria && getCategoryIcon(categoria.tipo)}<span>{categoria?.nome || 'N/A'}</span></td>
            <td className={`p-3 text-right font-semibold ${valorColor}`}>{formatCurrency(t.valor)}</td>
            <td className="p-3 text-center flex justify-center space-x-3">
                <button onClick={() => deleteTransacao(t.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={16}/></button>
            </td>
        </tr>
    );
  };
  // cabeçalho ordenável removido


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

          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col overflow-hidden shadow-sm dark:shadow-none border dark:border-transparent min-h-[70vh] md:min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Histórico de Operações {selectedView !== 'all' ? `(${contas.find(c => c.id === selectedView)?.nome || ''})` : '(Todas)'}
              </h3>
              <div className="flex space-x-2 w-full md:w-auto">
                <button onClick={() => openModal('nova-transacao')} className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 text-sm">
                  <Plus size={16}/><span>Nova Transação</span>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-200 dark:divide-gray-700">
              {bankHistory.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum evento neste período.</div>
              )}
              {bankHistory.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: item.contaCor || '#6b7280' }} />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{item.titulo}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.data).toLocaleDateString('pt-BR')}{item.subtitulo ? ` • ${item.subtitulo}` : ''}</div>
                    </div>
                  </div>
                  {typeof item.valor === 'number' && (
                    <div className={`font-semibold ${item.tipo === 'entrada' ? 'text-green-500' : item.tipo === 'saida' ? 'text-red-500' : 'text-gray-400'}`}>
                      {formatCurrency(item.valor)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
      </div>
      
      {/* Barra de seleção e modal de edição em massa removidos */}

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
    </div>
  );
};

export default ContasExtratoPage;