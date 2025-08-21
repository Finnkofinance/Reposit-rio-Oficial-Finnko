import { ContaBancaria, TransacaoBanco, TipoCategoria } from '@/types/types';
import { supabase } from '@/lib/supabaseClient';

export const accountsService = {
  // Busca contas. Se logado, lê do Supabase; senão, localStorage (demo)
  getAll: async (): Promise<ContaBancaria[]> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { data, error } = await supabase
          .from('contas_bancarias')
          .select('id, nome, saldo_inicial, data_inicial, ativo, cor, created_at, updated_at')
          .order('nome', { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as ContaBancaria[];
      }
      const item = window.localStorage.getItem('contas');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading accounts:', error);
      return [];
    }
  },

  save: async (contas: ContaBancaria[]): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const payload = contas.map(c => ({
          id: c.id,
          nome: c.nome,
          saldo_inicial: c.saldo_inicial,
          data_inicial: c.data_inicial,
          ativo: c.ativo,
          cor: c.cor ?? null,
        }));
        const { error } = await supabase.from('contas_bancarias').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        return;
      }
      window.localStorage.setItem('contas', JSON.stringify(contas));
    } catch (error) {
      console.error('Error saving accounts:', error);
    }
  },

  create: (contaData: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }): ContaBancaria => {
    // Mantém API síncrona: gera ID local e delega persistência ao save() disparado pelo contexto
    return {
      ...contaData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as ContaBancaria;
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
    // Mantém API síncrona; persistência ocorrerá via save() do contexto
    return { ...conta, updatedAt: new Date().toISOString() } as unknown as ContaBancaria;
  },

  validateDeletion: (conta: ContaBancaria, cartoes: any[]): string | null => {
    const cartaoUsandoConta = cartoes.find(cartao => cartao.conta_id_padrao === conta.id);
    if (cartaoUsandoConta) {
      return `Não é possível excluir. A conta é padrão para o cartão "${cartaoUsandoConta.apelido}".`;
    }
    return null;
  }
};