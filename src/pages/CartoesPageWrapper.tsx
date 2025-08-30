import React, { useState } from 'react';
import CartoesPage from './CartoesPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';

export default function CartoesPageWrapper() {
  const { contas } = useAccounts();
  const { transacoes, addPayment } = useTransactions();
  const { cartoes, compras, parcelas, addCartao, updateCartao, deleteCartao, deleteCompraCartao, markParcelasAsPaid } = useCards();
  const { categorias } = useCategories();
  const { selectedMonth, setSelectedMonth, openModal, setCurrentPage, setConfirmation, modalState, setModalState } = useAppContext();
  
  // Local state for page-specific functionality
  const [selectedView, setSelectedView] = useState<'all' | string>('all');

  const pagarFatura = (cartaoId: string, contaId: string, valor: number, data: string, competencia: string) => {
    const cartao = cartoes.find(c => c.id === cartaoId);
    if (cartao) {
      // Cria a transação de pagamento
      addPayment(cartaoId, contaId, valor, data, competencia, cartao.apelido, categorias);
      // Marca as parcelas da competência como pagas
      markParcelasAsPaid(cartaoId, competencia);
    }
  };

  return (
    <CartoesPage
      cartoes={cartoes}
      contas={contas}
      categorias={categorias}
      compras={compras}
      parcelas={parcelas}
      transacoes={transacoes}
      addCartao={addCartao}
      updateCartao={updateCartao}
      deleteCartao={deleteCartao}
      deleteCompraCartao={deleteCompraCartao}
      pagarFatura={pagarFatura}
      navigationState={null}
      clearNavigationState={() => {}}
      setConfirmation={setConfirmation}
      setCurrentPage={setCurrentPage}
      modalState={modalState}
      openModal={openModal}
      closeModal={() => setModalState({ modal: null, data: null })}
      selectedView={selectedView}
      setSelectedView={setSelectedView}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
    />
  );
}