import { supabase } from '@/lib/supabaseClient';

export type CategoryBudget = { categoria_id: string; competencia: string; valor: number };

const LOCAL_PREFIX = 'cat_budgets:'; // localStorage key por competência

function readLocal(month: string): CategoryBudget[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_PREFIX + month);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(month: string, rows: CategoryBudget[]) {
  try { window.localStorage.setItem(LOCAL_PREFIX + month, JSON.stringify(rows)); } catch {}
}

export const categoryBudgetsService = {
  // Busca todos os orçamentos para uma competência (YYYY-MM)
  async getForMonth(month: string): Promise<CategoryBudget[]> {
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session?.user) {
      const { data, error } = await supabase
        .from('categoria_orcamentos')
        .select('categoria_id, competencia, valor')
        .eq('competencia', month);
      if (error) {
        // fallback local se tabela não existir
        return readLocal(month);
      }
      return (data || []) as CategoryBudget[];
    }
    return readLocal(month);
  },

  // Upsert em lote para uma competência
  async upsertMany(month: string, items: { categoria_id: string; valor: number }[]) {
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session?.user) {
      try {
        const payload = items.map(i => ({ ...i, competencia: month }));
        const { error } = await supabase.from('categoria_orcamentos').upsert(payload, { onConflict: 'categoria_id,competencia' });
        if (!error) return;
      } catch {}
      // Fallback local se a tabela não existir ou qualquer erro ocorrer
    }
    const current = readLocal(month);
    const map = new Map(current.map(r => [r.categoria_id, r]));
    items.forEach(i => map.set(i.categoria_id, { categoria_id: i.categoria_id, competencia: month, valor: i.valor }));
    writeLocal(month, Array.from(map.values()));
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
    if (auth.session?.user) {
      try {
        const { error } = await supabase.from('categoria_orcamentos').upsert(rows, { onConflict: 'categoria_id,competencia' });
        if (!error) return;
      } catch {}
      // Fallback local se erro
    }
    for (const r of rows) {
      const current = readLocal(r.competencia);
      const map = new Map(current.map(x => [x.categoria_id, x]));
      map.set(r.categoria_id, r);
      writeLocal(r.competencia, Array.from(map.values()));
    }
  }
};


