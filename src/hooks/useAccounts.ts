import { useAccountsContext } from '@/context/accounts/AccountsContext';

export const useAccounts = () => {
  return useAccountsContext();
};