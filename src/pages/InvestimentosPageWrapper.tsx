import React from 'react';
import InvestimentosPage from './InvestimentosPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useInvestments } from '@/hooks/useInvestments';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';

export default function InvestimentosPageWrapper() {
  const { contas } = useAccounts();
  const { transacoes, addTransacao } = useTransactions();
  const { 
    objetivos, 
    ativos, 
    alocacoes, 
    addObjetivo, 
    updateObjetivo, 
    deleteObjetivo,
    addAtivo,
    updateAtivo,
    deleteAtivo,
    setAlocacoesParaAtivo,
    addInvestmentTransaction
  } = useInvestments();
  const { categorias } = useCategories();
  const { selectedMonth, setSelectedMonth, openModal } = useAppContext();

  const handleAddInvestimentoTransaction = (txData: any) => {
    const categoria = categorias.find(c => c.id === txData.categoria_id);
    if (categoria) {
      const newTx = addInvestmentTransaction(txData, categoria);
      if (newTx) {
        addTransacao(txData, categoria);
      }
    }
  };

  return (
    <InvestimentosPage
      objetivos={objetivos}
      addObjetivo={addObjetivo}
      updateObjetivo={updateObjetivo}
      deleteObjetivo={deleteObjetivo}
      ativos={ativos}
      addAtivo={addAtivo}
      updateAtivo={updateAtivo}
      deleteAtivo={deleteAtivo}
      alocacoes={alocacoes}
      setAlocacoesParaAtivo={setAlocacoesParaAtivo}
      navigationState={null}
      clearNavigationState={() => {}}
      transacoes={transacoes}
      contas={contas}
      categorias={categorias}
      addInvestimentoTransaction={handleAddInvestimentoTransaction}
      modalState={{ modal: null, data: null }}
      openModal={openModal}
      closeModal={() => {}}
      selectedView="all"
      setSelectedView={() => {}}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
    />
  );
}