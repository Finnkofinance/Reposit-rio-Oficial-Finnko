import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ContaBancaria, TransacaoBanco, TipoCategoria, Categoria, CompraCartao, ParcelaCartao, Cartao } from '../types';
import { formatCurrency, formatDate, formatDateShort, calculateSaldo, splitInstallments } from '../utils/format';
import { AlertTriangle, X, Trash2, Pencil, Plus, FlaskConical } from 'lucide-react';
import DatePeriodSelector from '../components/DatePeriodSelector';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';

interface FluxoCaixaPageProps {
  contas: ContaBancaria[];
  transacoes: TransacaoBanco[];
  categorias: Categoria[];
  compras: CompraCartao[];
  parcelas: ParcelaCartao[];
  cartoes: Cartao[];
  selectedMonth: string;
  onMonthChange: (string: any) => void;
}

interface DayData {
  data: string;
  entradas: number;
  saidas: number;
  investimentos: number;
  transactions: TransacaoBanco[];
  saldoDiario: number;
}

const Tooltip: React.FC<{ content: { x: number, y: number, dayData: DayData } }> = ({ content }) => {
    const { x, y, dayData } = content;
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${x + 15}px`,
        top: `${y + 15}px`,
        transform: 'translateY(-100%)',
        pointerEvents: 'none',
        zIndex: 20,
    };

    return (
        <div style={style} className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl text-xs w-64">
            <p className="font-bold mb-1 text-gray-900 dark:text-white">{formatDate(dayData.data)}</p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
                {dayData.transactions.map((t) => (
                    <li key={t.id} className="flex justify-between space-x-2">
                        <span className="truncate flex-1 text-gray-700 dark:text-gray-300">{t.descricao}</span>
                        <span className={`font-mono font-semibold ${
                            t.tipo === TipoCategoria.Entrada ? 'text-green-500' :
                            t.tipo === TipoCategoria.Saida || t.tipo === TipoCategoria.Investimento ? 'text-red-500' :
                            'text-yellow-500'
                        }`}>
                            {formatCurrency(t.valor)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface ManageDaySimulationModalProps {
    date: string;
    type: TipoCategoria;
    transactions: TransacaoBanco[];
    onClose: () => void;
    onAdd: (txs: TransacaoBanco[]) => void;
    onUpdate: (tx: TransacaoBanco) => void;
    onDelete: (txId: string) => void;
}

const ManageDaySimulationModal: React.FC<ManageDaySimulationModalProps> = ({ date, type, transactions, onClose, onAdd, onUpdate, onDelete }) => {
    const [editingTx, setEditingTx] = useState<TransacaoBanco | null>(null);
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('');
    const [launchType, setLaunchType] = useState<'unico' | 'parcelado' | 'recorrente'>('unico');
    const [numInstallments, setNumInstallments] = useState('12');

    useEffect(() => {
        if (editingTx) {
            setDescricao(editingTx.descricao);
            setValor(String(editingTx.valor * 100));
            setLaunchType('unico'); // Editing is always a single transaction for now
        } else {
            setDescricao('');
            setValor('');
        }
    }, [editingTx]);

    const handleSave = () => {
        const valorNum = parseFloat(valor) / 100 || 0;
        if (!descricao.trim() || valorNum <= 0) return;

        if (editingTx) {
            onUpdate({ ...editingTx, descricao: descricao.trim(), valor: valorNum });
        } else {
            const txs: TransacaoBanco[] = [];
            const baseDate = new Date(`${date}T12:00:00Z`);
            const baseDesc = descricao.trim();

            if (launchType === 'unico') {
                txs.push({
                    id: `sim-${crypto.randomUUID()}`,
                    conta_id: 'simulated_account', data: date, valor: valorNum,
                    categoria_id: 'simulated_category', tipo: type, descricao: baseDesc,
                    previsto: true, realizado: false, recorrencia: null
                });
            } else if (launchType === 'parcelado') {
                const installmentsCount = parseInt(numInstallments, 10) || 1;
                const installmentValues = splitInstallments(valorNum, installmentsCount);
                for (let i = 0; i < installmentsCount; i++) {
                    const nextDate = new Date(baseDate);
                    nextDate.setUTCMonth(baseDate.getUTCMonth() + i);
                    txs.push({
                        id: `sim-${crypto.randomUUID()}`,
                        conta_id: 'simulated_account',
                        data: nextDate.toISOString().split('T')[0],
                        valor: installmentValues[i],
                        categoria_id: 'simulated_category',
                        tipo: type,
                        descricao: `${baseDesc} (${i + 1}/${installmentsCount})`,
                        previsto: true, realizado: false, recorrencia: null
                    });
                }
            } else if (launchType === 'recorrente') {
                const recurrenceCount = parseInt(numInstallments, 10) || 1;
                for (let i = 0; i < recurrenceCount; i++) {
                    const nextDate = new Date(baseDate);
                    nextDate.setUTCMonth(baseDate.getUTCMonth() + i);
                    txs.push({
                        id: `sim-${crypto.randomUUID()}`,
                        conta_id: 'simulated_account',
                        data: nextDate.toISOString().split('T')[0],
                        valor: valorNum,
                        categoria_id: 'simulated_category',
                        tipo: type,
                        descricao: baseDesc,
                        previsto: true, realizado: false, recorrencia: null
                    });
                }
            }
            onAdd(txs);
        }
        setEditingTx(null);
        startNew();
    };

    const startNew = () => {
        setEditingTx(null);
        setDescricao('');
        setValor('');
        setLaunchType('unico');
    }

    const title = type === TipoCategoria.Entrada ? 'Entradas' : type === TipoCategoria.Saida ? 'Saídas' : 'Investimentos';

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={`Simular ${title} em ${formatDate(date)}`}
            footer={
                <>
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Fechar</button>
                    {(editingTx !== null || (descricao && valor)) && 
                        <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">{editingTx ? 'Salvar Alteração' : 'Adicionar Simulação'}</button>
                    }
                </>
            }
        >
            <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{editingTx ? 'Editar Simulação' : 'Nova Simulação'}</h4>
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Descrição"
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-white"
                        />
                        <CurrencyInput
                            value={valor}
                            onValueChange={setValor}
                            placeholder={launchType === 'parcelado' ? 'Valor Total' : 'Valor'}
                            className="w-full bg-white dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-white"
                        />

                         {!editingTx && (
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Lançamento</label>
                                    <div className="flex space-x-1 bg-gray-200 dark:bg-gray-900/50 p-1 rounded-lg">
                                        <button type="button" onClick={() => setLaunchType('unico')} className={`flex-1 text-center p-1.5 rounded-md text-xs font-semibold transition-colors ${launchType === 'unico' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Único</button>
                                        <button type="button" onClick={() => setLaunchType('parcelado')} className={`flex-1 text-center p-1.5 rounded-md text-xs font-semibold transition-colors ${launchType === 'parcelado' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Parcelado</button>
                                        <button type="button" onClick={() => setLaunchType('recorrente')} className={`flex-1 text-center p-1.5 rounded-md text-xs font-semibold transition-colors ${launchType === 'recorrente' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Recorrente</button>
                                    </div>
                                </div>
                                {launchType !== 'unico' && (
                                    <div className="animate-fade-in">
                                        <label htmlFor="num-installments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {launchType === 'parcelado' ? 'Número de Parcelas' : 'Número de Meses'}
                                        </label>
                                        <input
                                            type="number"
                                            id="num-installments"
                                            value={numInstallments}
                                            onChange={e => setNumInstallments(e.target.value)}
                                            min="2"
                                            className="w-full bg-white dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                         {editingTx && <button onClick={startNew} className="text-xs text-blue-500">Adicionar outra</button>}
                    </div>
                </div>
                {transactions.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Simulações Adicionadas</h4>
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {transactions.map(tx => (
                                <li key={tx.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                                    <span className="text-sm">{tx.descricao}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-mono">{formatCurrency(tx.valor)}</span>
                                        <button onClick={() => setEditingTx(tx)} className="text-gray-500 hover:text-blue-500"><Pencil size={14} /></button>
                                        <button onClick={() => onDelete(tx.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const FluxoCaixaPage: React.FC<FluxoCaixaPageProps> = ({ contas, transacoes, categorias, compras, parcelas, cartoes, selectedMonth, onMonthChange }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTransactions, setSimulationTransactions] = useState<TransacaoBanco[]>([]);
  const [manageSimModalState, setManageSimModalState] = useState<{ date: string; type: TipoCategoria } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, dayData: DayData } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  const exitSimulation = () => {
    setIsSimulating(false);
    setSimulationTransactions([]);
    setManageSimModalState(null);
  };

  const handleStartSimulation = () => {
    setIsSimulating(true);
  };
  
  useEffect(() => {
    return () => {
      exitSimulation();
    };
  }, []);

  const { fluxoData, minSaldo, maxSaldo, totais } = useMemo(() => {
    const allBankTransactions = [...transacoes, ...simulationTransactions];
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${selectedMonth}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDate = `${selectedMonth}-${String(lastDayOfMonth).padStart(2,'0')}`;

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const previousDay = new Date(firstDayOfMonth);
    previousDay.setDate(firstDayOfMonth.getDate() - 1);
    const previousDayStr = previousDay.toISOString().split('T')[0];
    
    const contasAtivas = contas.filter(c => c.ativo);
    const contasAtivasIds = new Set(contasAtivas.map(c => c.id));

    // Calculate projected bank balance up to the previous day
    const saldoBaseProjetado = contasAtivas.reduce((total, conta) => {
        return total + calculateSaldo(conta.id, transacoes, previousDayStr, true); // includePrevisto = true
    }, 0);

    // Calculate balance from simulated transactions up to the start of the current month
    const simulatedBalanceBeforeMonth = simulationTransactions
      .filter(t => t.data < startDate)
      .reduce((sum, t) => {
        if (t.tipo === TipoCategoria.Entrada) return sum + t.valor;
        if (t.tipo === TipoCategoria.Saida || t.tipo === TipoCategoria.Investimento) return sum - t.valor;
        return sum;
      }, 0);
    
    // Calculate unpaid credit card bills from previous months
    const faturasAnteriores = parcelas
        .filter(p => p.competencia_fatura < selectedMonth)
        .reduce((acc, p) => {
            const compra = compras.find(c => c.id === p.compra_id);
            if (!compra) return acc;
            const key = `${compra.cartao_id}|${p.competencia_fatura}`;
            acc[key] = (acc[key] || 0) + p.valor_parcela;
            return acc;
        }, {} as Record<string, number>);

    const pagamentosAnteriores = transacoes
        .filter(t => t.meta_pagamento && t.competencia_fatura && t.competencia_fatura < selectedMonth)
        .reduce((acc, t) => {
            const key = `${t.cartao_id}|${t.competencia_fatura}`;
            acc[key] = (acc[key] || 0) + t.valor;
            return acc;
        }, {} as Record<string, number>);
    
    let totalFaturasAtrasadasNaoPagas = 0;
    for (const key in faturasAnteriores) {
        const totalFatura = faturasAnteriores[key];
        const totalPago = pagamentosAnteriores[key] || 0;
        const restante = totalFatura - totalPago;
        if (restante > 0.01) {
            totalFaturasAtrasadasNaoPagas += restante;
        }
    }
    
    const saldoInicialPeriodo = saldoBaseProjetado + simulatedBalanceBeforeMonth - totalFaturasAtrasadasNaoPagas;

    const dailyAggregates: Record<string, { entradas: number; saidas: number; investimentos: number; transactions: TransacaoBanco[] }> = {};
    
    const allTransactionsInFuture = [...transacoes, ...simulationTransactions];

    const allRelevantTransactions = allTransactionsInFuture.filter(t => 
        (contasAtivasIds.has(t.conta_id) || t.conta_id === 'simulated_account')
    );

    allRelevantTransactions.forEach(t => {
      if (!dailyAggregates[t.data]) {
        dailyAggregates[t.data] = { entradas: 0, saidas: 0, investimentos: 0, transactions: [] };
      }

      const isInternalTransfer = t.tipo === TipoCategoria.Transferencia &&
                                 t.transferencia_par_id &&
                                 contasAtivasIds.has(t.conta_id) && 
                                 allTransactionsInFuture.some(p => p.id === t.transferencia_par_id && contasAtivasIds.has(p.conta_id));

      if (isInternalTransfer) {
        dailyAggregates[t.data].transactions.push(t);
        return;
      }
      
      if (t.tipo === TipoCategoria.Entrada) dailyAggregates[t.data].entradas += t.valor;
      else if (t.tipo === TipoCategoria.Saida || t.meta_pagamento) dailyAggregates[t.data].saidas += t.valor;
      else if (t.tipo === TipoCategoria.Investimento) dailyAggregates[t.data].investimentos += t.valor;
      else if (t.tipo === TipoCategoria.Transferencia) {
        if (t.meta_saldo_inicial) { } 
        else {
            const pair = allTransactionsInFuture.find(p => p.id === t.transferencia_par_id);
            if (pair && t.id < pair.id) dailyAggregates[t.data].saidas += t.valor; 
            else dailyAggregates[t.data].entradas += t.valor;
        }
      }
  
      dailyAggregates[t.data].transactions.push(t);
    });
      
    cartoes.forEach(cartao => {
        const [currentYear, currentMonthNum] = selectedMonth.split('-').map(Number);
        const lastDayOfMonth = new Date(currentYear, currentMonthNum, 0).getDate();

        const parcelasDaFatura = parcelas.filter(p => {
            const compra = compras.find(c => c.id === p.compra_id);
            return compra && compra.cartao_id === cartao.id && p.competencia_fatura === selectedMonth;
        });
        
        const totalFatura = parcelasDaFatura.reduce((sum, p) => sum + p.valor_parcela, 0);
        if (totalFatura <= 0) return;

        const pagamentosDaFatura = transacoes.filter(t => 
            t.meta_pagamento && t.realizado && t.cartao_id === cartao.id && t.competencia_fatura === selectedMonth
        );
        const totalPago = pagamentosDaFatura.reduce((sum, p) => sum + p.valor, 0);
        const valorPendente = totalFatura - totalPago;

        if (valorPendente > 0.01) {
            const diaVencimentoNum = cartao.dia_vencimento;
            const diaVencimento = String(Math.min(diaVencimentoNum, lastDayOfMonth)).padStart(2, '0');
            const dataVencimento = `${selectedMonth}-${diaVencimento}`;
            
            if (!dailyAggregates[dataVencimento]) {
                dailyAggregates[dataVencimento] = { entradas: 0, saidas: 0, investimentos: 0, transactions: [] };
            }
            dailyAggregates[dataVencimento].saidas += valorPendente;
            dailyAggregates[dataVencimento].transactions.push({
                id: `cc-${cartao.id}-${selectedMonth}`,
                conta_id: 'credit_card_projection', data: dataVencimento, valor: valorPendente,
                categoria_id: 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e72', tipo: TipoCategoria.Saida,
                descricao: `Fatura ${cartao.apelido}`, previsto: true, realizado: false,
            } as TransacaoBanco);
        }
    });
  
    const result: DayData[] = [];
    let saldoAcumulado = saldoInicialPeriodo;

    const futureMonths = 24;
    const finalDate = new Date(year, month - 1 + futureMonths, 0);

    let currentDate = new Date(`${startDate}T12:00:00Z`);

    while (currentDate <= finalDate) {
        const dayStr = currentDate.toISOString().split('T')[0];
        const daily = dailyAggregates[dayStr] || { entradas: 0, saidas: 0, investimentos: 0, transactions: [] };
        daily.transactions.sort((a,b) => a.descricao.localeCompare(b.descricao));
        
        const initialBalanceForToday = allTransactionsInFuture
            .filter(t => t.data === dayStr && t.meta_saldo_inicial && contasAtivasIds.has(t.conta_id))
            .reduce((sum, t) => sum + t.valor, 0);
      
        saldoAcumulado += initialBalanceForToday + daily.entradas - daily.saidas - daily.investimentos;
        
        if (dayStr.startsWith(selectedMonth)) {
            result.push({ data: dayStr, ...daily, saldoDiario: saldoAcumulado });
        }
        
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    const saldos = result.map(d => d.saldoDiario);
    const min = Math.min(0, ...saldos);
    const max = Math.max(0, ...saldos);
    
    const totais = result.reduce((acc, day) => ({
        entradas: acc.entradas + day.entradas,
        saidas: acc.saidas + day.saidas,
        investimentos: acc.investimentos + day.investimentos,
    }), { entradas: 0, saidas: 0, investimentos: 0 });

    return { fluxoData: result, minSaldo: min, maxSaldo: max, totais };
  }, [contas, transacoes, selectedMonth, simulationTransactions, cartoes, compras, parcelas]);

  const getSaldoCellStyle = (saldo: number): React.CSSProperties => {
    if (maxSaldo === minSaldo || saldo === 0) return { backgroundColor: 'transparent' };
    
    let normalizedValue = 0;
    if (saldo > 0) {
        normalizedValue = maxSaldo > 0 ? saldo / maxSaldo : 1;
    } else { 
        normalizedValue = minSaldo < 0 ? saldo / minSaldo : 1; 
    }
    
    const opacity = Math.min(0.8, 0.1 + Math.pow(Math.abs(normalizedValue), 0.7) * 0.7);

    if (saldo > 0) {
        return { backgroundColor: `rgba(34, 197, 94, ${opacity})` };
    } else if (saldo < 0) {
        return { backgroundColor: `rgba(239, 68, 68, ${opacity})` };
    }
    return { backgroundColor: 'transparent' };
  };

  const handleCellClick = (date: string, type: TipoCategoria) => {
    if (isSimulating) {
        setManageSimModalState({ date, type });
    }
  };
  
  const handleAddSimulations = (txs: TransacaoBanco[]) => {
      setSimulationTransactions(prev => [...prev, ...txs]);
  };

  const handleUpdateSimulation = (updatedTx: TransacaoBanco) => {
      setSimulationTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  };
  
  const handleDeleteSimulation = (txId: string) => {
      setSimulationTransactions(prev => {
        const updated = prev.filter(t => t.id !== txId);
        // Do not close modal automatically when a transaction is deleted.
        // User might want to delete more or edit.
        // if (updated.length === 0 && manageSimModalState) {
        //     setManageSimModalState(null);
        // }
        return updated;
      });
  };

  const handleMouseMove = (e: React.MouseEvent, dayData: DayData) => {
    if (dayData.transactions.length === 0) {
      setTooltip(null);
      return;
    }
    if(tableContainerRef.current) {
        const rect = tableContainerRef.current.getBoundingClientRect();
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, dayData });
    }
  };

  return (
    <div className="animate-fade-in flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
        <DatePeriodSelector 
            title="Fluxo de Caixa"
            selectedMonth={selectedMonth} 
            onMonthChange={onMonthChange} 
        />
        <button 
            onClick={isSimulating ? exitSimulation : handleStartSimulation}
            className={`mb-4 md:mb-0 font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors ${
                isSimulating 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
            {isSimulating ? <X size={18} /> : <FlaskConical size={18} />}
            <span>{isSimulating ? 'Sair da Simulação' : 'Simular Cenários'}</span>
        </button>
      </div>

      <div 
        ref={tableContainerRef} 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-auto flex-grow relative transition-all duration-300 ${
            isSimulating ? 'border-2 border-blue-500 shadow-blue-500/20 shadow-lg' : 'border dark:border-transparent'
        }`}
      >
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
            <tr>
              <th className="py-1.5 px-0.5 font-semibold text-xs text-gray-600 dark:text-gray-300 w-auto">Data</th>
              <th className="py-1.5 px-0.5 font-semibold text-xs text-gray-600 dark:text-gray-300 text-right">Entradas</th>
              <th className="py-1.5 px-0.5 font-semibold text-xs text-gray-600 dark:text-gray-300 text-right">Saídas</th>
              <th className="py-1.5 px-0.5 font-semibold text-xs text-gray-600 dark:text-gray-300 text-right">Invest.</th>
              <th className="py-1.5 px-0.5 font-semibold text-xs text-gray-600 dark:text-gray-300 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody onMouseLeave={() => setTooltip(null)}>
            {fluxoData.map((dia) => (
              <tr 
                key={dia.data} 
                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                onMouseMove={(e) => handleMouseMove(e, dia)}
              >
                <td className="py-1.5 px-0.5 text-xs text-gray-800 dark:text-gray-200 font-mono">{formatDateShort(dia.data)}</td>
                <td 
                    className={`py-1.5 px-0.5 text-xs text-right rounded-md ${dia.entradas > 0 ? 'text-green-600 dark:text-green-500 bg-green-500/10' : 'text-gray-500 dark:text-gray-400'} ${isSimulating ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50' : ''}`}
                    onClick={() => handleCellClick(dia.data, TipoCategoria.Entrada)}
                >{formatCurrency(dia.entradas)}</td>
                <td 
                    className={`py-1.5 px-0.5 text-xs text-right rounded-md ${dia.saidas > 0 ? 'text-red-600 dark:text-red-500 bg-red-500/10' : 'text-gray-500 dark:text-gray-400'} ${isSimulating ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50' : ''}`}
                    onClick={() => handleCellClick(dia.data, TipoCategoria.Saida)}
                >{formatCurrency(dia.saidas)}</td>
                 <td 
                    className={`py-1.5 px-0.5 text-xs text-right rounded-md ${dia.investimentos > 0 ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10' : 'text-gray-500 dark:text-gray-400'} ${isSimulating ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50' : ''}`}
                    onClick={() => handleCellClick(dia.data, TipoCategoria.Investimento)}
                >{formatCurrency(dia.investimentos)}</td>
                <td className="py-1.5 px-0.5 text-xs font-bold text-right text-gray-900 dark:text-white" style={getSaldoCellStyle(dia.saldoDiario)}>
                    {formatCurrency(dia.saldoDiario)}
                </td>
              </tr>
            ))}
            {fluxoData.length === 0 && (
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td colSpan={5} className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Nenhum dado para o período selecionado.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-700/50 sticky bottom-0">
             <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                <th className="py-1.5 px-0.5 font-semibold text-xs text-gray-600 dark:text-gray-300">Totais</th>
                <td className="py-1.5 px-0.5 text-xs text-right font-bold text-green-600 dark:text-green-500">{formatCurrency(totais.entradas)}</td>
                <td className="py-1.5 px-0.5 text-xs text-right font-bold text-red-600 dark:text-red-500">{formatCurrency(totais.saidas)}</td>
                <td className="py-1.5 px-0.5 text-xs text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totais.investimentos)}</td>
                <td className="py-1.5 px-0.5"></td>
             </tr>
          </tfoot>
        </table>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
       {manageSimModalState && (
            <ManageDaySimulationModal 
                date={manageSimModalState.date}
                type={manageSimModalState.type}
                transactions={simulationTransactions.filter(t => t.data === manageSimModalState.date && t.tipo === manageSimModalState.type)}
                onClose={() => setManageSimModalState(null)}
                onAdd={handleAddSimulations}
                onUpdate={handleUpdateSimulation}
                onDelete={handleDeleteSimulation}
            />
       )}
    </div>
  );
};

export default FluxoCaixaPage;