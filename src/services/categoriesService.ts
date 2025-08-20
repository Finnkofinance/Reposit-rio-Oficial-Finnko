import { Categoria } from '@/types/types';
import { CATEGORIAS_PADRAO } from '@/constants.tsx';

export const categoriesService = {
  getAll: (): Categoria[] => {
    try {
      const item = window.localStorage.getItem('categorias');
      const stored: Categoria[] = item ? JSON.parse(item) : [];

      // Garante que todas as categorias globais (padrão) existam para todos os usuários
      const byId = new Map<string, Categoria>(stored.map(c => [c.id, c]));
      let changed = false;

      for (const cat of CATEGORIAS_PADRAO) {
        if (!byId.has(cat.id)) {
          byId.set(cat.id, { ...cat });
          changed = true;
        }
      }

      const merged = Array.from(byId.values());
      if (changed || !item) {
        // Persiste imediatamente para que todos vejam as categorias globais
        window.localStorage.setItem('categorias', JSON.stringify(merged));
      }
      return merged.length > 0 ? merged : CATEGORIAS_PADRAO;
    } catch (error) {
      console.error('Error reading categories from localStorage:', error);
      return CATEGORIAS_PADRAO;
    }
  },

  save: (categorias: Categoria[]): void => {
    try {
      window.localStorage.setItem('categorias', JSON.stringify(categorias));
    } catch (error) {
      console.error('Error saving categories to localStorage:', error);
    }
  },

  create: (cat: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>): Categoria => {
    return {
      ...cat,
      id: crypto.randomUUID(),
      sistema: false,
      createdAt: new Date().toISOString()
    };
  },

  update: (cat: Categoria): Categoria => {
    return {
      ...cat,
      updatedAt: new Date().toISOString()
    };
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