import { ContaBancaria, TransacaoBanco, TipoCategoria } from '@/types/types';

export const accountsService = {
  getAll: (): ContaBancaria[] => {
    try {
      const item = window.localStorage.getItem('contas');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading accounts from localStorage:', error);
      return [];
    }
  },

  save: (contas: ContaBancaria[]): void => {
    try {
      window.localStorage.setItem('contas', JSON.stringify(contas));
    } catch (error) {
      console.error('Error saving accounts to localStorage:', error);
    }
  },

  create: (contaData: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }): ContaBancaria => {
    return {
      ...contaData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  createInitialBalanceTransaction: (conta: ContaBancaria): TransacaoBanco => {
    return {
      id: crypto.randomUUID(),
      conta_id: conta.id,
      data: conta.data_inicial,
      valor: conta.saldo_inicial,
      categoria_id: 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e71', // Saldo Inicial
      tipo: TipoCategoria.Transferencia,
      descricao: 'Saldo inicial da conta',
      previsto: false,
      realizado: true,
      meta_saldo_inicial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  update: (conta: Omit<ContaBancaria, 'saldo_inicial'>): ContaBancaria => {
    return {
      ...conta,
      updatedAt: new Date().toISOString(),
    } as ContaBancaria;
  },

  validateDeletion: (conta: ContaBancaria, cartoes: any[]): string | null => {
    const cartaoUsandoConta = cartoes.find(cartao => cartao.conta_id_padrao === conta.id);
    if (cartaoUsandoConta) {
      return `Não é possível excluir. A conta é padrão para o cartão "${cartaoUsandoConta.apelido}".`;
    }
    return null;
  }
};