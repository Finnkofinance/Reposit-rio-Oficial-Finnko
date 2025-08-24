import { TransacaoBanco, Categoria, TipoCategoria } from '@/types/types';
import { supabase } from '@/lib/supabaseClient';

export const transactionsService = {
  // Busca transações (logado → Supabase; senão, localStorage)
  getAll: async (): Promise<TransacaoBanco[]> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { data, error } = await supabase
          .from('transacoes_banco')
          .select(`
            id, conta_id, data, valor, categoria_id, tipo, descricao,
            transferencia_par_id, previsto, realizado,
            cartao_id, competencia_fatura, meta_pagamento, meta_saldo_inicial,
            recorrencia, recorrencia_id, objetivo_id,
            created_at, updated_at
          `)
          .order('data', { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as TransacaoBanco[];
      }
      const item = window.localStorage.getItem('transacoes');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading transactions:', error);
      return [];
    }
  },

  save: async (transacoes: TransacaoBanco[]): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const payload = transacoes.map(t => ({
          id: t.id,
          conta_id: t.conta_id,
          data: t.data,
          valor: t.valor,
          categoria_id: t.categoria_id,
          tipo: t.tipo,
          descricao: t.descricao,
          transferencia_par_id: t.transferencia_par_id ?? null,
          previsto: !!t.previsto,
          realizado: !!t.realizado,
          cartao_id: t.cartao_id ?? null,
          competencia_fatura: t.competencia_fatura ?? null,
          meta_pagamento: !!t.meta_pagamento,
          meta_saldo_inicial: !!t.meta_saldo_inicial,
          recorrencia: t.recorrencia ?? null,
          recorrencia_id: t.recorrencia_id ?? null,
          objetivo_id: t.objetivo_id ?? null,
        }));
        const { error } = await supabase.from('transacoes_banco').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        return;
      }
      window.localStorage.setItem('transacoes', JSON.stringify(transacoes));
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  },

  create: (transacaoData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria): TransacaoBanco => {
    return {
      ...transacaoData,
      id: crypto.randomUUID(),
      tipo: categoria.tipo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  createRecurring: (transacaoData: Omit<TransacaoBanco, 'id' | 'createdAt' | 'updatedAt' | 'tipo'>, categoria: Categoria): TransacaoBanco[] => {
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

    return newTransactions;
  },

  createTransfer: (data: { origem_id: string; destino_id: string; valor: number; data: string; descricao: string; }, contas: any[]): TransacaoBanco[] => {
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
      data: date,
      valor,
      categoria_id: transferenciaCategoriaId,
      tipo: TipoCategoria.Transferencia,
      descricao: `Transf. p/ ${contaDestino}: ${descricao}`,
      previsto: false,
      realizado: true,
      transferencia_par_id: creditId,
      createdAt: new Date().toISOString(),
    };

    const creditTx: TransacaoBanco = {
      id: creditId,
      conta_id: destino_id,
      data: date,
      valor,
      categoria_id: transferenciaCategoriaId,
      tipo: TipoCategoria.Transferencia,
      descricao: `Transf. de ${contaOrigem}: ${descricao}`,
      previsto: false,
      realizado: true,
      transferencia_par_id: debitId,
      createdAt: new Date().toISOString(),
    };

    return [debitTx, creditTx];
  },

  update: (tx: TransacaoBanco, categoria: Categoria): TransacaoBanco => {
    return {
      ...tx,
      tipo: categoria.tipo,
      updatedAt: new Date().toISOString()
    };
  },

  updateTransfer: (data: { originalTxId: string; valor: number; data: string; descricao: string; }, transacoes: TransacaoBanco[], contas: any[]): TransacaoBanco[] => {
    const { originalTxId, valor, data: date, descricao } = data;
    const tx1 = transacoes.find(t => t.id === originalTxId);
    if (!tx1 || !tx1.transferencia_par_id) return transacoes;
    
    const tx2 = transacoes.find(t => t.id === tx1.transferencia_par_id);
    if (!tx2) return transacoes;
    
    const [debitTx, creditTx] = tx1.id < tx2.id ? [tx1, tx2] : [tx2, tx1];

    const contaOrigem = contas.find(c => c.id === debitTx.conta_id)?.nome;
    const contaDestino = contas.find(c => c.id === creditTx.conta_id)?.nome;

    const updatedDebitTx = {
      ...debitTx,
      valor,
      data: date,
      descricao: `Transf. p/ ${contaDestino}: ${descricao}`,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedCreditTx = {
      ...creditTx,
      valor,
      data: date,
      descricao: `Transf. de ${contaOrigem}: ${descricao}`,
      updatedAt: new Date().toISOString(),
    };
    
    return transacoes.map(t => {
      if(t.id === updatedDebitTx.id) return updatedDebitTx;
      if(t.id === updatedCreditTx.id) return updatedCreditTx;
      return t;
    });
  },

  createPayment: (cartaoId: string, contaId: string, valor: number, data: string, competencia: string, cartaoNome: string): TransacaoBanco => {
    return {
      id: crypto.randomUUID(),
      conta_id: contaId,
      data,
      valor,
      categoria_id: 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e72', // Pagamento de Cartão
      tipo: TipoCategoria.Saida,
      descricao: `Pagamento Fatura ${cartaoNome}`,
      previsto: false,
      realizado: true,
      meta_pagamento: true,
      cartao_id: cartaoId,
      competencia_fatura: competencia,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  // Deleção: por IDs (logado → Supabase; local → context cuida)
  removeByIds: async (ids: string[]): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        if (!ids || ids.length === 0) return;
        const { error } = await supabase.from('transacoes_banco').delete().in('id', ids);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting transactions:', error);
    }
  },

  // Deleção: por conta (para cascade manual)
  removeByAccount: async (contaId: string): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { error } = await supabase.from('transacoes_banco').delete().eq('conta_id', contaId);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting transactions by account:', error);
    }
  }
};