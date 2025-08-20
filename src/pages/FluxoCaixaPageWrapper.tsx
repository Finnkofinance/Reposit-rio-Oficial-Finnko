import React from 'react';
import FluxoCaixaPage from './FluxoCaixaPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';

export default function FluxoCaixaPageWrapper() {
  const { contas } = useAccounts();
  const { transacoes } = useTransactions();
  const { cartoes, compras, parcelas } = useCards();
  const { categorias } = useCategories();
  const { selectedMonth, setSelectedMonth } = useAppContext();

  return (
    <FluxoCaixaPage
      contas={contas}
      transacoes={transacoes}
      categorias={categorias}
      compras={compras}
      parcelas={parcelas}
      cartoes={cartoes}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
    />
  );
}