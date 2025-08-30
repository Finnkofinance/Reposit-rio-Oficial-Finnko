import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cartao, CompraCartao, ParcelaCartao } from '@/types/types';
import { cardsService } from '@/services/cardsService';
import { useAuth } from '@/features/auth/AuthProvider';

interface CardsContextType {
  cartoes: Cartao[];
  compras: CompraCartao[];
  parcelas: ParcelaCartao[];
  addCartao: (cartaoData: Omit<Cartao, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCartao: (cartao: Cartao) => void;
  deleteCartao: (id: string) => void;
  addCompraCartao: (compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'> & { parcelas: number }) => boolean;
  addRecurringCompraCartao: (compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'>) => boolean;
  updateCompraCartao: (compra: CompraCartao & { parcelas: number }) => boolean;
  deleteCompraCartao: (id: string) => void;
  markParcelasAsPaid: (cartaoId: string, competencia: string) => void;
  bulkReplaceCompras: (compras: CompraCartao[]) => void;
  bulkReplaceParcelas: (parcelas: ParcelaCartao[]) => void;
  bulkReplaceCartoes: (cartoes: Cartao[]) => void;
}

const CardsContext = createContext<CardsContextType | undefined>(undefined);

interface CardsProviderProps {
  children: ReactNode;
}

export const CardsProvider: React.FC<CardsProviderProps> = ({ children }) => {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [compras, setCompras] = useState<CompraCartao[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaCartao[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const { user, loading } = useAuth();

  // Load data (Supabase se logado; senão localStorage)
  useEffect(() => {
    if (loading) return;
    (async () => {
      const loadedCartoes = await cardsService.getAll();
      setCartoes(Array.isArray(loadedCartoes) ? loadedCartoes : []);
      // Compras e parcelas: busca do serviço (usa Supabase se logado)
      const { compras: loadedCompras, parcelas: loadedParcelas } = await cardsService.getPurchases();
      setCompras(Array.isArray(loadedCompras) ? loadedCompras : []);
      setParcelas(Array.isArray(loadedParcelas) ? loadedParcelas : []);
      setInitialLoaded(true);
    })();
  }, [loading, user?.id]);

  // Save cards
  useEffect(() => {
    if (!initialLoaded) return;
    (async () => { await cardsService.save(cartoes); })();
  }, [cartoes, initialLoaded]);

  // Removido localStorage - sempre usar Supabase

  const addCartao = (cartaoData: Omit<Cartao, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCartao = cardsService.create(cartaoData);
    setCartoes(prev => [...prev, newCartao]);
  };

  const updateCartao = (cartao: Cartao) => {
    const updatedCartao = cardsService.update(cartao);
    setCartoes(prev => prev.map(c => c.id === cartao.id ? updatedCartao : c));
  };

  const deleteCartao = (id: string) => {
    const comprasToDelete = new Set(compras.filter(c => c.cartao_id === id).map(c => c.id));
    setCartoes(prev => prev.filter(c => c.id !== id));
    setCompras(prev => prev.filter(c => c.cartao_id !== id));
    setParcelas(prev => prev.filter(p => !comprasToDelete.has(p.compra_id)));
    // Esforço melhorado: também remove do Supabase se logado
    (async () => {
      try { await cardsService.deleteOne(id); } catch {}
    })();
  };

  const addCompraCartao = (compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'> & { parcelas: number }): boolean => {
    const cartao = cartoes.find(c => c.id === compraData.cartao_id);
    if (!cartao) return false;

    (async () => {
      try {
        // Sempre usar Supabase se logado
        if (user) {
          if (compraData.recorrencia) {
            const { compras: newCompras, parcelas: newParcelas } = await cardsService.createRecurringPurchasePersist(compraData, cartao);
            setCompras(prev => [...prev, ...newCompras]);
            setParcelas(prev => [...prev, ...newParcelas]);
          } else {
            const { compra: newCompra, parcelas: newParcelas } = await cardsService.createPurchasePersist(compraData, cartao);
            setCompras(prev => [...prev, newCompra]);
            setParcelas(prev => [...prev, ...newParcelas]);
          }
        }
        // Se não logado, não permite criação de compras
      } catch (e) {
        console.error('Erro ao criar compra:', e);
      }
    })();
    return true;
  };

  const addRecurringCompraCartao = (compraData: Omit<CompraCartao, 'id' | 'createdAt' | 'updatedAt' | 'parcelas_total'>): boolean => {
    const cartao = cartoes.find(c => c.id === compraData.cartao_id);
    if (!cartao || !user) return false;

    (async () => {
      try {
        const { compras: newCompras, parcelas: newParcelas } = await cardsService.createRecurringPurchasePersist(compraData, cartao);
        setCompras(prev => [...prev, ...newCompras]);
        setParcelas(prev => [...prev, ...newParcelas]);
      } catch (e) {
        console.error('Erro ao criar compra recorrente:', e);
      }
    })();
    return true;
  };

  const updateCompraCartao = (compra: CompraCartao & { parcelas: number }): boolean => {
    const cartao = cartoes.find(c => c.id === compra.cartao_id);
    if (!cartao) return false;

    (async () => {
      try {
        if (user) {
          const { updatedCompra, newParcelas } = await cardsService.updatePurchasePersist(compra, cartao);
          const parcelasToKeep = parcelas.filter(p => p.compra_id !== compra.id);
          setCompras(prev => prev.map(c => c.id === compra.id ? updatedCompra : c));
          setParcelas([...parcelasToKeep, ...newParcelas]);
        }
        // Se não logado, não permite atualizações
      } catch (e) {
        console.error('Erro ao atualizar compra:', e);
      }
    })();
    return true;
  };

  const deleteCompraCartao = (id: string) => {
    setCompras(prev => prev.filter(c => c.id !== id));
    setParcelas(prev => prev.filter(p => p.compra_id !== id));
    (async () => {
      try { await cardsService.deletePurchase(id); } catch {}
    })();
  };

  const bulkReplaceCompras = (newCompras: CompraCartao[]) => {
    setCompras(newCompras);
  };

  const bulkReplaceParcelas = (newParcelas: ParcelaCartao[]) => {
    setParcelas(newParcelas);
  };

  const bulkReplaceCartoes = (newCartoes: Cartao[]) => {
    setCartoes(newCartoes);
  };

  const markParcelasAsPaid = (cartaoId: string, competencia: string) => {
    const parcelasToUpdate = parcelas.filter(p => {
      const compra = compras.find(c => c.id === p.compra_id);
      return compra?.cartao_id === cartaoId && p.competencia_fatura === competencia && !p.paga;
    });

    if (parcelasToUpdate.length === 0) return;

    // Atualiza localmente
    setParcelas(prev => prev.map(p => {
      const shouldUpdate = parcelasToUpdate.some(pu => pu.id === p.id);
      return shouldUpdate ? { ...p, paga: true } : p;
    }));

    // Persiste no banco
    parcelasToUpdate.forEach(parcela => {
      cardsService.markInstallmentAsPaid(parcela.id).catch(err => {
        console.error('Error marking installment as paid:', err);
      });
    });
  };

  return (
    <CardsContext.Provider value={{
      cartoes,
      compras,
      parcelas,
      addCartao,
      updateCartao,
      deleteCartao,
      addCompraCartao,
      addRecurringCompraCartao,
      updateCompraCartao,
      deleteCompraCartao,
      markParcelasAsPaid,
      bulkReplaceCompras,
      bulkReplaceParcelas,
      bulkReplaceCartoes
    }}>
      {children}
    </CardsContext.Provider>
  );
};

export const useCardsContext = () => {
  const context = useContext(CardsContext);
  if (context === undefined) {
    throw new Error('useCardsContext must be used within a CardsProvider');
  }
  return context;
};