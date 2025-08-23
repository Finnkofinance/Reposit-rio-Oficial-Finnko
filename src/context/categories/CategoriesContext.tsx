import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Categoria } from '@/types/types';
import { categoriesService } from '@/services/categoriesService';
import { useAuth } from '@/features/auth/AuthProvider';

interface CategoriesContextType {
  categorias: Categoria[];
  addCategoria: (cat: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>) => Promise<Categoria | null>;
  updateCategoria: (cat: Categoria) => Promise<Categoria | null>;
  deleteCategoria: (id: string) => Promise<void>;
  validateCategoriaDeletion: (categoryId: string, transacoes: any[], compras: any[]) => boolean;
  bulkReplaceCategories: (categorias: Categoria[]) => void;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

interface CategoriesProviderProps {
  children: ReactNode;
}

export const CategoriesProvider: React.FC<CategoriesProviderProps> = ({ children }) => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const { user, loading } = useAuth();

  // Load categories from localStorage on mount
  // Carregar quando auth resolver (demo: user=null; logado: user.id)
  useEffect(() => {
    if (loading) return;
    (async () => {
      const loaded = await categoriesService.getAll();
      setCategorias(Array.isArray(loaded) ? loaded : []);
      setInitialLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  // Save to localStorage whenever categorias change
  // Salvar após carga inicial, evitando sobrescrever remoto com vazio
  useEffect(() => {
    if (!initialLoaded) return;
    (async () => {
      await categoriesService.save(categorias);
    })();
  }, [categorias, initialLoaded]);

  const addCategoria = async (cat: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>): Promise<Categoria | null> => {
    try {
      const newCat = await categoriesService.create(cat);
      setCategorias(prev => [...prev, newCat]);
      return newCat;
    } catch (e) {
      console.error('addCategoria error:', e);
      return null;
    }
  };

  const updateCategoria = async (cat: Categoria): Promise<Categoria | null> => {
    try {
      const updatedCat = await categoriesService.update(cat);
      setCategorias(prev => prev.map(c => c.id === cat.id ? updatedCat : c));
      return updatedCat;
    } catch (e) {
      console.error('updateCategoria error:', e);
      return null;
    }
  };

  const deleteCategoria = async (id: string) => {
    try {
      await categoriesService.delete(id);
    } catch (e) {
      // Mesmo que falhe remoto, otimizamos UI. Se falhar e for sessão real, o próximo getAll sincroniza.
    }
    setCategorias(prev => prev.filter(c => c.id !== id));
  };

  const validateCategoriaDeletion = (categoryId: string, transacoes: any[], compras: any[]): boolean => {
    return categoriesService.validateDeletion(categoryId, transacoes, compras);
  };

  const bulkReplaceCategories = (newCategorias: Categoria[]) => {
    setCategorias(newCategorias);
  };

  return (
    <CategoriesContext.Provider value={{
      categorias,
      addCategoria,
      updateCategoria,
      deleteCategoria,
      validateCategoriaDeletion,
      bulkReplaceCategories
    }}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategoriesContext = () => {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategoriesContext must be used within a CategoriesProvider');
  }
  return context;
};