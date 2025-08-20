

import { TransacaoBanco, TipoCategoria } from '@/types/types';

export const brMoney = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// Formata um número para o padrão de moeda BRL (R$ 1.234,56)
export const formatCurrency = (value: number): string => {
  return brMoney.format(value);
};

// Formata uma data no formato YYYY-MM-DD para DD/MM/YYYY
export const formatDate = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

// Formats a YYYY-MM-DD string to DD/MM/AA
export const formatDateShort = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year.slice(-2)}`;
  } catch (e) {
    return dateString;
  }
};

// Analisa uma string de moeda BRL (ex: "- R$ 1.234,56") e converte para um número.
export const parseCurrency = (value: string): number => {
    if (typeof value !== 'string' || value.trim() === '') {
        return 0;
    }
    // 1. Remove thousand separators (dots)
    // 2. Replace decimal separator (comma) with dot
    // 3. Remove everything else except digits, dot and minus sign
    const cleaned = value
        .replace(/\./g, '') // remove dots
        .replace(',', '.') // replace comma with dot
        .replace(/[^\d.-]/g, ''); // remove anything not a digit, dot or minus
    
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
};

// Parses a DD/MM/YYYY date string into YYYY-MM-DD
export const parseBrDate = (dateString: string): string | null => {
    if (typeof dateString !== 'string') return null;
    const parts = dateString.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (day.length > 2 || month.length > 2 || year.length !== 4) return null;
    
    // Basic validation
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    if (d < 1 || d > 31 || m < 1 || m > 12) return null;
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export function roundHalfUp(n: number, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function computeFirstCompetency(dateCompra: Date, diaFechamento: number): {year: number; month: number} {
  const y = dateCompra.getUTCFullYear();
  const m = dateCompra.getUTCMonth(); // 0..11
  const diaCompra = dateCompra.getUTCDate();
  if (diaCompra <= diaFechamento) return { year: y, month: m }; // current month
  const d = new Date(Date.UTC(y, m + 1, 1)); // next month
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export function addMonths(year: number, month: number, n: number): {year: number; month: number} {
  const d = new Date(Date.UTC(year, month + n, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export function ymToISOFirstDay(year: number, month0: number) {
  const y = year, m = month0 + 1;
  return `${y}-${String(m).padStart(2,'0')}-01`;
}

export function splitInstallments(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const resto = cents - base * n;
  const arr = Array(n).fill(base);
  for (let i = 0; i < resto; i++) arr[i] += 1; // distribute remaining cents
  return arr.map(c => roundHalfUp(c / 100, 2));
}

export const calculateSaldo = (contaId: string, transacoes: TransacaoBanco[], ateData?: string, includePrevisto = false): number => {
    return transacoes
        .filter(t =>
            t.conta_id === contaId &&
            (t.realizado || (includePrevisto && t.previsto)) &&
            (!ateData || t.data <= ateData)
        )
        .reduce((sum, t) => {
            if (t.tipo === TipoCategoria.Entrada) return sum + t.valor;
            if (t.tipo === TipoCategoria.Saida || t.tipo === TipoCategoria.Investimento) return sum - t.valor;
            if (t.tipo === TipoCategoria.Transferencia) {
                if (t.meta_saldo_inicial) return sum + t.valor;
                // Simple deterministic rule for two-leg transfers: smaller ID is debit
                const pair = transacoes.find(p => p.id === t.transferencia_par_id);
                if (pair && t.id < pair.id) return sum - t.valor;
                return sum + t.valor;
            }
            return sum;
        }, 0);
};