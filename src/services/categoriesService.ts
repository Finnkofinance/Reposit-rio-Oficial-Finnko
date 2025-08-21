import { Categoria } from '@/types/types';
import { CATEGORIAS_PADRAO } from '@/constants.tsx';
import { supabase } from '@/lib/supabaseClient';

export const categoriesService = {
  // Busca categorias. Se houver sessão, lê do Supabase; caso contrário, usa localStorage (modo demo)
  getAll: async (): Promise<Categoria[]> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const user = auth.session?.user || null;
      if (user) {
        const { data, error } = await supabase
          .from('categorias')
          .select('id, nome, tipo, sistema, orcamento_mensal, created_at, updated_at, ordem')
          .order('tipo', { ascending: true })
          .order('ordem', { ascending: true, nullsFirst: true })
          .order('nome', { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as Categoria[];
      }
      // DEMO/local
      const item = window.localStorage.getItem('categorias');
      const stored: Categoria[] = item ? JSON.parse(item) : [];
      const byId = new Map<string, Categoria>(stored.map(c => [c.id, c]));
      let changed = false;
      for (const cat of CATEGORIAS_PADRAO) {
        if (!byId.has(cat.id)) { byId.set(cat.id, { ...cat }); changed = true; }
      }
      const merged = Array.from(byId.values());
      if (changed || !item) window.localStorage.setItem('categorias', JSON.stringify(merged));
      return merged.length > 0 ? merged : CATEGORIAS_PADRAO;
    } catch (error) {
      console.error('categoriesService.getAll error:', error);
      return CATEGORIAS_PADRAO;
    }
  },

  save: async (categorias: Categoria[]): Promise<void> => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session?.user) {
        // upsert em lote
        const payload = categorias.map(c => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          sistema: !!c.sistema,
          orcamento_mensal: c.orcamento_mensal ?? null,
          ordem: (c as any)?.ordem ?? null,
        }));
        const { error } = await supabase.from('categorias').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        return;
      }
      // DEMO/local
      window.localStorage.setItem('categorias', JSON.stringify(categorias));
    } catch (error) {
      console.error('categoriesService.save error:', error);
    }
  },

  create: async (cat: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>): Promise<Categoria> => {
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session?.user) {
      const payload = { nome: cat.nome, tipo: cat.tipo, orcamento_mensal: cat.orcamento_mensal ?? null, sistema: false };
      const { data, error } = await supabase.from('categorias').insert(payload).select('id, nome, tipo, sistema, orcamento_mensal, created_at, updated_at, ordem').single();
      if (error) throw error;
      return data as unknown as Categoria;
    }
    // DEMO/local
    return { ...cat, id: crypto.randomUUID(), sistema: false, createdAt: new Date().toISOString() } as unknown as Categoria;
  },

  update: async (cat: Categoria): Promise<Categoria> => {
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session?.user) {
      const payload = { nome: cat.nome, tipo: cat.tipo, orcamento_mensal: cat.orcamento_mensal ?? null, sistema: !!cat.sistema, ordem: (cat as any).ordem ?? null };
      const { data, error } = await supabase.from('categorias').update(payload).eq('id', cat.id).select('id, nome, tipo, sistema, orcamento_mensal, created_at, updated_at, ordem').single();
      if (error) throw error;
      return data as unknown as Categoria;
    }
    return { ...cat, updatedAt: new Date().toISOString() } as unknown as Categoria;
  },

  validateDeletion: (categoryId: string, transacoes: any[], compras: any[]): boolean => {
    return transacoes.some(t => t.categoria_id === categoryId) || compras.some(c => c.categoria_id === categoryId);
  },

  importCategorias: (importedCategorias: Categoria[]): Categoria[] => {
    const systemCategories = CATEGORIAS_PADRAO.filter(c => c.sistema);
    const userCategories = importedCategorias.filter((c: Categoria) => !c.sistema);
    return [...systemCategories, ...userCategories];
  }
};