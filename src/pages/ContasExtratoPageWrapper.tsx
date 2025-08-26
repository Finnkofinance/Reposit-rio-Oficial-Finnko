import React, { useState } from 'react';
import ContasExtratoPage from './ContasExtratoPage';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAppContext } from '@/context/AppContext';
import { TipoCategoria, ContaBancaria } from '@/types/types';
import { transactionsService } from '@/services/transactionsService';

export default function ContasExtratoPageWrapper() {
  const { contas, addConta, updateConta, deleteConta } = useAccounts();
  const { transacoes, deleteTransacao, deleteTransacoes, updateTransacoesCategoria, toggleTransactionRealizado, addTransacao, updateTransacao, bulkAdd } = useTransactions();
  const { categorias } = useCategories();
  const { setConfirmation } = useAppContext();
  
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
        categoria_id: (categorias.find(c => c.sistema && c.tipo === TipoCategoria.Transferencia && c.nome === 'Saldo Inicial')?.id) || 'unknown',
        descricao: 'Saldo inicial da conta',
        previsto: false,
        realizado: true,
        meta_saldo_inicial: true,
      };
      
      const categoria = categorias.find(c => c.sistema && c.tipo === TipoCategoria.Transferencia && c.nome === 'Saldo Inicial');
      if (categoria) {
        addTransacao(initialTx, categoria);
      } else {
        // Fallback imediato quando categorias ainda não carregaram
        bulkAdd([{
          id: crypto.randomUUID(),
          conta_id: newConta.id,
          data: contaData.data_inicial,
          valor: contaData.saldo_inicial,
          categoria_id: 'unknown',
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
    // Atualiza a conta (inclui saldo_inicial/data no estado e Supabase)
    updateConta(conta, novoSaldoInicial, novaDataInicial);
    // Ajusta a transação de saldo inicial para manter a consistência como antes
    const txSaldoInicial = transacoes.find(t => t.conta_id === conta.id && t.meta_saldo_inicial);
    if (txSaldoInicial) {
      const categoriaSaldoInicial = categorias.find(c => c.sistema && c.tipo === TipoCategoria.Transferencia && c.nome === 'Saldo Inicial');
      if (categoriaSaldoInicial) {
        updateTransacao({
          ...txSaldoInicial,
          valor: novoSaldoInicial,
          data: novaDataInicial
        } as any, categoriaSaldoInicial);
      }
    }
  };

  // Confirma e executa exclusão de conta com remoção de transações relacionadas
  const handleDeleteConta = (id: string) => {
    const conta = contas.find(c => c.id === id);
    const txIds = transacoes.filter(t => t.conta_id === id).map(t => t.id);
    setConfirmation({
      title: 'Excluir conta e transações?',
      message: (
        <div>
          <p>Esta ação removerá a conta{conta ? ` "${conta.nome}"` : ''} e todas as transações relacionadas ({txIds.length}).</p>
          <p>Esta ação não pode ser desfeita.</p>
        </div>
      ),
      buttons: [
        { label: 'Cancelar', style: 'secondary', onClick: () => setConfirmation(null) },
        { label: 'Excluir', style: 'danger', onClick: async () => {
            // Remove transações no estado (context também persiste no Supabase)
            if (txIds.length > 0) deleteTransacoes(txIds);
            // Remove conta
            deleteConta(id);
            setConfirmation(null);
          }
        }
      ]
    });
  };

  // Confirma exclusão de uma transação individual
  const handleDeleteTransacao = (id: string) => {
    setConfirmation({
      title: 'Excluir transação?',
      message: 'Esta ação removerá a transação selecionada. Esta ação não pode ser desfeita.',
      buttons: [
        { label: 'Cancelar', style: 'secondary', onClick: () => setConfirmation(null) },
        { label: 'Excluir', style: 'danger', onClick: () => { deleteTransacao(id); setConfirmation(null); } }
      ]
    });
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
      deleteConta={handleDeleteConta}
      deleteTransacao={handleDeleteTransacao}
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