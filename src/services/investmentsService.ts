import { ObjetivoInvestimento, Ativo, Alocacao, TransacaoBanco, TipoCategoria, Categoria, CategoriaAtivo } from '@/types/types';
import { supabase } from '@/lib/supabaseClient';

export const investmentsService = {
  // Objetivos
  getAllObjetivos: async (): Promise<ObjetivoInvestimento[]> => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return [];
    const { data, error } = await supabase
      .from('objetivos_investimento')
      .select('id, nome, valor_meta, data_meta, created_at, updated_at')
      .eq('user_id', auth.session.user.id)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('getAllObjetivos error:', error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      nome: r.nome,
      valor_meta: r.valor_meta,
      data_meta: r.data_meta,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  saveObjetivos: async (_objetivos: ObjetivoInvestimento[]): Promise<void> => { /* deprecated */ },

  createObjetivo: async (obj: Omit<ObjetivoInvestimento, 'id' | 'createdAt' | 'updatedAt'>): Promise<ObjetivoInvestimento | null> => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return null;
    const payload = { ...obj, user_id: auth.session.user.id } as any;
    const { data, error } = await supabase
      .from('objetivos_investimento')
      .insert(payload)
      .select('id, nome, valor_meta, data_meta, created_at, updated_at')
      .single();
    if (error) {
      console.error('createObjetivo error:', error);
      return null;
    }
    return {
      id: data.id,
      nome: data.nome,
      valor_meta: data.valor_meta,
      data_meta: data.data_meta,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  updateObjetivo: async (obj: ObjetivoInvestimento): Promise<ObjetivoInvestimento | null> => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return null;
    const { data, error } = await supabase
      .from('objetivos_investimento')
      .update({ nome: obj.nome, valor_meta: obj.valor_meta, data_meta: obj.data_meta })
      .eq('id', obj.id)
      .eq('user_id', auth.session.user.id)
      .select('id, nome, valor_meta, data_meta, created_at, updated_at')
      .single();
    if (error) {
      console.error('updateObjetivo error:', error);
      return null;
    }
    return {
      id: data.id,
      nome: data.nome,
      valor_meta: data.valor_meta,
      data_meta: data.data_meta,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  // Ativos (Supabase)
  getAllAtivos: async (): Promise<Ativo[]> => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return [];
    const { data, error } = await supabase
      .from('ativos')
      .select('id, nome, categoria, classe_ativo, quantidade, data_compra, valor_compra_unitario, valor_atual_unitario, observacao, created_at, updated_at')
      .eq('user_id', auth.session.user.id)
      .order('data_compra', { ascending: false });
    if (error) {
      console.error('getAllAtivos error:', error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      nome: r.nome,
      categoria: r.categoria as CategoriaAtivo,
      classe_ativo: r.classe_ativo,
      quantidade: Number(r.quantidade),
      data_compra: r.data_compra,
      valor_compra_unitario: Number(r.valor_compra_unitario),
      valor_atual_unitario: Number(r.valor_atual_unitario),
      observacao: r.observacao || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  saveAtivos: async (_ativos: Ativo[]): Promise<void> => { /* deprecated */ },

  createAtivo: async (ativoData: Omit<Ativo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ativo | null> => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return null;
    const payload = {
      ...ativoData,
      user_id: auth.session.user.id,
    } as any;
    const { data, error } = await supabase
      .from('ativos')
      .insert(payload)
      .select('id, nome, categoria, classe_ativo, quantidade, data_compra, valor_compra_unitario, valor_atual_unitario, observacao, created_at, updated_at')
      .single();
    if (error) {
      console.error('createAtivo error:', error);
      return null;
    }
    return {
      id: data.id,
      nome: data.nome,
      categoria: data.categoria as CategoriaAtivo,
      classe_ativo: data.classe_ativo,
      quantidade: Number(data.quantidade),
      data_compra: data.data_compra,
      valor_compra_unitario: Number(data.valor_compra_unitario),
      valor_atual_unitario: Number(data.valor_atual_unitario),
      observacao: data.observacao || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  updateAtivo: async (ativo: Ativo): Promise<Ativo | null> => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return null;
    const { data, error } = await supabase
      .from('ativos')
      .update({
        nome: ativo.nome,
        categoria: ativo.categoria,
        classe_ativo: ativo.classe_ativo,
        quantidade: ativo.quantidade,
        data_compra: ativo.data_compra,
        valor_compra_unitario: ativo.valor_compra_unitario,
        valor_atual_unitario: ativo.valor_atual_unitario,
        observacao: ativo.observacao ?? null,
      })
      .eq('id', ativo.id)
      .eq('user_id', auth.session.user.id)
      .select('id, nome, categoria, classe_ativo, quantidade, data_compra, valor_compra_unitario, valor_atual_unitario, observacao, created_at, updated_at')
      .single();
    if (error) {
      console.error('updateAtivo error:', error);
      return null;
    }
    return {
      id: data.id,
      nome: data.nome,
      categoria: data.categoria as CategoriaAtivo,
      classe_ativo: data.classe_ativo,
      quantidade: Number(data.quantidade),
      data_compra: data.data_compra,
      valor_compra_unitario: Number(data.valor_compra_unitario),
      valor_atual_unitario: Number(data.valor_atual_unitario),
      observacao: data.observacao || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
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