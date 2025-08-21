import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContaBancaria } from '@/types/types';
import { accountsService } from '@/services/accountsService';
import { useAuth } from '@/features/auth/AuthProvider';

interface AccountsContextType {
  contas: ContaBancaria[];
  addConta: (contaData: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }) => ContaBancaria | null;
  updateConta: (conta: Omit<ContaBancaria, 'saldo_inicial'>) => void;
  deleteConta: (id: string) => void;
  validateContaDeletion: (id: string, cartoes: any[]) => string | null;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

interface AccountsProviderProps {
  children: ReactNode;
}

export const AccountsProvider: React.FC<AccountsProviderProps> = ({ children }) => {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const { user, loading } = useAuth();

  // Load accounts from localStorage on mount
  useEffect(() => {
    if (loading) return;
    (async () => {
      const loadedContas = await accountsService.getAll();
      setContas(Array.isArray(loadedContas) ? loadedContas : []);
      setInitialLoaded(true);
    })();
  }, [loading, user?.id]);

  // Save to localStorage whenever contas change
  useEffect(() => {
    if (!initialLoaded) return;
    (async () => {
      await accountsService.save(contas);
    })();
  }, [contas, initialLoaded]);

  const addConta = (contaData: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }): ContaBancaria | null => {
    try {
      const newConta = accountsService.create(contaData);
      setContas(prev => [...prev, newConta]);
      return newConta;
    } catch (error) {
      console.error('Error adding account:', error);
      return null;
    }
  };

  const updateConta = (conta: Omit<ContaBancaria, 'saldo_inicial'>) => {
    const updatedConta = accountsService.update(conta);
    setContas(prev => prev.map(c => c.id === conta.id ? updatedConta : c));
  };

  const deleteConta = (id: string) => {
    setContas(prev => prev.filter(c => c.id !== id));
  };

  const validateContaDeletion = (id: string, cartoes: any[]): string | null => {
    const conta = contas.find(c => c.id === id);
    if (!conta) return null;
    return accountsService.validateDeletion(conta, cartoes);
  };

  return (
    <AccountsContext.Provider value={{
      contas,
      addConta,
      updateConta,
      deleteConta,
      validateContaDeletion
    }}>
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccountsContext = () => {
  const context = useContext(AccountsContext);
  if (context === undefined) {
    throw new Error('useAccountsContext must be used within an AccountsProvider');
  }
  return context;
};