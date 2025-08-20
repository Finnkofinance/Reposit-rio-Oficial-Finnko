import { ObjetivoInvestimento, Ativo, Alocacao, TransacaoBanco, TipoCategoria, Categoria } from '@/types/types';

export const investmentsService = {
  // Objetivos
  getAllObjetivos: (): ObjetivoInvestimento[] => {
    try {
      const item = window.localStorage.getItem('objetivos');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading objetivos from localStorage:', error);
      return [];
    }
  },

  saveObjetivos: (objetivos: ObjetivoInvestimento[]): void => {
    try {
      window.localStorage.setItem('objetivos', JSON.stringify(objetivos));
    } catch (error) {
      console.error('Error saving objetivos to localStorage:', error);
    }
  },

  createObjetivo: (obj: Omit<ObjetivoInvestimento, 'id' | 'createdAt' | 'updatedAt'>): ObjetivoInvestimento => {
    return {
      ...obj,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
  },

  updateObjetivo: (obj: ObjetivoInvestimento): ObjetivoInvestimento => {
    return {
      ...obj,
      updatedAt: new Date().toISOString()
    };
  },

  // Ativos
  getAllAtivos: (): Ativo[] => {
    try {
      const item = window.localStorage.getItem('ativos');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading ativos from localStorage:', error);
      return [];
    }
  },

  saveAtivos: (ativos: Ativo[]): void => {
    try {
      window.localStorage.setItem('ativos', JSON.stringify(ativos));
    } catch (error) {
      console.error('Error saving ativos to localStorage:', error);
    }
  },

  createAtivo: (ativoData: Omit<Ativo, 'id' | 'createdAt' | 'updatedAt'>): Ativo => {
    return {
      ...ativoData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  updateAtivo: (ativo: Ativo): Ativo => {
    return {
      ...ativo,
      updatedAt: new Date().toISOString()
    };
  },

  // Alocações
  getAllAlocacoes: (): Alocacao[] => {
    try {
      const item = window.localStorage.getItem('alocacoes');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading alocacoes from localStorage:', error);
      return [];
    }
  },

  saveAlocacoes: (alocacoes: Alocacao[]): void => {
    try {
      window.localStorage.setItem('alocacoes', JSON.stringify(alocacoes));
    } catch (error) {
      console.error('Error saving alocacoes to localStorage:', error);
    }
  },

  setAlocacoesParaAtivo: (ativoId: string, novasAlocacoes: Omit<Alocacao, 'id' | 'ativo_id'>[], existingAlocacoes: Alocacao[]): Alocacao[] => {
    const otherAlocacoes = existingAlocacoes.filter(a => a.ativo_id !== ativoId);
    const newFullAlocacoes = novasAlocacoes.map(a => ({
      ...a,
      id: crypto.randomUUID(),
      ativo_id: ativoId,
    }));
    return [...otherAlocacoes, ...newFullAlocacoes];
  },

  // Investment Transactions
  createInvestmentTransaction: (txData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria): TransacaoBanco => {
    return {
      ...txData,
      id: crypto.randomUUID(),
      tipo: TipoCategoria.Investimento,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  validateObjetivoDeletion: (objetivoId: string, alocacoes: Alocacao[]): boolean => {
    return alocacoes.some(a => a.objetivo_id === objetivoId);
  }
};