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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { compra: newCompra, parcelas: newParcelas };
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newParcelas.push(newParcela);
    }

    return { compras: newCompras, parcelas: newParcelas };
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
  }
};