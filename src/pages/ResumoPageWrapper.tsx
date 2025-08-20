import React from 'react';
import ResumoPage from './ResumoPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';

export default function ResumoPageWrapper() {
  const { contas } = useAccounts();
  const { transacoes } = useTransactions();
  const { cartoes, compras, parcelas } = useCards();
  const { categorias } = useCategories();
  const { selectedMonth, setSelectedMonth, settings, setCurrentPage, openModal } = useAppContext();

  return (
    <ResumoPage
      contas={contas}
      transacoes={transacoes}
      cartoes={cartoes}
      compras={compras}
      parcelas={parcelas}
      categorias={categorias}
      setCurrentPage={setCurrentPage}
      openModal={openModal}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
      settings={settings}
    />
  );
}