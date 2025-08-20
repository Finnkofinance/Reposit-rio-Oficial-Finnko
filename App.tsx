
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sun, Moon, AlertTriangle, Info, ChevronDown, Check, X } from 'lucide-react';
import Papa from 'papaparse';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ContasExtratoPage from './pages/ContasExtratoPage';
import FluxoCaixaPage from './pages/FluxoCaixaPage';
import CartoesPage from './pages/CartoesPage';
import ResumoPage from './pages/ResumoPage';
import InvestimentosPage from './pages/InvestimentosPage';
import PerfilPage from './pages/PerfilPage';
import CalculadoraJurosCompostosPage from './pages/CalculadoraJurosCompostosPage';
import CalculadoraReservaEmergenciaPage from './pages/CalculadoraReservaEmergenciaPage';
import Toast from './components/Toast';
import ConfirmationModal, { ConfirmationModalData } from './components/ConfirmationModal';
import Modal from './components/Modal';
import NovaTransacaoModal from './components/NovaTransacaoModal';
import EditarTransacaoModal from './components/EditarTransacaoModal';
import EditarTransferenciaModal from './components/EditarTransferenciaModal';
import NovaCompraCartaoModal from './components/NovaCompraCartaoModal';
import EditarCompraCartaoModal from './components/EditarCompraCartaoModal';
import ImageCropModal from './components/ImageCropModal';
import SearchModal from './components/SearchModal';

import { Page, ContaBancaria, TransacaoBanco, Cartao, Categoria, CompraCartao, ParcelaCartao, TipoCategoria, ModalState, NavigationState, ObjetivoInvestimento, Settings, Ativo, Alocacao } from './types';
import { CATEGORIAS_PADRAO, CORES_CARTAO } from './constants';
import { formatCurrency, computeFirstCompetency, addMonths, ymToISOFirstDay, splitInstallments, parseBrDate, parseCurrency, formatDate, calculateSaldo } from './utils/format';

type CsvTransaction = { data: string; descricao: string; valor: number; originalLine: any };
type CsvImportRow = CsvTransaction & {
    selected: boolean;
    isDuplicate: boolean;
};
type CsvImportState = {
    transactions: CsvImportRow[];
    fileName: string;
} | null;

// Custom hook for persisting state to localStorage
function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            const serializedState = JSON.stringify(state);
            window.localStorage.setItem(key, serializedState);
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    }, [key, state]);

    return [state, setState];
}

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('resumo');
    const [navigationState, setNavigationState] = useState<NavigationState | null>(null);

    // Feedback System State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationModalData | null>(null);
    const [modalState, setModalState] = useState<ModalState>({ modal: null, data: null });
    
    // Data State
    const [contas, setContas] = usePersistentState<ContaBancaria[]>('contas', []);
    const [transacoes, setTransacoes] = usePersistentState<TransacaoBanco[]>('transacoes', []);
    const [cartoes, setCartoes] = usePersistentState<Cartao[]>('cartoes', []);
    const [categorias, setCategorias] = usePersistentState<Categoria[]>('categorias', CATEGORIAS_PADRAO);
    const [compras, setCompras] = usePersistentState<CompraCartao[]>('compras', []);
    const [parcelas, setParcelas] = usePersistentState<ParcelaCartao[]>('parcelas', []);
    const [objetivos, setObjetivos] = usePersistentState<ObjetivoInvestimento[]>('objetivos', []);
    const [ativos, setAtivos] = usePersistentState<Ativo[]>('ativos', []);
    const [alocacoes, setAlocacoes] = usePersistentState<Alocacao[]>('alocacoes', []);
    
    // UI State
    const [profilePicture, setProfilePicture] = usePersistentState<string | null>('profilePicture', null);
    const [settings, setSettings] = usePersistentState<Settings>('settings', { showPercentageChange: false });
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('theme', 'dark');

    // CSV Import State
    const [csvImportState, setCsvImportState] = useState<CsvImportState>(null);
    
    // Search state
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Global navigation/view state
    const [selectedViewId, setSelectedViewId] = useState<'all' | string>('all');
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

    const openModal = (modal: string, data: any = null) => {
        setModalState({ modal, data });
    };

    const closeModal = () => {
        setModalState({ modal: null, data: null });
    };

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
    }, [theme]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };
    
    const setCurrentPageWithNavReset = (page: Page, state: NavigationState | null = null) => {
        if (page === 'categorias-nav') {
            setCurrentPage('perfil');
            setNavigationState({ viewId: 'categorias' });
        } else {
            setCurrentPage(page);
            setNavigationState(state);
        }
        
        if (page !== 'contas-extrato' && page !== 'cartoes') {
            setSelectedViewId('all');
        }
    };
    
    // --- Data Management Functions ---

    const handleAddConta = (contaData: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }) => {
        const newConta: ContaBancaria = {
            ...contaData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const newInitialBalanceTx: TransacaoBanco = {
            id: crypto.randomUUID(),
            conta_id: newConta.id,
            data: contaData.data_inicial,
            valor: contaData.saldo_inicial,
            categoria_id: 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e71', // Saldo Inicial
            tipo: TipoCategoria.Transferencia,
            descricao: 'Saldo inicial da conta',
            previsto: false,
            realizado: true,
            meta_saldo_inicial: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setContas(prev => [...prev, newConta]);
        setTransacoes(prev => [...prev, newInitialBalanceTx]);
        showToast(`Conta "${newConta.nome}" criada!`, 'success');
        return newConta;
    };
    
    const handleUpdateConta = (conta: Omit<ContaBancaria, 'saldo_inicial'>, novoSaldoInicial: number, novaDataInicial: string) => {
        setContas(prev => prev.map(c => c.id === conta.id ? { ...c, ...conta, updatedAt: new Date().toISOString() } : c));
        setTransacoes(prev => prev.map(t => {
            if (t.conta_id === conta.id && t.meta_saldo_inicial) {
                return { ...t, valor: novoSaldoInicial, data: novaDataInicial, updatedAt: new Date().toISOString() };
            }
            return t;
        }));
        showToast(`Conta "${conta.nome}" atualizada!`, 'success');
    };

    const handleDeleteConta = (id: string) => {
        const cartaoUsandoConta = cartoes.find(cartao => cartao.conta_id_padrao === id);
        if (cartaoUsandoConta) {
            showToast(`Não é possível excluir. A conta é padrão para o cartão "${cartaoUsandoConta.apelido}".`, 'error');
            return;
        }

        const conta = contas.find(c => c.id === id);
        if (!conta) return;

        setConfirmation({
            title: `Excluir Conta`,
            message: `Tem certeza que deseja excluir a conta "${conta.nome}"? Todas as suas transações serão perdidas.`,
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Excluir', onClick: () => {
                    setContas(prev => prev.filter(c => c.id !== id));
                    setTransacoes(prev => prev.filter(t => t.conta_id !== id));
                    if (selectedViewId === id) setSelectedViewId('all');
                    setConfirmation(null);
                    showToast('Conta excluída.', 'info');
                }, style: 'danger' },
            ]
        });
    };
    
    const handleAddCartao = (cartaoData: Omit<Cartao, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newCartao = { ...cartaoData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setCartoes(prev => [...prev, newCartao]);
        showToast(`Cartão "${newCartao.apelido}" adicionado!`, 'success');
    };

    const handleUpdateCartao = (cartao: Cartao) => {
        setCartoes(prev => prev.map(c => c.id === cartao.id ? { ...cartao, updatedAt: new Date().toISOString() } : c));
        showToast(`Cartão "${cartao.apelido}" atualizado!`, 'success');
    };
    
    const handleDeleteCartao = (id: string) => {
        const cartao = cartoes.find(c => c.id === id);
        if (!cartao) return;
        setConfirmation({
            title: `Excluir Cartão`,
            message: `Tem certeza que deseja excluir o cartão "${cartao.apelido}"? Todas as suas compras e parcelas serão perdidas.`,
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Excluir', onClick: () => {
                    const comprasToDelete = new Set(compras.filter(c => c.cartao_id === id).map(c => c.id));
                    setCartoes(prev => prev.filter(c => c.id !== id));
                    setCompras(prev => prev.filter(c => c.cartao_id !== id));
                    setParcelas(prev => prev.filter(p => !comprasToDelete.has(p.compra_id)));
                    if (selectedViewId === id) setSelectedViewId('all');
                    setConfirmation(null);
                    showToast('Cartão excluído.', 'info');
                }, style: 'danger' },
            ]
        });
    };

    const handleAddCompraCartao = (compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'> & { parcelas: number }) => {
        const { parcelas: numParcelas, ...rest } = compraData;
        const cartao = cartoes.find(c => c.id === rest.cartao_id);
        if (!cartao) {
            showToast('Cartão não encontrado.', 'error');
            return false;
        }

        if (rest.recorrencia) {
            const recorrencia_id = crypto.randomUUID();
            const newCompras: CompraCartao[] = [];
            const newParcelas: ParcelaCartao[] = [];
            const baseDate = new Date(`${rest.data_compra}T12:00:00Z`);
            const futureOccurrences = rest.recorrencia === 'anual' ? 5 : 24;

            for (let i = 0; i < futureOccurrences; i++) {
                const nextDate = new Date(baseDate);
                if (rest.recorrencia === 'mensal') {
                    nextDate.setUTCMonth(nextDate.getUTCMonth() + i);
                } else if (rest.recorrencia === 'anual') {
                    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + i);
                }

                const newCompra: CompraCartao = {
                    ...rest,
                    id: crypto.randomUUID(),
                    data_compra: nextDate.toISOString().split('T')[0],
                    parcelas_total: 1, // Recurring purchases are single installment
                    recorrencia_id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                newCompras.push(newCompra);
                
                const { year, month } = computeFirstCompetency(nextDate, cartao.dia_fechamento);
                const newParcela: ParcelaCartao = {
                    id: crypto.randomUUID(),
                    compra_id: newCompra.id,
                    n_parcela: 1,
                    valor_parcela: newCompra.valor_total,
                    competencia_fatura: `${year}-${String(month + 1).padStart(2, '0')}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                newParcelas.push(newParcela);
            }
            setCompras(prev => [...prev, ...newCompras]);
            setParcelas(prev => [...prev, ...newParcelas]);
            showToast('Compra recorrente adicionada!', 'success');
            return true;
        } else {
            const newCompra: CompraCartao = {
                ...rest,
                id: crypto.randomUUID(),
                parcelas_total: numParcelas,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const valoresParcelas = splitInstallments(newCompra.valor_total, numParcelas);
            const { year, month } = computeFirstCompetency(new Date(`${newCompra.data_compra}T12:00:00Z`), cartao.dia_fechamento);
            const newParcelas: ParcelaCartao[] = [];

            for (let i = 0; i < numParcelas; i++) {
                const { year: compYear, month: compMonth } = addMonths(year, month, i);
                newParcelas.push({
                    id: crypto.randomUUID(),
                    compra_id: newCompra.id,
                    n_parcela: i + 1,
                    valor_parcela: valoresParcelas[i],
                    competencia_fatura: `${compYear}-${String(compMonth + 1).padStart(2, '0')}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
            
            setCompras(prev => [...prev, newCompra]);
            setParcelas(prev => [...prev, ...newParcelas]);
            showToast('Compra adicionada!', 'success');
            return true;
        }
    };
    
    const handleUpdateCompraCartao = (compra: CompraCartao & { parcelas: number }) => {
        const cartao = cartoes.find(c => c.id === compra.cartao_id);
        if (!cartao) {
            showToast('Cartão não encontrado.', 'error');
            return false;
        }
        
        // Remove old installments
        const parcelasToKeep = parcelas.filter(p => p.compra_id !== compra.id);

        // Recalculate new ones
        const valoresParcelas = splitInstallments(compra.valor_total, compra.parcelas);
        const { year, month } = computeFirstCompetency(new Date(`${compra.data_compra}T12:00:00Z`), cartao.dia_fechamento);
        const newParcelas: ParcelaCartao[] = [];
        for (let i = 0; i < compra.parcelas; i++) {
            const { year: compYear, month: compMonth } = addMonths(year, month, i);
            newParcelas.push({
                id: crypto.randomUUID(),
                compra_id: compra.id,
                n_parcela: i + 1,
                valor_parcela: valoresParcelas[i],
                competencia_fatura: `${compYear}-${String(compMonth + 1).padStart(2, '0')}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
        
        setCompras(prev => prev.map(c => c.id === compra.id ? { ...c, ...compra, parcelas_total: compra.parcelas, updatedAt: new Date().toISOString() } : c));
        setParcelas([...parcelasToKeep, ...newParcelas]);
        showToast('Compra atualizada!', 'success');
        return true;
    };
    
    const handleDeleteCompraCartao = (id: string) => {
        const compra = compras.find(c => c.id === id);
        if (!compra) return;
        setConfirmation({
            title: "Excluir Compra",
            message: `Tem certeza que deseja excluir a compra "${compra.descricao}"?`,
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Excluir', onClick: () => {
                    setCompras(prev => prev.filter(c => c.id !== id));
                    setParcelas(prev => prev.filter(p => p.compra_id !== id));
                    setConfirmation(null);
                    showToast('Compra excluída.', 'info');
                }, style: 'danger' },
            ]
        });
    };
    
    const handlePagarFatura = (cartaoId: string, contaId: string, valor: number, data: string, competencia: string) => {
        if(valor <= 0) {
            showToast('O valor do pagamento deve ser positivo.', 'error');
            return;
        }
        const cartao = cartoes.find(c => c.id === cartaoId);
        if (!cartao) return;
        const newPayment: TransacaoBanco = {
            id: crypto.randomUUID(),
            conta_id: contaId,
            data,
            valor,
            categoria_id: 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e72', // Pagamento de Cartão
            tipo: TipoCategoria.Saida,
            descricao: `Pagamento Fatura ${cartao.apelido}`,
            previsto: false,
            realizado: true,
            meta_pagamento: true,
            cartao_id: cartaoId,
            competencia_fatura: competencia,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setTransacoes(prev => [...prev, newPayment]);
        showToast('Pagamento de fatura registrado!', 'success');
    };

    const handleAddTransacao = (transacaoData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>) => {
        const categoria = categorias.find(c => c.id === transacaoData.categoria_id);
        if (!categoria) {
            showToast('Categoria não encontrada.', 'error');
            return;
        }
        
        if (transacaoData.recorrencia) {
            const recorrencia_id = crypto.randomUUID();
            const newTransactions: TransacaoBanco[] = [];
            const baseDate = new Date(`${transacaoData.data}T12:00:00Z`);

            const firstTx: TransacaoBanco = {
                ...transacaoData,
                id: crypto.randomUUID(),
                tipo: categoria.tipo,
                recorrencia_id: recorrencia_id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            newTransactions.push(firstTx);

            const futureOccurrences = transacaoData.recorrencia === 'anual' ? 5 : 24;

            for (let i = 1; i < futureOccurrences; i++) {
                const nextDate = new Date(baseDate);
                if (transacaoData.recorrencia === 'mensal') {
                    nextDate.setUTCMonth(nextDate.getUTCMonth() + i);
                } else if (transacaoData.recorrencia === 'anual') {
                    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + i);
                }

                const futureTx: TransacaoBanco = {
                    ...transacaoData,
                    id: crypto.randomUUID(),
                    tipo: categoria.tipo,
                    recorrencia_id: recorrencia_id,
                    recorrencia: transacaoData.recorrencia,
                    data: nextDate.toISOString().split('T')[0],
                    previsto: true,
                    realizado: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                newTransactions.push(futureTx);
            }
            setTransacoes(prev => [...prev, ...newTransactions]);
            showToast(`Transação recorrente "${transacaoData.descricao}" criada!`, 'success');
        } else {
            const newTransacao: TransacaoBanco = {
                ...transacaoData,
                id: crypto.randomUUID(),
                tipo: categoria.tipo,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setTransacoes(prev => [...prev, newTransacao]);
            showToast('Transação adicionada!', 'success');
        }
    };

    const handleAddTransferencia = (data: { origem_id: string; destino_id: string; valor: number; data: string; descricao: string; }) => {
        const { origem_id, destino_id, valor, data: date, descricao } = data;
        const id1 = crypto.randomUUID();
        const id2 = crypto.randomUUID();
        const [debitId, creditId] = id1 < id2 ? [id1, id2] : [id2, id1];

        const transferenciaCategoriaId = 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e70';
        
        const contaOrigem = contas.find(c => c.id === origem_id)?.nome;
        const contaDestino = contas.find(c => c.id === destino_id)?.nome;

        const debitTx: TransacaoBanco = {
            id: debitId,
            conta_id: origem_id,
            data: date, valor,
            categoria_id: transferenciaCategoriaId,
            tipo: TipoCategoria.Transferencia,
            descricao: `Transf. p/ ${contaDestino}: ${descricao}`,
            previsto: false, realizado: true,
            transferencia_par_id: creditId,
            createdAt: new Date().toISOString(),
        };

        const creditTx: TransacaoBanco = {
            id: creditId,
            conta_id: destino_id,
            data: date, valor,
            categoria_id: transferenciaCategoriaId,
            tipo: TipoCategoria.Transferencia,
            descricao: `Transf. de ${contaOrigem}: ${descricao}`,
            previsto: false, realizado: true,
            transferencia_par_id: debitId,
            createdAt: new Date().toISOString(),
        };
        
        setTransacoes(prev => [...prev, debitTx, creditTx]);
        showToast('Transferência registrada!', 'success');
    };

    const handleUpdateTransacao = (tx: TransacaoBanco) => {
        const categoria = categorias.find(c => c.id === tx.categoria_id);
        if (!categoria) {
            showToast('Categoria inválida.', 'error');
            return;
        }
        const updatedTx = { ...tx, tipo: categoria.tipo, updatedAt: new Date().toISOString() };
        setTransacoes(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
        showToast('Transação atualizada!', 'success');
    };

    const handleUpdateTransferencia = (data: { originalTxId: string; valor: number; data: string; descricao: string; }) => {
        const { originalTxId, valor, data: date, descricao } = data;
        setTransacoes(prev => {
            const tx1 = prev.find(t => t.id === originalTxId);
            if (!tx1 || !tx1.transferencia_par_id) return prev;
            const tx2 = prev.find(t => t.id === tx1.transferencia_par_id);
            if (!tx2) return prev;
            
            const [debitTx, creditTx] = tx1.id < tx2.id ? [tx1, tx2] : [tx2, tx1];

            const contaOrigem = contas.find(c => c.id === debitTx.conta_id)?.nome;
            const contaDestino = contas.find(c => c.id === creditTx.conta_id)?.nome;

            const updatedDebitTx = {
                ...debitTx, valor, data: date,
                descricao: `Transf. p/ ${contaDestino}: ${descricao}`,
                updatedAt: new Date().toISOString(),
            };
            const updatedCreditTx = {
                ...creditTx, valor, data: date,
                descricao: `Transf. de ${contaOrigem}: ${descricao}`,
                updatedAt: new Date().toISOString(),
            };
            
            return prev.map(t => {
                if(t.id === updatedDebitTx.id) return updatedDebitTx;
                if(t.id === updatedCreditTx.id) return updatedCreditTx;
                return t;
            });
        });
        showToast('Transferência atualizada!', 'success');
    };
    
    const handleDeleteTransacao = (id: string) => {
        setConfirmation({
            title: "Excluir Transação",
            message: `Tem certeza que deseja excluir esta transação?`,
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Excluir', onClick: () => {
                    const tx = transacoes.find(t => t.id === id);
                    let idsToDelete = new Set([id]);
                    if (tx?.transferencia_par_id) idsToDelete.add(tx.transferencia_par_id);
                    setTransacoes(prev => prev.filter(t => !idsToDelete.has(t.id)));
                    setConfirmation(null);
                    showToast('Transação excluída.', 'info');
                }, style: 'danger' },
            ]
        });
    };
    
    const handleDeleteTransacoes = (ids: string[]) => {
         setConfirmation({
            title: `Excluir ${ids.length} Transações`,
            message: `Tem certeza que deseja excluir as ${ids.length} transações selecionadas?`,
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Excluir', onClick: () => {
                    let idsToDelete = new Set(ids);
                    ids.forEach(id => {
                        const tx = transacoes.find(t => t.id === id);
                        if(tx?.transferencia_par_id) idsToDelete.add(tx.transferencia_par_id);
                    });
                    setTransacoes(prev => prev.filter(t => !idsToDelete.has(t.id)));
                    setConfirmation(null);
                    showToast(`${ids.length} transações excluídas.`, 'info');
                }, style: 'danger' },
            ]
        });
    };

    const handleUpdateTransacoesCategoria = (ids: string[], newCategoryId: string) => {
        const categoria = categorias.find(c => c.id === newCategoryId);
        if(!categoria) return;
        setTransacoes(prev => prev.map(t => ids.includes(t.id) ? {...t, categoria_id: newCategoryId, tipo: categoria.tipo, updatedAt: new Date().toISOString()} : t));
        showToast('Categorias atualizadas!', 'success');
    };

    const handleToggleTransactionRealizado = (id: string) => {
        setTransacoes(prev => prev.map(t => t.id === id ? { ...t, realizado: !t.realizado } : t));
    };

    const handleAddCategoria = (cat: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>) => {
        const newCat: Categoria = { ...cat, id: crypto.randomUUID(), sistema: false, createdAt: new Date().toISOString() };
        setCategorias(prev => [...prev, newCat]);
        showToast('Categoria adicionada!', 'success');
    };

    const handleUpdateCategoria = (cat: Categoria) => {
        setCategorias(prev => prev.map(c => c.id === cat.id ? { ...cat, updatedAt: new Date().toISOString() } : c));
        showToast('Categoria atualizada!', 'success');
    };

    const handleDeleteCategoria = (id: string) => {
        const cat = categorias.find(c => c.id === id);
        if(!cat || cat.sistema) return;

        const isUsed = transacoes.some(t => t.categoria_id === id) || compras.some(c => c.categoria_id === id);
        if (isUsed) {
            showToast('Não é possível excluir uma categoria que está em uso.', 'error');
            return;
        }

        setConfirmation({
            title: "Excluir Categoria", message: `Tem certeza que deseja excluir a categoria "${cat.nome}"?`,
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Excluir', onClick: () => {
                    setCategorias(prev => prev.filter(c => c.id !== id));
                    setConfirmation(null);
                    showToast('Categoria excluída.', 'info');
                }, style: 'danger' },
            ]
        });
    };
    
    const handleAddObjetivo = (obj: Omit<ObjetivoInvestimento, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newObj: ObjetivoInvestimento = { ...obj, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        setObjetivos(prev => [...prev, newObj]);
        showToast('Objetivo criado!', 'success');
    };

    const handleUpdateObjetivo = (obj: ObjetivoInvestimento) => {
        setObjetivos(prev => prev.map(o => o.id === obj.id ? { ...obj, updatedAt: new Date().toISOString() } : o));
        showToast('Objetivo atualizado!', 'success');
    };

    const handleDeleteObjetivo = (id: string) => {
        const obj = objetivos.find(o => o.id === id);
        if(!obj) return;
        const isUsed = alocacoes.some(a => a.objetivo_id === id);
        if(isUsed) {
            showToast('Não é possível excluir um objetivo com ativos alocados a ele.', 'error');
            return;
        }

        setConfirmation({
            title: "Excluir Objetivo", message: `Tem certeza que deseja excluir o objetivo "${obj.nome}"?`,
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Excluir', onClick: () => {
                    setObjetivos(prev => prev.filter(o => o.id !== id));
                    setAlocacoes(prev => prev.filter(a => a.objetivo_id !== id));
                    setConfirmation(null);
                    showToast('Objetivo excluído.', 'info');
                }, style: 'danger' },
            ]
        });
    };
    
    const handleAddAtivo = (ativoData: Omit<Ativo, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newAtivo = { ...ativoData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setAtivos(prev => [...prev, newAtivo]);
        showToast('Ativo adicionado!', 'success');
    };

    const handleUpdateAtivo = (ativo: Ativo) => {
        setAtivos(prev => prev.map(a => a.id === ativo.id ? { ...ativo, updatedAt: new Date().toISOString() } : a));
        showToast('Ativo atualizado!', 'success');
    };

    const handleDeleteAtivo = (ativoId: string) => {
        setAtivos(prev => prev.filter(a => a.id !== ativoId));
        setAlocacoes(prev => prev.filter(a => a.ativo_id !== ativoId));
        showToast('Ativo excluído.', 'info');
    };
    
    const handleAddInvestimentoTransaction = (txData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>) => {
        const categoria = categorias.find(c => c.id === txData.categoria_id);
        if (!categoria || categoria.tipo !== TipoCategoria.Investimento) {
            showToast('Categoria de investimento inválida.', 'error');
            return;
        }

        const newTx: TransacaoBanco = {
            ...txData,
            id: crypto.randomUUID(),
            tipo: TipoCategoria.Investimento,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setTransacoes(prev => [...prev, newTx]);
        showToast('Investimento registrado!', 'success');
    };

    const handleSetAlocacoesParaAtivo = (ativoId: string, novasAlocacoes: Omit<Alocacao, 'id' | 'ativo_id'>[]) => {
        const otherAlocacoes = alocacoes.filter(a => a.ativo_id !== ativoId);
        const newFullAlocacoes = novasAlocacoes.map(a => ({
            ...a,
            id: crypto.randomUUID(),
            ativo_id: ativoId,
        }));
        setAlocacoes([...otherAlocacoes, ...newFullAlocacoes]);
        showToast('Alocação do ativo salva!', 'success');
    };
    
    const handleSetProfilePicture = (croppedImage: string) => {
        setProfilePicture(croppedImage);
        setImageToCrop(null);
        showToast('Foto de perfil atualizada!', 'success');
    };
  
    const handleRemoveProfilePicture = () => {
        setProfilePicture(null);
        showToast('Foto de perfil removida.', 'info');
    };
  
    const handleExportData = () => {
        try {
            const dataToExport = { version: '1.0.0', contas, transacoes, cartoes, categorias, compras, parcelas, objetivos, ativos, alocacoes, profilePicture, settings, theme };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `finnko_backup_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Backup exportado com sucesso!', 'success');
        } catch (error) {
            console.error("Export error:", error);
            showToast('Ocorreu um erro ao exportar os dados.', 'error');
        }
    };

    const processCsvImport = (file: File) => {
        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const transactions: CsvImportRow[] = [];
                const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
                const valueRegex = /(-?)\s*R?\$\s*([\d.,]+)/;

                for (const row of results.data as any[]) {
                    try {
                        let dateStr: string | null = null;
                        let valueNum: number | null = null;
                        let desc: string | null = null;
                        
                        // Heuristics to find columns
                        const dateCol = row.find((cell: string) => dateRegex.test(cell));
                        const valueCol = row.find((cell: string) => valueRegex.test(cell));
                        
                        if (dateCol) dateStr = parseBrDate(dateRegex.exec(dateCol)![0]);

                        if (valueCol) {
                            const match = valueRegex.exec(valueCol);
                            if (match) {
                                const sign = match[1] === '-' ? -1 : 1;
                                valueNum = parseCurrency(match[2]) * sign;
                            }
                        }
                        
                        // Find description (longest string that isn't date or value)
                        const otherCols = row.filter((cell:string) => cell !== dateCol && cell !== valueCol);
                        if(otherCols.length > 0) {
                            desc = otherCols.sort((a,b) => b.length - a.length)[0].trim();
                        }

                        if (dateStr && valueNum !== null && desc) {
                             transactions.push({
                                data: dateStr,
                                descricao: desc,
                                valor: valueNum,
                                originalLine: row,
                                selected: true,
                                isDuplicate: false,
                             });
                        }
                    } catch(e) { /* ignore row */ }
                }

                if (transactions.length > 0) {
                    setCsvImportState({ transactions, fileName: file.name });
                } else {
                    showToast('Nenhuma transação válida encontrada no arquivo CSV.', 'error');
                }
            },
            error: () => showToast('Erro ao ler o arquivo CSV.', 'error')
        });
    };

    const handleImportData = (file: File) => {
        if (file.name.endsWith('.json')) {
            setConfirmation({
                title: "Importar Backup",
                message: "Você tem certeza que deseja importar este arquivo? Todos os seus dados atuais serão substituídos. Esta ação não pode ser desfeita.",
                buttons: [
                    { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                    { label: 'Confirmar Importação', onClick: () => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const importedData = JSON.parse(event.target?.result as string);
                                if (importedData.contas && importedData.transacoes && importedData.categorias) {
                                    setContas(importedData.contas || []); setTransacoes(importedData.transacoes || []); setCartoes(importedData.cartoes || []);
                                    const importedCategorias = importedData.categorias || [];
                                    const systemCategories = CATEGORIAS_PADRAO.filter(c => c.sistema);
                                    const userCategories = importedCategorias.filter((c: Categoria) => !c.sistema);
                                    setCategorias([...systemCategories, ...userCategories]);
                                    setCompras(importedData.compras || []); setParcelas(importedData.parcelas || []); setObjetivos(importedData.objetivos || []);
                                    setAtivos(importedData.ativos || []); setAlocacoes(importedData.alocacoes || []);
                                    setProfilePicture(importedData.profilePicture || null); setSettings(importedData.settings || { showPercentageChange: false }); setTheme(importedData.theme || 'dark');
                                    showToast('Dados importados com sucesso!', 'success');
                                    setCurrentPage('resumo');
                                } else { throw new Error('Arquivo de backup inválido ou corrompido.'); }
                            } catch (e) { showToast('Erro ao importar o arquivo. Verifique o formato.', 'error'); } 
                            finally { setConfirmation(null); }
                        };
                        reader.readAsText(file);
                    }, style: 'primary' },
                ],
            });
        } else if (file.name.endsWith('.csv')) {
            processCsvImport(file);
        } else {
            showToast('Formato de arquivo inválido. Use .json ou .csv.', 'error');
        }
    };
    
    const handleFinalizeCsvImport = (importedTransactions: CsvImportRow[], contaDestinoId: string) => {
        const catEntrada = categorias.find(c => c.nome === 'Outras Entradas');
        const catSaida = categorias.find(c => c.nome === 'Outras Despesas');

        const newTxs = importedTransactions
            .filter(t => t.selected)
            .map(t => {
                const isEntrada = t.valor > 0;
                return {
                    id: crypto.randomUUID(),
                    conta_id: contaDestinoId,
                    data: t.data,
                    valor: Math.abs(t.valor),
                    categoria_id: (isEntrada ? catEntrada?.id : catSaida?.id) || '',
                    tipo: isEntrada ? TipoCategoria.Entrada : TipoCategoria.Saida,
                    descricao: t.descricao,
                    previsto: false,
                    realizado: true,
                };
            });
        
        setTransacoes(prev => [...prev, ...newTxs]);
        showToast(`${newTxs.length} transações importadas!`, 'success');
        setCsvImportState(null);
    };

    const handleDeleteAllData = () => {
        setConfirmation({
            title: "Apagar Todos os Dados",
            message: (<span><strong className="text-red-400">Esta é uma ação irreversível.</strong><br />Você tem certeza absoluta que deseja apagar todos os seus dados? Todas as contas, transações, cartões e configurações serão perdidos permanentemente.</span>),
            buttons: [
                { label: 'Cancelar', onClick: () => setConfirmation(null), style: 'secondary' },
                { label: 'Sim, Apagar Tudo', onClick: () => {
                    setContas([]); setTransacoes([]); setCartoes([]); setCategorias(CATEGORIAS_PADRAO); setCompras([]); setParcelas([]); setObjetivos([]); setAtivos([]); setAlocacoes([]); setProfilePicture(null); setSettings({ showPercentageChange: false }); setTheme('dark'); 
                    setConfirmation(null);
                    showToast('Todos os dados foram apagados.', 'info');
                    setCurrentPage('resumo');
                }, style: 'danger' },
            ],
        });
    };
    
    const handleNewTransactionClick = () => {
        if (contas.length > 0) {
            openModal('nova-transacao');
        } else {
            setConfirmation({
                title: 'Nenhuma Conta Cadastrada',
                message: 'Você ainda não tem uma conta cadastrada. Cadastre agora!',
                buttons: [
                    { label: 'Depois', onClick: () => setConfirmation(null), style: 'secondary' },
                    { label: 'Cadastrar Conta', onClick: () => {
                        setConfirmation(null);
                        setCurrentPageWithNavReset('contas-extrato', { action: 'open-add-modal' });
                    }, style: 'primary' },
                ]
            });
        }
    };

    const handleNewCardPurchaseClick = () => {
        if (cartoes.length > 0) {
            openModal('nova-compra-cartao');
        } else {
            setConfirmation({
                title: 'Nenhum Cartão Cadastrado',
                message: 'Você ainda não tem um cartão de crédito cadastrado. Cadastre agora!',
                buttons: [
                    { label: 'Depois', onClick: () => setConfirmation(null), style: 'secondary' },
                    { label: 'Cadastrar Cartão', onClick: () => {
                        setConfirmation(null);
                        setCurrentPageWithNavReset('cartoes', { action: 'open-add-modal' });
                    }, style: 'primary' },
                ]
            });
        }
    };
    
    const searchActions = [
        { id: 'add-transacao', label: 'Adicionar Nova Transação', onClick: () => { setIsSearchModalOpen(false); handleNewTransactionClick(); } },
        { id: 'add-compra', label: 'Adicionar Nova Compra no Cartão', onClick: () => { setIsSearchModalOpen(false); handleNewCardPurchaseClick(); } },
        { id: 'add-conta', label: 'Adicionar Nova Conta', onClick: () => { setIsSearchModalOpen(false); setCurrentPageWithNavReset('contas-extrato', { action: 'open-add-modal' }); } },
        { id: 'add-cartao', label: 'Adicionar Novo Cartão', onClick: () => { setIsSearchModalOpen(false); setCurrentPageWithNavReset('cartoes', { action: 'open-add-modal' }); } },
        { id: 'add-categoria', label: 'Adicionar Nova Categoria', onClick: () => { 
            setIsSearchModalOpen(false); 
            setCurrentPageWithNavReset('perfil', { viewId: 'categorias', action: 'open-add-categoria-modal' }); 
        } },
        { id: 'add-objetivo', label: 'Adicionar Novo Objetivo', onClick: () => { 
            setIsSearchModalOpen(false); 
            setCurrentPageWithNavReset('investimentos', { action: 'open-add-modal' }); 
        } },
    ];

    const searchResults = useMemo(() => {
        const term = searchTerm.toLowerCase();

        if (!term) {
            return {
                actions: searchActions,
                contas: [], cartoes: [], transacoes: [], compras: [], objetivos: [], categorias: [], ativos: []
            };
        }
        
        return {
            actions: searchActions.filter(a => a.label.toLowerCase().includes(term)),
            contas: contas.filter(c => c.nome.toLowerCase().includes(term)),
            cartoes: cartoes.filter(c => c.apelido.toLowerCase().includes(term)),
            transacoes: transacoes.filter(t => t.descricao.toLowerCase().includes(term)),
            compras: compras.filter(c => c.descricao.toLowerCase().includes(term)),
            objetivos: objetivos.filter(o => o.nome.toLowerCase().includes(term)),
            categorias: categorias.filter(c => c.nome.toLowerCase().includes(term) && !c.sistema),
            ativos: ativos.filter(a => a.nome.toLowerCase().includes(term)),
        };
    }, [searchTerm, contas, cartoes, transacoes, compras, objetivos, categorias, ativos]);

    const handleSearchResultClick = (item: any, type: 'conta' | 'cartao' | 'transacao' | 'compra' | 'objetivo' | 'categoria' | 'action' | 'ativo') => {
        setIsSearchModalOpen(false);
        setSearchTerm('');
        switch (type) {
            case 'action':
                item.onClick();
                break;
            case 'conta':
                setCurrentPageWithNavReset('contas-extrato', { viewId: item.id });
                break;
            case 'cartao':
                setCurrentPageWithNavReset('cartoes', { viewId: item.id });
                break;
            case 'transacao':
                setCurrentPageWithNavReset('contas-extrato', { viewId: item.conta_id });
                break;
            case 'compra':
                setCurrentPageWithNavReset('cartoes', { viewId: item.cartao_id });
                break;
            case 'objetivo':
                setCurrentPageWithNavReset('investimentos');
                break;
            case 'categoria':
                 setCurrentPageWithNavReset('perfil', { viewId: 'categorias' });
                break;
            case 'ativo':
                 setCurrentPageWithNavReset('investimentos');
                break;
        }
    };
  
    const renderPage = () => {
        const pageProps = { modalState, openModal, closeModal, selectedView: selectedViewId, setSelectedView: setSelectedViewId, selectedMonth, onMonthChange: setSelectedMonth };
        switch (currentPage) {
            case 'resumo': return <ResumoPage contas={contas} transacoes={transacoes} cartoes={cartoes} compras={compras} parcelas={parcelas} categorias={categorias} setCurrentPage={setCurrentPageWithNavReset} openModal={openModal} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} settings={settings} />;
            case 'contas-extrato': return <ContasExtratoPage contas={contas} transacoes={transacoes} categorias={categorias} addConta={handleAddConta} updateConta={handleUpdateConta} deleteConta={handleDeleteConta} deleteTransacao={handleDeleteTransacao} deleteTransacoes={handleDeleteTransacoes} updateTransacoesCategoria={handleUpdateTransacoesCategoria} toggleTransactionRealizado={handleToggleTransactionRealizado} navigationState={navigationState} clearNavigationState={() => setNavigationState(null)} {...pageProps} />;
            case 'cartoes': return <CartoesPage cartoes={cartoes} contas={contas} categorias={categorias} compras={compras} parcelas={parcelas} transacoes={transacoes} addCartao={handleAddCartao} updateCartao={handleUpdateCartao} deleteCartao={handleDeleteCartao} deleteCompraCartao={handleDeleteCompraCartao} pagarFatura={handlePagarFatura} navigationState={navigationState} clearNavigationState={() => setNavigationState(null)} setConfirmation={setConfirmation} setCurrentPage={setCurrentPageWithNavReset} {...pageProps} />;
            case 'fluxo': return <FluxoCaixaPage contas={contas} transacoes={transacoes} categorias={categorias} compras={compras} parcelas={parcelas} cartoes={cartoes} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />;
            case 'investimentos': return <InvestimentosPage objetivos={objetivos} addObjetivo={handleAddObjetivo} updateObjetivo={handleUpdateObjetivo} deleteObjetivo={handleDeleteObjetivo} ativos={ativos} addAtivo={handleAddAtivo} updateAtivo={handleUpdateAtivo} deleteAtivo={handleDeleteAtivo} alocacoes={alocacoes} setAlocacoesParaAtivo={handleSetAlocacoesParaAtivo} navigationState={navigationState} clearNavigationState={() => setNavigationState(null)} transacoes={transacoes} contas={contas} categorias={categorias} addInvestimentoTransaction={handleAddInvestimentoTransaction} {...pageProps} />;
            case 'perfil': return <PerfilPage categorias={categorias} transacoes={transacoes} compras={compras} parcelas={parcelas} addCategoria={handleAddCategoria} updateCategoria={handleUpdateCategoria} deleteCategoria={handleDeleteCategoria} handleDeleteAllData={handleDeleteAllData} handleExportData={handleExportData} handleImportData={handleImportData} settings={settings} setSettings={setSettings} navigationState={navigationState} clearNavigationState={() => setNavigationState(null)} {...pageProps} />;
            case 'calculadora-juros-compostos': return <CalculadoraJurosCompostosPage />;
            case 'calculadora-reserva-emergencia': return <CalculadoraReservaEmergenciaPage />;
            default: return <div>Página não encontrada</div>;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPageWithNavReset} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header setCurrentPage={setCurrentPageWithNavReset} profilePicture={profilePicture} onImageSelect={setImageToCrop} onImageRemove={handleRemoveProfilePicture} onSearchClick={() => setIsSearchModalOpen(true)} theme={theme} setTheme={setTheme} />
                <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8">
                    {renderPage()}
                </main>
            </div>

            <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPageWithNavReset} onNewTransaction={handleNewTransactionClick} onNewCardPurchase={handleNewCardPurchaseClick} />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {confirmation && <ConfirmationModal data={confirmation} onClose={() => setConfirmation(null)} />}
            {imageToCrop && <ImageCropModal imageSrc={imageToCrop} onClose={() => setImageToCrop(null)} onSave={handleSetProfilePicture} />}
            <SearchModal 
                isOpen={isSearchModalOpen} 
                onClose={() => setIsSearchModalOpen(false)} 
                searchTerm={searchTerm} 
                onSearchTermChange={setSearchTerm} 
                results={searchResults} 
                onResultClick={handleSearchResultClick} 
            />
            {csvImportState && <CsvImportModal state={csvImportState} existingTransactions={transacoes} contas={contas} addConta={handleAddConta} onClose={() => setCsvImportState(null)} onConfirm={handleFinalizeCsvImport} />}
            
            {modalState.modal === 'nova-transacao' && (
                <NovaTransacaoModal
                    isOpen={true}
                    onClose={closeModal}
                    onSave={handleAddTransacao}
                    onSaveTransferencia={handleAddTransferencia}
                    contas={contas}
                    categorias={categorias}
                />
            )}
             {modalState.modal === 'editar-transacao' && (
                <EditarTransacaoModal
                    isOpen={true}
                    onClose={closeModal}
                    onSave={handleUpdateTransacao}
                    transacaoToEdit={modalState.data?.transacao}
                    contas={contas}
                    categorias={categorias}
                />
            )}
             {modalState.modal === 'editar-transferencia' && (
                <EditarTransferenciaModal
                    isOpen={true}
                    onClose={closeModal}
                    onSave={handleUpdateTransferencia}
                    transferenciaToEdit={modalState.data?.transferencia}
                />
            )}
            {modalState.modal === 'nova-compra-cartao' && (
                <NovaCompraCartaoModal
                    isOpen={true}
                    onClose={closeModal}
                    onSave={handleAddCompraCartao}
                    cartoes={cartoes}
                    categorias={categorias}
                    defaultCartaoId={modalState.data?.cartaoId}
                />
            )}
            {modalState.modal === 'editar-compra-cartao' && (
                <EditarCompraCartaoModal
                    isOpen={true}
                    onClose={closeModal}
                    onSave={handleUpdateCompraCartao}
                    compraToEdit={modalState.data?.compra}
                    cartoes={cartoes}
                    categorias={categorias}
                />
            )}
        </div>
    );
};

// --- CSV Import Modal Component (defined inside App.tsx for simplicity) ---
interface CsvImportModalProps {
    state: CsvImportState;
    existingTransactions: TransacaoBanco[];
    contas: ContaBancaria[];
    addConta: (conta: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }) => ContaBancaria | null;
    onClose: () => void;
    onConfirm: (transactions: CsvImportRow[], contaDestinoId: string) => void;
}
const CsvImportModal: React.FC<CsvImportModalProps> = ({ state, existingTransactions, contas, addConta, onClose, onConfirm }) => {
    const [rows, setRows] = useState<CsvImportRow[]>([]);
    const [contaDestino, setContaDestino] = useState<string>('');
    const [isCreatingNewConta, setIsCreatingNewConta] = useState(false);
    const [newContaName, setNewContaName] = useState('');

    useEffect(() => {
        if(state) {
            const existingTxSet = new Set(existingTransactions.map(t => `${t.data}|${t.valor.toFixed(2)}`));
            const updatedRows = state.transactions.map(row => ({
                ...row,
                isDuplicate: existingTxSet.has(`${row.data}|${Math.abs(row.valor).toFixed(2)}`),
            }));
            setRows(updatedRows);
        }
    }, [state, existingTransactions]);

    useEffect(() => {
        if(contas.length > 0 && !contaDestino) setContaDestino(contas[0].id);
        if(contas.length === 0) setIsCreatingNewConta(true);
    }, [contas, contaDestino]);

    const handleToggleRow = (index: number) => {
        setRows(prev => prev.map((row, i) => i === index ? { ...row, selected: !row.selected } : row));
    };

    const handleCreateNewConta = () => {
        if(!newContaName.trim()) return;
        const newConta = addConta({ nome: newContaName.trim(), saldo_inicial: 0, data_inicial: new Date().toISOString().split('T')[0], ativo: true, cor: '#6b7280' });
        if(newConta) {
            setContaDestino(newConta.id);
            setIsCreatingNewConta(false);
            setNewContaName('');
        }
    };

    const handleConfirm = () => {
        const selectedConta = isCreatingNewConta ? null : contaDestino;
        if(!selectedConta) return;
        onConfirm(rows, selectedConta);
    };

    if(!state) return null;
    const selectedCount = rows.filter(r => r.selected).length;
    const canConfirm = (isCreatingNewConta && newContaName) || (!isCreatingNewConta && contaDestino);

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={`Importar de ${state.fileName}`}
            footer={(
                <>
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!canConfirm} className="bg-gradient-to-r from-[#19CF67] to-[#00DE5F] hover:from-[#16B359] hover:to-[#00C454] text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 dark:disabled:bg-gray-500">Importar ({selectedCount})</button>
                </>
            )}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta de Destino</label>
                    {isCreatingNewConta ? (
                        <div className="flex space-x-2">
                           <input type="text" value={newContaName} onChange={e => setNewContaName(e.target.value)} placeholder="Nome da nova conta" className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white" />
                           <button onClick={handleCreateNewConta} className="bg-blue-500 text-white px-3 rounded">Criar</button>
                           {contas.length > 0 && <button onClick={() => setIsCreatingNewConta(false)} className="text-gray-500 text-sm">Cancelar</button>}
                        </div>
                    ) : (
                        <div className="flex space-x-2">
                            <select value={contaDestino} onChange={e => setContaDestino(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white">
                                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                            <button onClick={() => setIsCreatingNewConta(true)} className="text-blue-500 text-sm whitespace-nowrap">Nova Conta</button>
                        </div>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-900/50"><tr><th className="p-2 w-8"></th><th className="p-2 text-left">Data</th><th className="p-2 text-left">Descrição</th><th className="p-2 text-right">Valor</th></tr></thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i} className={`border-t border-gray-200 dark:border-gray-700 ${row.isDuplicate ? 'bg-yellow-100 dark:bg-yellow-900/40 text-gray-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                    <td className="p-2 text-center"><input type="checkbox" checked={row.selected} onChange={() => handleToggleRow(i)} className="h-4 w-4 rounded" /></td>
                                    <td className="p-2">{formatDate(row.data)}</td>
                                    <td className="p-2 truncate" title={row.descricao}>{row.descricao}</td>
                                    <td className={`p-2 text-right font-mono ${row.valor >= 0 ? 'bg-gradient-to-r from-[#19CF67] to-[#00DE5F] text-transparent bg-clip-text' : 'text-red-500'}`}>{formatCurrency(row.valor)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                    <span className="inline-block w-3 h-3 rounded-sm bg-yellow-100 dark:bg-yellow-900/40 mr-1"></span>
                    Transações possivelmente duplicadas estão destacadas. Desmarque para não importar.
                </div>
            </div>
        </Modal>
    );
};


export default App;