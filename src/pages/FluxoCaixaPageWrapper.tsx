import React from 'react';
import FluxoCaixaPage from './FluxoCaixaPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/features/auth/AuthProvider';
import { TableLayoutProvider } from '@/context/tableLayout/TableLayoutProvider';
import { SCREEN_KEY_FLUXO_CAIXA } from '@/services/columnWidthService';

export default function FluxoCaixaPageWrapper() {
  const { contas } = useAccounts();
  const { transacoes } = useTransactions();
  const { cartoes, compras, parcelas } = useCards();
  const { categorias } = useCategories();
  const { selectedMonth, setSelectedMonth } = useAppContext();
  const { user } = useAuth();

  return (
    <TableLayoutProvider userId={user?.id} screenKey={SCREEN_KEY_FLUXO_CAIXA}>
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
    </TableLayoutProvider>
  );
}