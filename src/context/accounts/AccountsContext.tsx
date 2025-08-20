import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContaBancaria } from '@/types/types';
import { accountsService } from '@/services/accountsService';

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

  // Load accounts from localStorage on mount
  useEffect(() => {
    const loadedContas = accountsService.getAll();
    setContas(loadedContas);
  }, []);

  // Save to localStorage whenever contas change
  useEffect(() => {
    if (contas.length >= 0) { // Allow empty array to be saved
      accountsService.save(contas);
    }
  }, [contas]);

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