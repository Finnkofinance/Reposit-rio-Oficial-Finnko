import { Cartao, CompraCartao, ParcelaCartao } from '@/types/types';
import { computeFirstCompetency, addMonths, splitInstallments } from '@/utils/format';
import { supabase } from '@/lib/supabaseClient';

export const cardsService = {
  // Busca cartões. Se logado, lê do Supabase; senão, localStorage (demo)
  getAll: async (): Promise<Cartao[]> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { data, error } = await supabase
          .from('cartoes')
          .select('id, apelido, dia_fechamento, dia_vencimento, limite, bandeira, cor, conta_id_padrao, created_at, updated_at')
          .order('apelido', { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as Cartao[];
      }
      const item = window.localStorage.getItem('cartoes');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading cards:', error);
      return [];
    }
  },

  // Salva cartões. Se logado, upsert no Supabase; senão, localStorage
  save: async (cartoes: Cartao[]): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const payload = cartoes.map(c => ({
          id: c.id,
          apelido: c.apelido,
          dia_fechamento: c.dia_fechamento,
          dia_vencimento: c.dia_vencimento,
          limite: c.limite,
          bandeira: c.bandeira,
          cor: c.cor,
          conta_id_padrao: c.conta_id_padrao ?? null,
        }));
        const { error } = await supabase.from('cartoes').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        return;
      }
      window.localStorage.setItem('cartoes', JSON.stringify(cartoes));
    } catch (error) {
      console.error('Error saving cards:', error);
    }
  },

  // Exclui um cartão no banco se logado (com cascade nas dependências)
  deleteOne: async (id: string): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { error } = await supabase.from('cartoes').delete().eq('id', id);
        if (error) throw error;
      }
      // Local é tratado pelo contexto
    } catch (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  },

  create: (cartaoData: Omit<Cartao, 'id' | 'createdAt' | 'updatedAt'>): Cartao => {
    return {
      ...cartaoData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  update: (cartao: Cartao): Cartao => {
    return {
      ...cartao,
      updatedAt: new Date().toISOString()
    };
  },

  createPurchase: (compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'> & { parcelas: number }, cartao: Cartao): { compra: CompraCartao; parcelas: ParcelaCartao[] } => {
    const { parcelas: numParcelas, ...rest } = compraData;

    const newCompra: CompraCartao = {
      ...rest,
      id: crypto.randomUUID(),
      parcelas_total: numParcelas,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const valoresParcelas = splitInstallments(newCompra.valor_total, numParcelas);
    const { year, month } = computeFirstCompetency(new Date(`${newCompra.data_compra}T12:00:00Z`), cartao.dia_fechamento);
    const newParcelas: ParcelaCartao[] = [];

    for (let i = 0; i < numParcelas; i++) {
      const { year: compYear, month: compMonth } = addMonths(year, month, i);
      newParcelas.push({
        id: crypto.randomUUID(),
        compra_id: newCompra.id,
        n_parcela: i + 1,
        valor_parcela: valoresParcelas[i],
        competencia_fatura: `${compYear}-${String(compMonth + 1).padStart(2, '0')}`,
        paga: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { compra: newCompra, parcelas: newParcelas };
  },

  // Persistente: cria compra + parcelas no Supabase e retorna objetos criados
  createPurchasePersist: async (
    compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'> & { parcelas: number },
    cartao: Cartao
  ): Promise<{ compra: CompraCartao; parcelas: ParcelaCartao[] }> => {
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user?.id;
    if (!userId) throw new Error('Usuário não autenticado');

    // Insere compra principal
    const { data: insertCompra, error: compraErr } = await supabase
      .from('compras_cartao')
      .insert([
        {
          user_id: userId,
          cartao_id: compraData.cartao_id,
          data_compra: compraData.data_compra,
          valor_total: compraData.valor_total,
          parcelas_total: compraData.parcelas,
          categoria_id: compraData.categoria_id,
          descricao: compraData.descricao,
          estorno: compraData.estorno ?? false,
          recorrencia: compraData.recorrencia ?? null,
        },
      ])
      .select('id, cartao_id, data_compra, valor_total, parcelas_total, categoria_id, descricao, estorno, recorrencia, recorrencia_id, created_at, updated_at')
      .single();
    if (compraErr) throw compraErr;

    const compraId = insertCompra.id as string;

    // Calcula parcelas
    const valoresParcelas = splitInstallments(insertCompra.valor_total as number, insertCompra.parcelas_total as number);
    const { year, month } = computeFirstCompetency(new Date(`${insertCompra.data_compra as string}T12:00:00Z`), cartao.dia_fechamento);
    const parcelasRows = valoresParcelas.map((valor, idx) => {
      const { year: compYear, month: compMonth } = addMonths(year, month, idx);
      return {
        user_id: userId,
        compra_id: compraId,
        n_parcela: idx + 1,
        valor_parcela: valor,
        competencia_fatura: `${compYear}-${String(compMonth + 1).padStart(2, '0')}`,
        paga: false,
      };
    });

    const { data: insertParcelas, error: parcelasErr } = await supabase
      .from('parcelas_cartao')
      .insert(parcelasRows)
      .select('id, compra_id, n_parcela, valor_parcela, competencia_fatura, paga');
    if (parcelasErr) throw parcelasErr;

    const compra: CompraCartao = {
      id: insertCompra.id as string,
      cartao_id: insertCompra.cartao_id as string,
      data_compra: insertCompra.data_compra as string,
      valor_total: insertCompra.valor_total as number,
      parcelas_total: insertCompra.parcelas_total as number,
      categoria_id: insertCompra.categoria_id as string,
      descricao: insertCompra.descricao as string,
      estorno: (insertCompra.estorno as boolean) ?? false,
      recorrencia: (insertCompra.recorrencia as any) ?? null,
      recorrencia_id: (insertCompra.recorrencia_id as string) ?? null,
      createdAt: insertCompra.created_at as string,
      updatedAt: insertCompra.updated_at as string,
    };
    const parcelas: ParcelaCartao[] = (insertParcelas || []).map(p => ({
      id: p.id as string,
      compra_id: p.compra_id as string,
      n_parcela: p.n_parcela as number,
      valor_parcela: p.valor_parcela as number,
      competencia_fatura: p.competencia_fatura as string,
      paga: (p.paga as boolean) ?? false,
    }));

    return { compra, parcelas };
  },

  createRecurringPurchase: (compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'>, cartao: Cartao): { compras: CompraCartao[]; parcelas: ParcelaCartao[] } => {
    const recorrencia_id = crypto.randomUUID();
    const newCompras: CompraCartao[] = [];
    const newParcelas: ParcelaCartao[] = [];
    const baseDate = new Date(`${compraData.data_compra}T12:00:00Z`);
    const futureOccurrences = compraData.recorrencia === 'anual' ? 5 : 24;

    for (let i = 0; i < futureOccurrences; i++) {
      const nextDate = new Date(baseDate);
      if (compraData.recorrencia === 'mensal') {
        nextDate.setUTCMonth(nextDate.getUTCMonth() + i);
      } else if (compraData.recorrencia === 'anual') {
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + i);
      }

      const newCompra: CompraCartao = {
        ...compraData,
        id: crypto.randomUUID(),
        data_compra: nextDate.toISOString().split('T')[0],
        parcelas_total: 1, // Recurring purchases are single installment
        recorrencia_id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newCompras.push(newCompra);
      
      const { year, month } = computeFirstCompetency(nextDate, cartao.dia_fechamento);
      const newParcela: ParcelaCartao = {
        id: crypto.randomUUID(),
        compra_id: newCompra.id,
        n_parcela: 1,
        valor_parcela: newCompra.valor_total,
        competencia_fatura: `${year}-${String(month + 1).padStart(2, '0')}`,
        paga: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newParcelas.push(newParcela);
    }

    return { compras: newCompras, parcelas: newParcelas };
  },

  // Persistente: cria recorrências (1x por mês/ano) com 1 parcela cada
  createRecurringPurchasePersist: async (
    compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'>,
    cartao: Cartao
  ): Promise<{ compras: CompraCartao[]; parcelas: ParcelaCartao[] }> => {
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user?.id;
    if (!userId) throw new Error('Usuário não autenticado');

    const recorrencia_id = crypto.randomUUID();
    const baseDate = new Date(`${compraData.data_compra}T12:00:00Z`);
    const futureOccurrences = compraData.recorrencia === 'anual' ? 5 : 24;

    const comprasInserir: any[] = [];
    const parcelasInserir: any[] = [];

    for (let i = 0; i < futureOccurrences; i++) {
      const nextDate = new Date(baseDate);
      if (compraData.recorrencia === 'mensal') nextDate.setUTCMonth(nextDate.getUTCMonth() + i);
      else if (compraData.recorrencia === 'anual') nextDate.setUTCFullYear(nextDate.getUTCFullYear() + i);

      comprasInserir.push({
        user_id: userId,
        cartao_id: compraData.cartao_id,
        data_compra: nextDate.toISOString().split('T')[0],
        valor_total: compraData.valor_total,
        parcelas_total: 1,
        categoria_id: compraData.categoria_id,
        descricao: compraData.descricao,
        estorno: compraData.estorno ?? false,
        recorrencia: compraData.recorrencia ?? null,
        recorrencia_id,
      });
    }

    const { data: comprasIns, error: errCompras } = await supabase
      .from('compras_cartao')
      .insert(comprasInserir)
      .select('id, cartao_id, data_compra, valor_total, parcelas_total, categoria_id, descricao, estorno, recorrencia, recorrencia_id, created_at, updated_at');
    if (errCompras) throw errCompras;

    for (const c of comprasIns || []) {
      const date = new Date(`${c.data_compra as string}T12:00:00Z`);
      const { year, month } = computeFirstCompetency(date, cartao.dia_fechamento);
      parcelasInserir.push({
        user_id: userId,
        compra_id: c.id,
        n_parcela: 1,
        valor_parcela: c.valor_total,
        competencia_fatura: `${year}-${String(month + 1).padStart(2, '0')}`,
        paga: false,
      });
    }

    const { data: parcIns, error: errParc } = await supabase
      .from('parcelas_cartao')
      .insert(parcelasInserir)
      .select('id, compra_id, n_parcela, valor_parcela, competencia_fatura, paga');
    if (errParc) throw errParc;

    const compras: CompraCartao[] = (comprasIns || []).map(c => ({
      id: c.id as string,
      cartao_id: c.cartao_id as string,
      data_compra: c.data_compra as string,
      valor_total: c.valor_total as number,
      parcelas_total: c.parcelas_total as number,
      categoria_id: c.categoria_id as string,
      descricao: c.descricao as string,
      estorno: (c.estorno as boolean) ?? false,
      recorrencia: (c.recorrencia as any) ?? null,
      recorrencia_id: (c.recorrencia_id as string) ?? null,
      createdAt: c.created_at as string,
      updatedAt: c.updated_at as string,
    }));
    const parcelas: ParcelaCartao[] = (parcIns || []).map(p => ({
      id: p.id as string,
      compra_id: p.compra_id as string,
      n_parcela: p.n_parcela as number,
      valor_parcela: p.valor_parcela as number,
      competencia_fatura: p.competencia_fatura as string,
      paga: (p.paga as boolean) ?? false,
    }));

    return { compras, parcelas };
  },

  updatePurchase: (compra: CompraCartao & { parcelas: number }, cartao: Cartao, existingParcelas: ParcelaCartao[]): { updatedCompra: CompraCartao; newParcelas: ParcelaCartao[] } => {
    // Remove old installments
    const parcelasToKeep = existingParcelas.filter(p => p.compra_id !== compra.id);

    // Recalculate new ones
    const valoresParcelas = splitInstallments(compra.valor_total, compra.parcelas);
    const { year, month } = computeFirstCompetency(new Date(`${compra.data_compra}T12:00:00Z`), cartao.dia_fechamento);
    const newParcelas: ParcelaCartao[] = [];
    
    for (let i = 0; i < compra.parcelas; i++) {
      const { year: compYear, month: compMonth } = addMonths(year, month, i);
      newParcelas.push({
        id: crypto.randomUUID(),
        compra_id: compra.id,
        n_parcela: i + 1,
        valor_parcela: valoresParcelas[i],
        competencia_fatura: `${compYear}-${String(compMonth + 1).padStart(2, '0')}`,
        paga: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const updatedCompra: CompraCartao = {
      ...compra,
      parcelas_total: compra.parcelas,
      updatedAt: new Date().toISOString()
    };

    return { updatedCompra, newParcelas };
  },

  // Persistente: atualiza compra e recria parcelas
  updatePurchasePersist: async (
    compra: CompraCartao & { parcelas: number },
    cartao: Cartao
  ): Promise<{ updatedCompra: CompraCartao; newParcelas: ParcelaCartao[] }> => {
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user?.id;
    if (!userId) throw new Error('Usuário não autenticado');

    const { error: upErr } = await supabase
      .from('compras_cartao')
      .update({
        cartao_id: compra.cartao_id,
        data_compra: compra.data_compra,
        valor_total: compra.valor_total,
        parcelas_total: compra.parcelas,
        categoria_id: compra.categoria_id,
        descricao: compra.descricao,
        estorno: compra.estorno ?? false,
      })
      .eq('id', compra.id);
    if (upErr) throw upErr;

    // remove parcelas antigas e recria
    const { error: delParcErr } = await supabase.from('parcelas_cartao').delete().eq('compra_id', compra.id);
    if (delParcErr) throw delParcErr;

    const valoresParcelas = splitInstallments(compra.valor_total, compra.parcelas);
    const { year, month } = computeFirstCompetency(new Date(`${compra.data_compra}T12:00:00Z`), cartao.dia_fechamento);
    const parcelasRows = valoresParcelas.map((valor, idx) => {
      const { year: compYear, month: compMonth } = addMonths(year, month, idx);
      return {
        user_id: userId,
        compra_id: compra.id,
        n_parcela: idx + 1,
        valor_parcela: valor,
        competencia_fatura: `${compYear}-${String(compMonth + 1).padStart(2, '0')}`,
        paga: false,
      };
    });
    const { data: newParc, error: insParcErr } = await supabase
      .from('parcelas_cartao')
      .insert(parcelasRows)
      .select('id, compra_id, n_parcela, valor_parcela, competencia_fatura, paga');
    if (insParcErr) throw insParcErr;

    const updatedCompra: CompraCartao = {
      ...compra,
      parcelas_total: compra.parcelas,
      updatedAt: new Date().toISOString(),
    };
    const newParcelas: ParcelaCartao[] = (newParc || []).map(p => ({
      id: p.id as string,
      compra_id: p.compra_id as string,
      n_parcela: p.n_parcela as number,
      valor_parcela: p.valor_parcela as number,
      competencia_fatura: p.competencia_fatura as string,
      paga: (p.paga as boolean) ?? false,
    }));

    return { updatedCompra, newParcelas };
  },

  // Lista compras e parcelas do usuário
  getPurchases: async (): Promise<{ compras: CompraCartao[]; parcelas: ParcelaCartao[] }> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const [{ data: comprasData, error: cErr }, { data: parcelasData, error: pErr }] = await Promise.all([
          supabase
            .from('compras_cartao')
            .select('id, cartao_id, data_compra, valor_total, parcelas_total, categoria_id, descricao, estorno, recorrencia, recorrencia_id, created_at, updated_at')
            .order('data_compra', { ascending: false }),
          supabase
            .from('parcelas_cartao')
            .select('id, compra_id, n_parcela, valor_parcela, competencia_fatura, paga')
            .order('competencia_fatura', { ascending: true }),
        ]);
        if (cErr) throw cErr;
        if (pErr) throw pErr;
        const compras: CompraCartao[] = (comprasData || []).map(c => ({
          id: c.id as string,
          cartao_id: c.cartao_id as string,
          data_compra: c.data_compra as string,
          valor_total: c.valor_total as number,
          parcelas_total: c.parcelas_total as number,
          categoria_id: c.categoria_id as string,
          descricao: c.descricao as string,
          estorno: (c.estorno as boolean) ?? false,
          recorrencia: (c.recorrencia as any) ?? null,
          recorrencia_id: (c.recorrencia_id as string) ?? null,
          createdAt: c.created_at as string,
          updatedAt: c.updated_at as string,
        }));
        const parcelas: ParcelaCartao[] = (parcelasData || []).map(p => ({
          id: p.id as string,
          compra_id: p.compra_id as string,
          n_parcela: p.n_parcela as number,
          valor_parcela: p.valor_parcela as number,
          competencia_fatura: p.competencia_fatura as string,
          paga: (p.paga as boolean) ?? false,
        }));
        return { compras, parcelas };
      }

      // Se não logado, retorna arrays vazios
      return { compras: [], parcelas: [] };
    } catch (error) {
      console.error('Error getting purchases:', error);
      return { compras: [], parcelas: [] };
    }
  },

  // Exclui compra (cascata remove parcelas)
  deletePurchase: async (id: string): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { error } = await supabase.from('compras_cartao').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      throw error;
    }
  },

  // Marca parcela como paga no banco de dados
  markInstallmentAsPaid: async (parcelaId: string): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { error } = await supabase
          .from('parcelas_cartao')
          .update({ paga: true })
          .eq('id', parcelaId);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error marking installment as paid:', error);
      throw error;
    }
  },

  // Desmarca parcela como paga no banco de dados
  unmarkInstallmentAsPaid: async (parcelaId: string): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        const { error } = await supabase
          .from('parcelas_cartao')
          .update({ paga: false })
          .eq('id', parcelaId);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error unmarking installment as paid:', error);
      throw error;
    }
  },
};