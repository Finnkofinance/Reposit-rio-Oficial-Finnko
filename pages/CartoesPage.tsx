
import React, { useState, useMemo, useEffect } from 'react';
import { Cartao, CompraCartao, ParcelaCartao, ContaBancaria, Categoria, TipoCategoria, BandeiraCartao, TransacaoBanco, ModalState, NavigationState, Page } from '../types';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import { formatCurrency, formatDate } from '../utils/format';
import { Plus, Pencil, Trash2, CreditCard, ShoppingCart, DollarSign, ChevronDown, ChevronUp, RefreshCcw, Wallet } from 'lucide-react';
import { CORES_CARTAO } from '../constants';
import DatePeriodSelector from '../components/DatePeriodSelector';
import MobileSelector from '../components/MobileSelector';
import { ConfirmationModalData } from '../components/ConfirmationModal';

interface CartoesPageProps {
  cartoes: Cartao[];
  contas: ContaBancaria[];
  categorias: Categoria[];
  compras: CompraCartao[];
  parcelas: ParcelaCartao[];
  transacoes: TransacaoBanco[];
  addCartao: (cartao: Omit<Cartao, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCartao: (cartao: Cartao) => void;
  deleteCartao: (id: string) => void;
  addCompraCartao: (compra: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'>) => boolean;
  updateCompraCartao: (compra: CompraCartao) => boolean;
  deleteCompraCartao: (id: string) => void;
  pagarFatura: (cartaoId: string, contaId: string, valor: number, data: string, competencia: string) => void;
  modalState: ModalState;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
  selectedView: 'all' | string;
  setSelectedView: (id: 'all' | string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  navigationState: NavigationState | null;
  clearNavigationState: () => void;
  setCurrentPage: (page: Page, state?: NavigationState | null) => void;
  setConfirmation: (data: ConfirmationModalData | null) => void;
}

type FaturaStatus = 'Aberta' | 'Paga' | 'Parcial';
interface FaturaInfo {
    parcelas: ParcelaCartao[];
    total: number;
    competencia: string;
    total_pago: number;
    restante: number;
    status: FaturaStatus;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const CartoesPage: React.FC<CartoesPageProps> = (props) => {
  const {
    cartoes, contas, categorias, compras, parcelas, transacoes,
    addCartao, updateCartao, deleteCartao, addCompraCartao, updateCompraCartao, deleteCompraCartao, pagarFatura,
    modalState, openModal, closeModal, selectedView, setSelectedView, selectedMonth, onMonthChange,
    navigationState, clearNavigationState, setCurrentPage, setConfirmation
  } = props;
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);
  const [expandedFaturas, setExpandedFaturas] = useState<Record<string, boolean>>({});

  const [cardForm, setCardForm] = useState({ apelido: '', dia_fechamento: 20, dia_vencimento: 28, limite: '', bandeira: BandeiraCartao.Visa, cor: CORES_CARTAO[0].value, conta_id_padrao: '' });
  const [pagamentoForm, setPagamentoForm] = useState({ conta_id: '', valor: '', data: getTodayString() });
  
  const isCardModalOpen = modalState.modal === 'novo-cartao' || modalState.modal === 'editar-cartao';
  const isPagamentoModalOpen = modalState.modal === 'pagar-fatura';

  useEffect(() => {
    let stateProcessed = false;
    if (navigationState?.viewId) {
        setSelectedView(navigationState.viewId);
        stateProcessed = true;
    }
    if (navigationState?.action === 'open-add-modal') {
        openModal('novo-cartao');
        stateProcessed = true;
    }

    if (stateProcessed) {
        clearNavigationState();
    }
  }, [navigationState, clearNavigationState, setSelectedView, openModal]);

  const selectedCartao = useMemo(() => {
    if (selectedView === 'all' || !selectedView) return null;
    return cartoes.find(c => c.id === selectedView);
  }, [cartoes, selectedView]);
  
    const cartoesComFatura = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const competenciaAtual = `${year}-${String(month).padStart(2, '0')}`;

        return cartoes.map(cartao => {
            const parcelasDaFatura = parcelas.filter(p => {
                const compra = compras.find(c => c.id === p.compra_id);
                return compra && compra.cartao_id === cartao.id && p.competencia_fatura === competenciaAtual;
            });
            const totalFatura = parcelasDaFatura.reduce((sum, p) => sum + p.valor_parcela, 0);

            return {
                ...cartao,
                faturaAtual: totalFatura,
            };
        }).sort((a, b) => a.apelido.localeCompare(b.apelido));
    }, [cartoes, parcelas, compras, selectedMonth]);

  const faturas = useMemo<{ atual: FaturaInfo, proxima: FaturaInfo }>(() => {
    const emptyFatura: FaturaInfo = { parcelas: [], total: 0, competencia: '', total_pago: 0, restante: 0, status: 'Aberta' };

    const getCompetencias = (baseMonth: string) => {
        const [year, month] = baseMonth.split('-').map(Number);
        const dataBase = new Date(year, month - 1, 15);
        const proximaDataBase = new Date(dataBase);
        proximaDataBase.setMonth(proximaDataBase.getMonth() + 1);
        return {
            atual: baseMonth,
            proxima: `${proximaDataBase.getFullYear()}-${String(proximaDataBase.getMonth() + 1).padStart(2, '0')}`
        };
    };

    const { atual: competenciaAtual, proxima: competenciaProxima } = getCompetencias(selectedMonth);

    const calcularFatura = (competencia: string, cartoesParaCalcular: Cartao[]): FaturaInfo => {
        if (!competencia) return { ...emptyFatura, competencia: '' };
        if (cartoesParaCalcular.length === 0 && selectedView !== 'all') return { ...emptyFatura, competencia };
        
        const cartoesIds = new Set(cartoesParaCalcular.map(c => c.id));
        
        const parcelasDaFatura = parcelas.filter(p => {
            const compra = compras.find(c => c.id === p.compra_id);
            return compra && cartoesIds.has(compra.cartao_id) && p.competencia_fatura === competencia;
        });
        const totalFatura = parcelasDaFatura.reduce((sum, p) => sum + p.valor_parcela, 0);

        const pagamentosDaFatura = transacoes.filter(t => 
            t.meta_pagamento &&
            t.competencia_fatura === competencia &&
            t.cartao_id && cartoesIds.has(t.cartao_id)
        );
        const totalPago = pagamentosDaFatura.reduce((sum, p) => sum + p.valor, 0);

        const restante = totalFatura - totalPago;
        let status: FaturaStatus = 'Aberta';
        if (totalFatura > 0 && restante <= 0.01) status = 'Paga';
        else if (totalPago > 0) status = 'Parcial';

        return { parcelas: parcelasDaFatura, total: totalFatura, competencia, total_pago: totalPago, restante, status };
    };

    const cartoesVisiveis = selectedView === 'all' ? cartoes : cartoes.filter(c => c.id === selectedView);

    return {
        atual: calcularFatura(competenciaAtual, cartoesVisiveis),
        proxima: calcularFatura(competenciaProxima, cartoesVisiveis)
    };

  }, [selectedView, cartoes, parcelas, compras, transacoes, selectedMonth]);

  useEffect(() => {
    if (isCardModalOpen) {
        const cartao = modalState.data?.cartao as Cartao | null;
        setEditingCartao(cartao);
        if (cartao) {
          setCardForm({ apelido: cartao.apelido, dia_fechamento: cartao.dia_fechamento, dia_vencimento: cartao.dia_vencimento, limite: cartao.limite ? String(cartao.limite * 100) : '', bandeira: cartao.bandeira, cor: cartao.cor, conta_id_padrao: cartao.conta_id_padrao || '' });
        } else {
          setCardForm({ apelido: '', dia_fechamento: 20, dia_vencimento: 28, limite: '', bandeira: BandeiraCartao.Visa, cor: CORES_CARTAO[0].value, conta_id_padrao: contas.filter(c => c.ativo)[0]?.id || '' });
        }
    }
  }, [isCardModalOpen, modalState.data, contas]);
  
  useEffect(() => {
    if (isPagamentoModalOpen) {
        if (faturas.atual.status === 'Paga') {
            closeModal();
            return;
        }
        const contaPadrao = selectedCartao?.conta_id_padrao || contas.filter(c => c.ativo)[0]?.id || '';
        const valorAPagar = Math.max(0, faturas.atual.restante);
        setPagamentoForm({ conta_id: contaPadrao, valor: String(valorAPagar * 100), data: getTodayString() });
    }
  }, [isPagamentoModalOpen, faturas, selectedCartao, contas, closeModal]);

  const parcelasDoMes = useMemo(() => {
    const cartoesVisiveisIds = selectedView === 'all' ? new Set(cartoes.map(c => c.id)) : new Set([selectedView]);
    const parcelasFiltradas = parcelas.filter(p => {
      const compra = compras.find(c => c.id === p.compra_id);
      return compra && cartoesVisiveisIds.has(compra.cartao_id) && p.competencia_fatura === selectedMonth;
    });
    const displayData = parcelasFiltradas.map(parcela => {
        const compra = compras.find(c => c.id === parcela.compra_id)!;
        const categoria = categorias.find(cat => cat.id === compra.categoria_id);
        const parcela_fmt = compra.estorno ? 'Estorno' : compra.parcelas_total === 1 ? 'A Vista' : `${String(parcela.n_parcela).padStart(2, '0')}/${String(compra.parcelas_total).padStart(2, '0')}`;
        return { parcela, compra, categoria, parcela_fmt };
    });
    return displayData.sort((a, b) => a.compra.data_compra.localeCompare(b.compra.data_compra) || a.parcela.n_parcela - b.parcela.n_parcela);
  }, [compras, parcelas, categorias, cartoes, selectedView, selectedMonth]);

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.apelido || !cardForm.bandeira || !cardForm.dia_fechamento || !cardForm.dia_vencimento) { alert("Preencha todos os campos obrigatórios: Nome, Bandeira, Fechamento e Vencimento."); return; }
    const data = { ...cardForm, limite: cardForm.limite ? parseFloat(cardForm.limite) / 100 : null, conta_id_padrao: cardForm.conta_id_padrao || null };
    if (editingCartao) { updateCartao({ ...editingCartao, ...data }); } else { addCartao(data); }
    closeModal();
  };

  const handlePagamentoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedView === 'all') return;
    pagarFatura(selectedView, pagamentoForm.conta_id, parseFloat(pagamentoForm.valor) / 100 || 0, pagamentoForm.data, faturas.atual.competencia);
    closeModal();
  };

  const handlePagarFaturaClick = () => {
    if (selectedView === 'all') {
        setConfirmation({
            title: 'Ação Inválida',
            message: 'Por favor, selecione um cartão específico para registrar o pagamento da fatura.',
            buttons: [{ label: 'Entendi', onClick: () => setConfirmation(null), style: 'primary' }]
        });
        return;
    }
    if (contas.filter(c => c.ativo).length === 0) {
         setConfirmation({
            title: 'Nenhuma Conta Cadastrada',
            message: 'Você precisa de uma conta bancária para pagar a fatura. Deseja cadastrar uma agora?',
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Cadastrar Conta', onClick: () => {
                    setConfirmation(null);
                    setCurrentPage('contas-extrato', { action: 'open-add-modal' });
                }, style: 'primary' }
            ]
        });
        return;
    }
    openModal('pagar-fatura');
  };
  
  const FaturaCard = ({ title, fatura, faturaKey }: { title: string, fatura: FaturaInfo, faturaKey: string }) => {
    const isExpanded = !!expandedFaturas[faturaKey];
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:shadow-none">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-500 dark:text-gray-400">{title} ({fatura.competencia ? formatDate(fatura.competencia + "-01").substring(3) : ''})</p>
                      {fatura.status === 'Paga' && <span className="text-xs font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">Paga</span>}
                      {fatura.status === 'Parcial' && <span className="text-xs font-bold text-white bg-yellow-500 px-2 py-0.5 rounded-full">Parcial</span>}
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(fatura.total)}</p>
                    {fatura.status === 'Parcial' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pago: {formatCurrency(fatura.total_pago)} • Restante: {formatCurrency(fatura.restante)}</p>}
                </div>
                <div className="flex items-center space-x-2">
                    {title === 'Fatura Atual' && (
                        <button onClick={handlePagarFaturaClick} disabled={fatura.status === 'Paga'} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"> <DollarSign size={16}/><span>Pagar</span> </button>
                    )}
                    {fatura.parcelas.length > 0 && (
                        <button onClick={() => setExpandedFaturas(p => ({...p, [faturaKey]: !p[faturaKey]}))} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"> {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />} </button>
                    )}
                </div>
            </div>
            {isExpanded && (
                <div className="mt-4 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                    {fatura.parcelas.map(p => {
                        const compra = compras.find(c => c.id === p.compra_id);
                        const isEstorno = compra?.estorno ?? false;
                        return (
                            <div key={p.id} className={`flex justify-between text-sm ${isEstorno ? 'text-green-500 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                <span className="flex items-center space-x-2"> {isEstorno && <RefreshCcw size={12} />} <span>{compra?.descricao} {isEstorno ? '(Estorno)' : `(${p.n_parcela}/${compra?.parcelas_total})`}</span> </span>
                                <span className="font-medium">{formatCurrency(p.valor_parcela)}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
  };
  
  const renderPurchaseItem = (item: typeof parcelasDoMes[0], isMobile = false) => {
    const cartaoDaCompra = cartoes.find(c => c.id === item.compra.cartao_id);
    if(isMobile) {
        return (
            <div key={item.parcela.id} className={`relative border-t border-gray-200 dark:border-gray-700 ${item.compra.estorno ? 'text-green-500 dark:text-green-400' : ''}`}>
                <div className="absolute left-0 top-0 h-full w-1.5 rounded-r-sm" style={{ backgroundColor: cartaoDaCompra?.cor || 'transparent' }}></div>
                <div className="p-4 pl-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2 font-semibold text-gray-800 dark:text-white">{item.compra.estorno && <RefreshCcw size={14}/>}<span>{item.compra.descricao}</span></div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.categoria?.nome || 'N/A'}</div>
                            {selectedView === 'all' && cartaoDaCompra && <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-2"><div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: cartaoDaCompra?.cor || '#6b7280' }}></div><span>{cartaoDaCompra.apelido}</span></div>}
                        </div>
                        <div className="text-right ml-2">
                            <div className="font-bold">{formatCurrency(item.parcela.valor_parcela)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{formatDate(item.compra.data_compra)}</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-400 dark:text-gray-500">{item.parcela_fmt}</div>
                        <div className="flex justify-center space-x-3">
                            <button onClick={() => openModal('editar-compra-cartao', { compra: item.compra })} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"><Pencil size={16}/></button>
                            <button onClick={() => deleteCompraCartao(item.compra.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={16}/></button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    return (
      <tr key={item.parcela.id} className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${item.compra.estorno ? 'text-green-500 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`} style={{ borderLeft: `4px solid ${cartaoDaCompra?.cor || 'transparent'}` }}>
          <td className="p-3">{formatDate(item.compra.data_compra)}</td>
          {selectedView === 'all' && (<td className="p-3"><div className="flex justify-center items-center space-x-2"><div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: cartaoDaCompra?.cor || '#6b7280' }}></div><span className="whitespace-nowrap">{cartaoDaCompra?.apelido || 'N/A'}</span></div></td>)}
          <td className="p-3 flex justify-center items-center space-x-2">{item.compra.estorno && <RefreshCcw size={14}/>}<span>{item.compra.descricao}</span></td>
          <td className="p-3">{item.categoria?.nome || 'N/A'}</td>
          <td className="p-3 font-medium">{formatCurrency(item.parcela.valor_parcela)}</td>
          <td className="p-3">{item.parcela_fmt}</td>
          <td className="p-3 flex justify-center space-x-3 text-gray-500 dark:text-gray-400">
              <button onClick={() => openModal('editar-compra-cartao', { compra: item.compra })} className="hover:text-blue-500 dark:hover:text-blue-400"><Pencil size={16}/></button>
              <button onClick={() => deleteCompraCartao(item.compra.id)} className="hover:text-red-500 dark:hover:text-red-400"><Trash2 size={16}/></button>
          </td>
      </tr>
    )
  }

  return (
    <div className="animate-fade-in flex flex-col h-full md:flex-row md:space-x-6">
        {/* Card Navigation */}
        <div className="hidden md:flex flex-col w-64 flex-shrink-0">
             {/* Desktop Sidebar */}
             <div className="bg-white dark:bg-gray-800 rounded-lg flex-col p-3 h-full flex shadow-sm dark:shadow-none border dark:border-transparent">
                <div className="flex-grow space-y-2 overflow-y-auto no-scrollbar">
                    <div className={`w-full text-left rounded-lg flex justify-between items-center transition-colors relative overflow-hidden ${selectedView === 'all' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: '#10b981' }}></div>
                        <button onClick={() => setSelectedView('all')} className="flex-grow p-3 pl-5 text-left text-gray-800 dark:text-white">
                            <span className="font-semibold block truncate">Todos os Cartões</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(faturas.atual.total)}</span>
                        </button>
                    </div>
                    <hr className="border-gray-200 dark:border-gray-700" />
                    {cartoesComFatura.map(cartao => (
                        <div key={cartao.id} className={`w-full rounded-lg flex justify-between items-center transition-colors relative overflow-hidden ${selectedView === cartao.id ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: cartao.cor || '#6b7280' }}></div>
                            <button onClick={() => setSelectedView(cartao.id)} className="flex-grow p-3 pl-5 text-left overflow-hidden text-gray-800 dark:text-white">
                               <span className="font-semibold block truncate">{cartao.apelido}</span>
                               <span className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(cartao.faturaAtual)}</span>
                            </button>
                            <div className="flex flex-shrink-0 space-x-1 pr-3 z-10 text-gray-500 dark:text-current">
                                <button onClick={(e) => { e.stopPropagation(); openModal('editar-cartao', { cartao }); }} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-black/20" title="Editar Cartão"><Pencil size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteCartao(cartao.id); }} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-black/20" title="Excluir Cartão"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    {cartoes.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-4">Nenhum cartão cadastrado.</p>}
                </div>
                <div className="pt-3 mt-auto border-t border-gray-200 dark:border-gray-700/50"><button onClick={() => openModal('novo-cartao')} className="w-full text-center p-2 rounded-lg flex items-center justify-center space-x-2 transition-colors bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white opacity-80 dark:opacity-70 hover:opacity-100"><Plus size={16} /><span>Novo Cartão</span></button></div>
             </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
            <DatePeriodSelector 
              title="Cartões de Crédito"
              selectedMonth={selectedMonth} 
              onMonthChange={onMonthChange} 
            />
            
             {/* Mobile Controls */}
             <div className="md:hidden">
                <MobileSelector
                    allLabel={(
                        <div className="flex items-center space-x-3">
                            <div className="w-1.5 h-10 flex-shrink-0 rounded-full bg-green-500"></div>
                            <div>
                                <div className="font-semibold text-gray-900 dark:text-white">Todos os Cartões</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(faturas.atual.total)}</div>
                            </div>
                        </div>
                    )}
                    options={cartoesComFatura.map(cartao => ({
                        value: cartao.id,
                        label: (
                           <div className="flex justify-between items-center w-full">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className="w-1.5 h-10 flex-shrink-0 rounded-full" style={{ backgroundColor: cartao.cor || 'transparent' }}></div>
                                    <div className="overflow-hidden">
                                        <div className="font-semibold text-gray-900 dark:text-white truncate">{cartao.apelido}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(cartao.faturaAtual)}</div>
                                    </div>
                                </div>
                                <div className="flex space-x-1 flex-shrink-0 pl-2 text-gray-800 dark:text-white">
                                    <button onClick={(e) => { e.stopPropagation(); openModal('editar-cartao', { cartao }); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Pencil size={18} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteCartao(cartao.id); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        )
                    }))}
                    value={selectedView}
                    onChange={setSelectedView}
                    onAddNew={() => openModal('novo-cartao')}
                    addNewLabel="Adicionar novo cartão"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <FaturaCard title="Fatura Atual" fatura={faturas.atual} faturaKey="atual" />
                <FaturaCard title="Próxima Fatura" fatura={faturas.proxima} faturaKey="proxima" />
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex-grow flex flex-col overflow-hidden shadow-sm dark:shadow-none border dark:border-transparent">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Compras {selectedCartao ? `(${selectedCartao.apelido})` : '(Todos)'}</h3>
                <div className="flex space-x-2">
                    <button onClick={() => openModal('nova-compra-cartao', { cartaoId: selectedView !== 'all' ? selectedView : undefined })} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg flex items-center space-x-2 text-sm"> <ShoppingCart size={16}/><span>Nova Compra</span> </button>
                </div>
                </div>
                <div className="overflow-y-auto flex-grow text-gray-700 dark:text-gray-300">
                    {/* Desktop Table */}
                    <table className="w-full text-center text-sm hidden md:table">
                        <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10"><tr className="text-gray-600 dark:text-gray-300"><th className="p-3 font-semibold">Data</th>{selectedView === 'all' && <th className="p-3 font-semibold">Cartão</th>}<th className="p-3 font-semibold">Descrição</th><th className="p-3 font-semibold">Categoria</th><th className="p-3 font-semibold">Valor</th><th className="p-3 font-semibold">Parcelas</th><th className="p-3 font-semibold">Ações</th></tr></thead>
                        <tbody>{parcelasDoMes.map(item => renderPurchaseItem(item, false))}{parcelasDoMes.length === 0 && ( <tr><td colSpan={selectedView === 'all' ? 7 : 6} className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma parcela na fatura deste mês.</td></tr> )}</tbody>
                    </table>
                    {/* Mobile List */}
                    <div className="md:hidden">
                        {parcelasDoMes.length > 0 ? parcelasDoMes.map(item => renderPurchaseItem(item, true)) : (<div className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma parcela na fatura deste mês.</div>)}
                    </div>
                </div>
            </div>
        </div>
      
        <Modal isOpen={isCardModalOpen} onClose={closeModal} title={editingCartao ? "Editar Cartão" : "Novo Cartão"}>
            <form onSubmit={handleCardSubmit} className="space-y-4">
                <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Cartão</label> <input type="text" value={cardForm.apelido} onChange={e => setCardForm({...cardForm, apelido: e.target.value})} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/> </div>
                <div className="relative"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bandeira</label> <select value={cardForm.bandeira} onChange={e => setCardForm({...cardForm, bandeira: e.target.value as BandeiraCartao})} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"> {Object.values(BandeiraCartao).map(b => <option key={b} value={b}>{b}</option>)} </select> <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/> </div>
                <div className="grid grid-cols-2 gap-4">
                    <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia de Vencimento</label> <input type="number" min="1" max="31" value={cardForm.dia_vencimento} onChange={e => setCardForm({...cardForm, dia_vencimento: Number(e.target.value)})} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/> </div>
                    <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia de Fechamento</label> <input type="number" min="1" max="28" value={cardForm.dia_fechamento} onChange={e => setCardForm({...cardForm, dia_fechamento: Number(e.target.value)})} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/> </div>
                </div>
                <div> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Limite Total (opcional)</label> <CurrencyInput value={cardForm.limite} onValueChange={value => setCardForm({...cardForm, limite: value})} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white" placeholder="R$ 0,00" /> </div>
                <div className="relative"> <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta Associada (p/ pagamento)</label> <select value={cardForm.conta_id_padrao} onChange={e => setCardForm({...cardForm, conta_id_padrao: e.target.value})} className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"> <option value="">Nenhuma</option> {contas.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)} </select> <ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-400" size={18}/> </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor Identificadora</label>
                    <div className="flex flex-wrap gap-3">
                        {CORES_CARTAO.map(cor => ( <button key={cor.value} type="button" title={cor.label} onClick={() => setCardForm({...cardForm, cor: cor.value})} className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${cardForm.cor === cor.value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-white' : ''}`} style={{ backgroundColor: cor.value }} /> ))}
                    </div>
                </div>
                <div className="pt-4 flex justify-end space-x-3"> <button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold">Cancelar</button> <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">Salvar</button> </div>
            </form>
        </Modal>
        
        <Modal isOpen={isPagamentoModalOpen} onClose={closeModal} title="Registrar Pagamento de Fatura">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4 text-center text-sm">
              <p className="text-gray-600 dark:text-gray-300">Total: <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(faturas.atual.total)}</span></p>
              <p className="text-green-600 dark:text-green-400">Pago: <span className="font-bold">{formatCurrency(faturas.atual.total_pago)}</span></p>
              <p className="text-red-600 dark:text-red-400">Restante: <span className="font-bold">{formatCurrency(faturas.atual.restante)}</span></p>
            </div>
            <form onSubmit={handlePagamentoSubmit} className="space-y-4">
                <input type="date" value={pagamentoForm.data} onChange={e => setPagamentoForm({...pagamentoForm, data: e.target.value})} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                <div className="relative">
                    <select value={pagamentoForm.conta_id} onChange={e => setPagamentoForm({...pagamentoForm, conta_id: e.target.value})} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 pl-3 pr-10 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white">
                        <option value="" disabled>Selecione a conta...</option>
                        {contas.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={18}/>
                </div>
                <CurrencyInput placeholder="Valor do Pagamento (R$)" value={pagamentoForm.valor} onValueChange={value => setPagamentoForm({...pagamentoForm, valor: value})} required className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-900 dark:text-white"/>
                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold">Cancelar</button>
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">Confirmar Pagamento</button>
                </div>
            </form>
        </Modal>
    </div>
  );
};

export default CartoesPage;
