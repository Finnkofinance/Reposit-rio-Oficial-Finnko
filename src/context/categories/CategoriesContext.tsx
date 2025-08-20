import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Categoria } from '@/types/types';
import { categoriesService } from '@/services/categoriesService';

interface CategoriesContextType {
  categorias: Categoria[];
  addCategoria: (cat: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>) => void;
  updateCategoria: (cat: Categoria) => void;
  deleteCategoria: (id: string) => void;
  validateCategoriaDeletion: (categoryId: string, transacoes: any[], compras: any[]) => boolean;
  bulkReplaceCategories: (categorias: Categoria[]) => void;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

interface CategoriesProviderProps {
  children: ReactNode;
}

export const CategoriesProvider: React.FC<CategoriesProviderProps> = ({ children }) => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Load categories from localStorage on mount
  useEffect(() => {
    const loadedCategorias = categoriesService.getAll();
    setCategorias(loadedCategorias);
  }, []);

  // Save to localStorage whenever categorias change
  useEffect(() => {
    if (categorias.length >= 0) {
      categoriesService.save(categorias);
    }
  }, [categorias]);

  const addCategoria = (cat: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt' | 'sistema'>) => {
    const newCat = categoriesService.create(cat);
    setCategorias(prev => [...prev, newCat]);
  };

  const updateCategoria = (cat: Categoria) => {
    const updatedCat = categoriesService.update(cat);
    setCategorias(prev => prev.map(c => c.id === cat.id ? updatedCat : c));
  };

  const deleteCategoria = (id: string) => {
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