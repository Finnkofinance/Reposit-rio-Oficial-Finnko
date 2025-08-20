import React, { useState } from 'react';
import ContasExtratoPage from './ContasExtratoPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';
import { TipoCategoria } from '@/types/types';

export default function ContasExtratoPageWrapper() {
  const { contas, addConta, updateConta, deleteConta } = useAccounts();
  const { transacoes, deleteTransacao, deleteTransacoes, updateTransacoesCategoria, toggleTransactionRealizado, addTransacao, updateTransacao, bulkAdd } = useTransactions();
  const { categorias } = useCategories();
  
  const handleUpdateTransacoesCategoria = (ids: string[], newCategoryId: string) => {
    const categoria = categorias.find(c => c.id === newCategoryId);
    if (categoria) {
      updateTransacoesCategoria(ids, newCategoryId, categoria);
    }
  };

  const handleAddConta = (contaData: { nome: string; saldo_inicial: number; ativo: boolean; data_inicial: string; cor: string; }) => {
    const newConta = addConta(contaData);
    if (newConta) {
      // Create initial balance transaction
      const initialTx = {
        conta_id: newConta.id,
        data: contaData.data_inicial,
        valor: contaData.saldo_inicial,
        categoria_id: 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e71', // Saldo Inicial
        descricao: 'Saldo inicial da conta',
        previsto: false,
        realizado: true,
        meta_saldo_inicial: true,
      };
      
      const categoria = categorias.find(c => c.id === 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e71');
      if (categoria) {
        addTransacao(initialTx, categoria);
      } else {
        // Fallback imediato quando categorias ainda não carregaram
        bulkAdd([{
          id: crypto.randomUUID(),
          conta_id: newConta.id,
          data: contaData.data_inicial,
          valor: contaData.saldo_inicial,
          categoria_id: 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e71',
          tipo: TipoCategoria.Transferencia,
          descricao: 'Saldo inicial da conta',
          previsto: false,
          realizado: true,
          meta_saldo_inicial: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);
      }
    }
    return newConta;
  };

  const handleUpdateConta = (conta: Omit<ContaBancaria, 'saldo_inicial'>, novoSaldoInicial: number, novaDataInicial: string) => {
    // Atualiza a conta
    updateConta(conta);
    // Ajusta a transação de saldo inicial para manter a consistência como antes
    const txSaldoInicial = transacoes.find(t => t.conta_id === conta.id && t.meta_saldo_inicial);
    if (txSaldoInicial) {
      const categoriaSaldoInicial = categorias.find(c => c.id === 't3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e71');
      if (categoriaSaldoInicial) {
        updateTransacao({
          ...txSaldoInicial,
          valor: novoSaldoInicial,
          data: novaDataInicial
        } as any, categoriaSaldoInicial);
      }
    }
  };
  const { selectedMonth, setSelectedMonth, openModal, modalState, setModalState } = useAppContext();
  
  // Local state for page-specific functionality
  const [selectedView, setSelectedView] = useState<'all' | string>('all');

  return (
    <ContasExtratoPage
      contas={contas}
      transacoes={transacoes}
      categorias={categorias}
      addConta={handleAddConta}
      updateConta={handleUpdateConta}
      deleteConta={deleteConta}
      deleteTransacao={deleteTransacao}
      deleteTransacoes={deleteTransacoes}
      updateTransacoesCategoria={handleUpdateTransacoesCategoria}
      toggleTransactionRealizado={toggleTransactionRealizado}
      navigationState={null}
      clearNavigationState={() => {}}
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