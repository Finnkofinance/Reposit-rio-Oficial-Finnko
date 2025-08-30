// src/utils/dateBr.ts
export function isValidBrDate(str: string): boolean {
  // Espera "DD/MM/AAAA"
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return false;
  const [d, m, y] = str.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function parseBrDate(str: string): string | null {
  if (!isValidBrDate(str)) return null;
  const [d, m, y] = str.split('/').map(Number);
  // ISO curto, compatível com localeCompare e ordenação lexicográfica
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

export function compareIsoDates(a: string, b: string): number {
  // ISO YYYY-MM-DD: comparar como string funciona
  return a.localeCompare(b);
}

export function isoToBrDate(isoDate: string): string {
  // Converte YYYY-MM-DD para DD/MM/YYYY
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function brToIsoDate(brDate: string): string | null {
  // Converte DD/MM/YYYY para YYYY-MM-DD
  if (!isValidBrDate(brDate)) return null;
  const [d, m, y] = brDate.split('/');
  const mm = String(Number(m)).padStart(2, '0');
  const dd = String(Number(d)).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}