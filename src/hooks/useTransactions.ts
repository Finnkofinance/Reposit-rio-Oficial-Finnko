import { useTransactionsContext } from '@/context/transactions/TransactionsContext';

export const useTransactions = () => {
  return useTransactionsContext();
};