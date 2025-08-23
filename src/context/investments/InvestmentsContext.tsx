import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ObjetivoInvestimento, Ativo, Alocacao, TransacaoBanco, Categoria } from '@/types/types';
import { investmentsService } from '@/services/investmentsService';

interface InvestmentsContextType {
  objetivos: ObjetivoInvestimento[];
  ativos: Ativo[];
  alocacoes: Alocacao[];
  addObjetivo: (obj: Omit<ObjetivoInvestimento, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ObjetivoInvestimento | null>;
  updateObjetivo: (obj: ObjetivoInvestimento) => Promise<ObjetivoInvestimento | null>;
  deleteObjetivo: (id: string) => void;
  addAtivo: (ativoData: Omit<Ativo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Ativo | null>;
  updateAtivo: (ativo: Ativo) => Promise<Ativo | null>;
  deleteAtivo: (ativoId: string) => void;
  setAlocacoesParaAtivo: (ativoId: string, novasAlocacoes: Omit<Alocacao, 'id' | 'ativo_id'>[]) => void;
  addInvestmentTransaction: (txData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria) => TransacaoBanco | null;
  validateObjetivoDeletion: (objetivoId: string) => boolean;
  bulkReplaceObjetivos: (objetivos: ObjetivoInvestimento[]) => void;
  bulkReplaceAtivos: (ativos: Ativo[]) => void;
  bulkReplaceAlocacoes: (alocacoes: Alocacao[]) => void;
}

const InvestmentsContext = createContext<InvestmentsContextType | undefined>(undefined);

interface InvestmentsProviderProps {
  children: ReactNode;
}

export const InvestmentsProvider: React.FC<InvestmentsProviderProps> = ({ children }) => {
  const [objetivos, setObjetivos] = useState<ObjetivoInvestimento[]>([]);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);

  // Load data from Supabase on mount
  useEffect(() => {
    (async () => {
      const loadedObjetivos = await investmentsService.getAllObjetivos();
      setObjetivos(loadedObjetivos);
    })();

    (async () => {
      const loadedAtivos = await investmentsService.getAllAtivos();
      setAtivos(loadedAtivos);
    })();

    const loadedAlocacoes = investmentsService.getAllAlocacoes();
    setAlocacoes(loadedAlocacoes);
  }, []);

  // Persistência passa a ser feita diretamente no serviço (Supabase)

  // Persistência agora é feita diretamente no serviço (Supabase)

  useEffect(() => {
    if (alocacoes.length >= 0) {
      investmentsService.saveAlocacoes(alocacoes);
    }
  }, [alocacoes]);

  const addObjetivo = async (obj: Omit<ObjetivoInvestimento, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newObj = await investmentsService.createObjetivo(obj);
    if (newObj) setObjetivos(prev => [...prev, newObj]);
    return newObj;
  };

  const updateObjetivo = async (obj: ObjetivoInvestimento) => {
    const updatedObj = await investmentsService.updateObjetivo(obj);
    if (updatedObj) setObjetivos(prev => prev.map(o => o.id === obj.id ? updatedObj : o));
    return updatedObj;
  };

  const deleteObjetivo = (id: string) => {
    setObjetivos(prev => prev.filter(o => o.id !== id));
    setAlocacoes(prev => prev.filter(a => a.objetivo_id !== id));
  };

  const addAtivo = async (ativoData: Omit<Ativo, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAtivo = await investmentsService.createAtivo(ativoData);
    if (newAtivo) setAtivos(prev => [...prev, newAtivo]);
    return newAtivo;
  };

  const updateAtivo = async (ativo: Ativo) => {
    const updatedAtivo = await investmentsService.updateAtivo(ativo);
    if (updatedAtivo) setAtivos(prev => prev.map(a => a.id === ativo.id ? updatedAtivo : a));
    return updatedAtivo;
  };

  const deleteAtivo = (ativoId: string) => {
    setAtivos(prev => prev.filter(a => a.id !== ativoId));
    setAlocacoes(prev => prev.filter(a => a.ativo_id !== ativoId));
  };

  const setAlocacoesParaAtivo = (ativoId: string, novasAlocacoes: Omit<Alocacao, 'id' | 'ativo_id'>[]) => {
    const newAlocacoes = investmentsService.setAlocacoesParaAtivo(ativoId, novasAlocacoes, alocacoes);
    setAlocacoes(newAlocacoes);
  };

  const addInvestmentTransaction = (txData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria): TransacaoBanco | null => {
    try {
      const newTx = investmentsService.createInvestmentTransaction(txData, categoria);
      return newTx;
    } catch (error) {
      console.error('Error creating investment transaction:', error);
      return null;
    }
  };

  const validateObjetivoDeletion = (objetivoId: string): boolean => {
    return investmentsService.validateObjetivoDeletion(objetivoId, alocacoes);
  };

  const bulkReplaceObjetivos = (newObjetivos: ObjetivoInvestimento[]) => {
    setObjetivos(newObjetivos);
  };

  const bulkReplaceAtivos = (newAtivos: Ativo[]) => {
    setAtivos(newAtivos);
  };

  const bulkReplaceAlocacoes = (newAlocacoes: Alocacao[]) => {
    setAlocacoes(newAlocacoes);
  };

  return (
    <InvestmentsContext.Provider value={{
      objetivos,
      ativos,
      alocacoes,
      addObjetivo,
      updateObjetivo,
      deleteObjetivo,
      addAtivo,
      updateAtivo,
      deleteAtivo,
      setAlocacoesParaAtivo,
      addInvestmentTransaction,
      validateObjetivoDeletion,
      bulkReplaceObjetivos,
      bulkReplaceAtivos,
      bulkReplaceAlocacoes
    }}>
      {children}
    </InvestmentsContext.Provider>
  );
};

export const useInvestmentsContext = () => {
  const context = useContext(InvestmentsContext);
  if (context === undefined) {
    throw new Error('useInvestmentsContext must be used within an InvestmentsProvider');
  }
  return context;
};