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
        // Mapear campos snake_case para camelCase
        return (data || []).map(row => ({
          ...row,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as any)) as TransacaoBanco[];
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
          created_at: t.createdAt,
          updated_at: t.updatedAt,
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

  createTransfer: (data: { origem_id: string; destino_id: string; valor: number; data: string; descricao: string; }, contas: any[], categorias?: any[]): TransacaoBanco[] => {
    const { origem_id, destino_id, valor, data: date, descricao } = data;
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    const [debitId, creditId] = id1 < id2 ? [id1, id2] : [id2, id1];

    // Busca a categoria de transferência dinamicamente
    const transferenciaCategoriaId = categorias?.find(c => c.sistema && c.tipo === TipoCategoria.Transferencia && c.nome === 'Transferência')?.id || 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e70';
    
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

  createPayment: (cartaoId: string, contaId: string, valor: number, data: string, competencia: string, cartaoNome: string, categorias: Categoria[], parcelas: any[], compras: any[]): TransacaoBanco => {
    // Busca as parcelas da competência e suas categorias
    const parcelasDaCompetencia = parcelas.filter(p => {
      const compra = compras.find(c => c.id === p.compra_id);
      return compra && compra.cartao_id === cartaoId && p.competencia_fatura === competencia;
    });

    // Se há apenas uma categoria única entre todas as compras, usa ela
    const categoriasUnicas = [...new Set(
      parcelasDaCompetencia.map(p => {
        const compra = compras.find(c => c.id === p.compra_id);
        return compra?.categoria_id;
      }).filter(Boolean)
    )];

    let categoriaId: string;
    
    if (categoriasUnicas.length === 1) {
      // Se todas as compras são da mesma categoria, usa essa categoria
      categoriaId = categoriasUnicas[0]!;
    } else {
      // Se há múltiplas categorias ou nenhuma, usa categoria "Pagamento de Cartão"
      let pagamentoCategoria = categorias.find(c => c.sistema && c.nome === 'Pagamento de Cartão' && c.tipo === TipoCategoria.Saida);
      
      // Se não encontrou, usa qualquer categoria de saída
      if (!pagamentoCategoria) {
        pagamentoCategoria = categorias.find(c => c.tipo === TipoCategoria.Saida);
      }
      
      categoriaId = pagamentoCategoria?.id || 'default-saida-categoria';
    }

    // As parcelas já foram filtradas acima

    // Gera lista única de descrições das compras
    const descricoesCompras = [...new Set(
      parcelasDaCompetencia.map(p => {
        const compra = compras.find(c => c.id === p.compra_id);
        return compra?.descricao;
      }).filter(Boolean)
    )];

    // Monta descrição com as compras pagas
    const descricaoCompleta = descricoesCompras.length > 0 
      ? `Pagamento Fatura ${cartaoNome} - ${descricoesCompras.join(', ')}`
      : `Pagamento Fatura ${cartaoNome}`;

    return {
      id: crypto.randomUUID(),
      conta_id: contaId,
      data,
      valor,
      categoria_id: categoriaId,
      tipo: TipoCategoria.Saida,
      descricao: descricaoCompleta,
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
  },

  // Atualização individual de transação (versão simples)
  updateSingle: async (transacao: TransacaoBanco): Promise<void> => {
    // Esta função foi desabilitada para evitar conflitos com o save em lote
    // A persistência será feita através do useEffect automático
    return;
  },

  // Processar estorno de pagamento de fatura
  processarEstorno: async (dadosEstorno: {
    transacaoPagamentoId: string;
    cartaoId: string;
    contaId: string;
    valor: number;
    motivo: string;
    observacoes?: string;
    competencia: string;
    cartaoNome: string;
    categoriaId?: string;
  }): Promise<{ transacaoEstorno: TransacaoBanco; transacaoAtualizada: any }> => {
    console.log('🚀 processarEstorno chamado com:', dadosEstorno);
    
    try {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user?.id;
      console.log('🔐 Usuário autenticado:', userId ? 'Sim' : 'Não');
      if (!userId) throw new Error('Usuário não autenticado');

      // 1. Criar transação de estorno (entrada)
      const transacaoEstorno: TransacaoBanco = {
        id: crypto.randomUUID(),
        conta_id: dadosEstorno.contaId,
        data: new Date().toISOString().split('T')[0],
        valor: dadosEstorno.valor, // Valor positivo (entrada)
        categoria_id: dadosEstorno.categoriaId,
        tipo: TipoCategoria.Entrada,
        descricao: `[ESTORNO] Pagamento Fatura ${dadosEstorno.cartaoNome} - ${dadosEstorno.motivo}${dadosEstorno.observacoes ? ` (${dadosEstorno.observacoes})` : ''}`,
        previsto: false,
        realizado: true,
        meta_pagamento: false,
        cartao_id: dadosEstorno.cartaoId,
        competencia_fatura: dadosEstorno.competencia,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2. Inserir transação de estorno no banco
      console.log('💾 Criando transação de estorno:', {
        id: transacaoEstorno.id,
        conta_id: transacaoEstorno.conta_id,
        valor: transacaoEstorno.valor,
        categoria_id: transacaoEstorno.categoria_id,
        descricao: transacaoEstorno.descricao
      });
      
      const { data: estornoInsertData, error: estornoError } = await supabase
        .from('transacoes_banco')
        .insert([{
          id: transacaoEstorno.id,
          conta_id: transacaoEstorno.conta_id,
          data: transacaoEstorno.data,
          valor: transacaoEstorno.valor,
          categoria_id: transacaoEstorno.categoria_id,
          tipo: transacaoEstorno.tipo,
          descricao: transacaoEstorno.descricao,
          transferencia_par_id: null,
          previsto: transacaoEstorno.previsto,
          realizado: transacaoEstorno.realizado,
          cartao_id: transacaoEstorno.cartao_id,
          competencia_fatura: transacaoEstorno.competencia_fatura,
          meta_pagamento: transacaoEstorno.meta_pagamento,
          meta_saldo_inicial: false,
          recorrencia: null,
          recorrencia_id: null,
          objetivo_id: null,
          created_at: transacaoEstorno.createdAt,
          updated_at: transacaoEstorno.updatedAt
        }])
        .select();
        
      console.log('✅ Resultado insert estorno:', { data: estornoInsertData, error: estornoError });

      if (estornoError) throw estornoError;

      // 3. Atualizar transação original - por enquanto só updated_at até migração ser executada
      console.log('🔄 Atualizando transação original:', dadosEstorno.transacaoPagamentoId);
      
      const { data: updateData, error: updateError } = await supabase
        .from('transacoes_banco')
        .update({
          updated_at: new Date().toISOString(),
          // Campos de estorno serão adicionados após migração SQL
          // status_pagamento: 'estornado',
          // motivo_estorno: dadosEstorno.motivo,
          // data_estorno: new Date().toISOString(),
          // estornado_por: userId
        })
        .eq('id', dadosEstorno.transacaoPagamentoId)
        .select();
        
      console.log('✅ Resultado update original:', { data: updateData, error: updateError });

      if (updateError) throw updateError;

      const resultado = { transacaoEstorno, transacaoAtualizada: { id: dadosEstorno.transacaoPagamentoId } };
      console.log('🎉 Estorno processado com sucesso:', resultado);
      return resultado;

    } catch (error) {
      console.error('❌ Erro ao processar estorno:', error);
      throw new Error('Falha ao processar estorno: ' + (error as any)?.message || 'Erro desconhecido');
    }
  },

  // Cancelar pagamento (últimas 24h)
  cancelarPagamento: async (transacaoPagamentoId: string): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Atualizar - por enquanto só updated_at até migração ser executada
      const { error } = await supabase
        .from('transacoes_banco')
        .update({
          updated_at: new Date().toISOString()
          // Campos de cancelamento serão adicionados após migração SQL
          // status_pagamento: 'cancelado',
          // data_estorno: new Date().toISOString(),
          // estornado_por: userId
        })
        .eq('id', transacaoPagamentoId);

      if (error) throw error;

    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      throw new Error('Falha ao cancelar pagamento');
    }
  }
};