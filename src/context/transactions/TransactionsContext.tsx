import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TransacaoBanco, Categoria } from '@/types/types';
import { transactionsService } from '@/services/transactionsService';
import { useAuth } from '@/features/auth/AuthProvider';

interface TransactionsContextType {
  transacoes: TransacaoBanco[];
  addTransacao: (transacaoData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria) => void;
  addRecurringTransacao: (transacaoData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria) => void;
  addTransferencia: (data: { origem_id: string; destino_id: string; valor: number; data: string; descricao: string; }, contas: any[], categorias?: any[]) => void;
  updateTransacao: (tx: TransacaoBanco, categoria: Categoria) => void;
  updateTransferencia: (data: { originalTxId: string; valor: number; data: string; descricao: string; }, contas: any[]) => void;
  deleteTransacao: (id: string) => void;
  deleteTransacoes: (ids: string[]) => void;
  updateTransacoesCategoria: (ids: string[], newCategoryId: string, categoria: Categoria) => void;
  toggleTransactionRealizado: (id: string) => void;
  addPayment: (cartaoId: string, contaId: string, valor: number, data: string, competencia: string, cartaoNome: string, categorias: Categoria[], parcelas: any[], compras: any[]) => void;
  bulkAdd: (transactions: TransacaoBanco[]) => void;
  bulkReplace: (transactions: TransacaoBanco[]) => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

interface TransactionsProviderProps {
  children: ReactNode;
}

export const TransactionsProvider: React.FC<TransactionsProviderProps> = ({ children }) => {
  const [transacoes, setTransacoes] = useState<TransacaoBanco[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const { user, loading } = useAuth();

  // Load transactions (Supabase ou local) on mount
  useEffect(() => {
    if (loading) return;
    (async () => {
      const loadedTransacoes = await transactionsService.getAll();
      setTransacoes(Array.isArray(loadedTransacoes) ? loadedTransacoes : []);
      setInitialLoaded(true);
    })();
  }, [loading, user?.id]);

  // Save (Supabase ou local) whenever transacoes change
  useEffect(() => {
    if (!initialLoaded) return;
    (async () => {
      await transactionsService.save(transacoes);
    })();
  }, [transacoes, initialLoaded]);

  const addTransacao = (transacaoData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria) => {
    const newTransacao = transactionsService.create(transacaoData, categoria);
    setTransacoes(prev => [...prev, newTransacao]);
  };

  const addRecurringTransacao = (transacaoData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria) => {
    const newTransactions = transactionsService.createRecurring(transacaoData, categoria);
    setTransacoes(prev => [...prev, ...newTransactions]);
  };

  const addTransferencia = (data: { origem_id: string; destino_id: string; valor: number; data: string; descricao: string; }, contas: any[], categorias?: any[]) => {
    const transferTxs = transactionsService.createTransfer(data, contas, categorias);
    setTransacoes(prev => [...prev, ...transferTxs]);
  };

  const updateTransacao = (tx: TransacaoBanco, categoria: Categoria) => {
    const updatedTx = transactionsService.update(tx, categoria);
    setTransacoes(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  };

  const updateTransferencia = (data: { originalTxId: string; valor: number; data: string; descricao: string; }, contas: any[]) => {
    setTransacoes(prev => transactionsService.updateTransfer(data, prev, contas));
  };

  const deleteTransacao = (id: string) => {
    setTransacoes(prev => {
      const tx = prev.find(t => t.id === id);
      let idsToDelete = new Set<string>([id]);
      if (tx?.transferencia_par_id) idsToDelete.add(tx.transferencia_par_id);
      // Fire-and-forget persist deletion in Supabase when logado
      transactionsService.removeByIds(Array.from(idsToDelete)).catch(() => {});
      return prev.filter(t => !idsToDelete.has(t.id));
    });
  };

  const deleteTransacoes = (ids: string[]) => {
    setTransacoes(prev => {
      let idsToDelete = new Set<string>(ids);
      ids.forEach(id => {
        const tx = prev.find(t => t.id === id);
        if(tx?.transferencia_par_id) idsToDelete.add(tx.transferencia_par_id);
      });
      // Persist in Supabase
      transactionsService.removeByIds(Array.from(idsToDelete)).catch(() => {});
      return prev.filter(t => !idsToDelete.has(t.id));
    });
  };

  const updateTransacoesCategoria = (ids: string[], newCategoryId: string, categoria: Categoria) => {
    setTransacoes(prev => prev.map(t => 
      ids.includes(t.id) 
        ? {...t, categoria_id: newCategoryId, tipo: categoria.tipo, updatedAt: new Date().toISOString()} 
        : t
    ));
  };

  const toggleTransactionRealizado = (id: string) => {
    setTransacoes(prev => prev.map(t => 
      t.id === id ? { 
        ...t, 
        realizado: !t.realizado, 
        updatedAt: new Date().toISOString() 
      } : t
    ));
  };

  const addPayment = (cartaoId: string, contaId: string, valor: number, data: string, competencia: string, cartaoNome: string, categorias: Categoria[], parcelas: any[], compras: any[]) => {
    const payment = transactionsService.createPayment(cartaoId, contaId, valor, data, competencia, cartaoNome, categorias, parcelas, compras);
    setTransacoes(prev => [...prev, payment]);
  };

  const bulkAdd = (transactions: TransacaoBanco[]) => {
    setTransacoes(prev => [...prev, ...transactions]);
  };

  const bulkReplace = (transactions: TransacaoBanco[]) => {
    setTransacoes(transactions);
  };

  return (
    <TransactionsContext.Provider value={{
      transacoes,
      addTransacao,
      addRecurringTransacao,
      addTransferencia,
      updateTransacao,
      updateTransferencia,
      deleteTransacao,
      deleteTransacoes,
      updateTransacoesCategoria,
      toggleTransactionRealizado,
      addPayment,
      bulkAdd,
      bulkReplace
    }}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactionsContext = () => {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error('useTransactionsContext must be used within a TransactionsProvider');
  }
  return context;
};