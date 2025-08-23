import { supabase } from '@/lib/supabaseClient';

export type CategoryBudget = { categoria_id: string; competencia: string; valor: number };

export const categoryBudgetsService = {
  // Busca todos os orçamentos para uma competência (YYYY-MM)
  async getForMonth(month: string): Promise<CategoryBudget[]> {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return [];
    const { data, error } = await supabase
      .from('categoria_orcamentos')
      .select('categoria_id, competencia, valor')
      .eq('competencia', month)
      .eq('user_id', auth.session.user.id);
    if (error) throw error;
    return (data || []) as CategoryBudget[];
  },

  // Upsert em lote para uma competência
  async upsertMany(month: string, items: { categoria_id: string; valor: number }[]) {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return;
    const userId = auth.session.user.id;
    const payload = items.map(i => ({ ...i, competencia: month, user_id: userId }));
    // Tenta upsert por (user_id, categoria_id, competencia)
    let { error } = await supabase.from('categoria_orcamentos').upsert(payload, { onConflict: 'user_id,categoria_id,competencia' });
    if (error && (error as any).code === '42P10') {
      // Fallback: emula upsert manualmente (delete + insert)
      const ids = items.map(i => i.categoria_id);
      await supabase.from('categoria_orcamentos')
        .delete()
        .in('categoria_id', ids)
        .eq('competencia', month)
        .eq('user_id', userId);
      const ins = await supabase.from('categoria_orcamentos').insert(payload);
      if (ins.error) throw ins.error;
      return;
    }
    if (error) throw error;
  },

  // Repete o orçamento atual para N meses seguintes (inclusive mês seguinte)
  async repeatForNextMonths(startMonth: string, months: number, items: { categoria_id: string; valor: number }[]) {
    const [yearStr, monthStr] = startMonth.split('-').map(s => parseInt(s, 10));
    const rows: { categoria_id: string; competencia: string; valor: number }[] = [];
    for (let i = 1; i <= months; i++) {
      const date = new Date(Date.UTC(yearStr, (monthStr - 1) + i, 1));
      const comp = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      for (const it of items) rows.push({ categoria_id: it.categoria_id, competencia: comp, valor: it.valor });
    }
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return;
    const userId = auth.session.user.id;
    const rowsWithUser = rows.map(r => ({ ...r, user_id: userId }));
    let { error } = await supabase.from('categoria_orcamentos').upsert(rowsWithUser, { onConflict: 'user_id,categoria_id,competencia' });
    if (error && (error as any).code === '42P10') {
      // Fallback manual
      const comps = Array.from(new Set(rows.map(r => r.competencia)));
      const ids = Array.from(new Set(rows.map(r => r.categoria_id)));
      await supabase.from('categoria_orcamentos')
        .delete()
        .in('competencia', comps)
        .in('categoria_id', ids)
        .eq('user_id', userId);
      const ins = await supabase.from('categoria_orcamentos').insert(rowsWithUser);
      if (ins.error) throw ins.error;
      return;
    }
    if (error) throw error;
  }
};


