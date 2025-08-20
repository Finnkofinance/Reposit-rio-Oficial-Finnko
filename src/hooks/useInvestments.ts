import { useInvestmentsContext } from '@/context/investments/InvestmentsContext';

export const useInvestments = () => {
  return useInvestmentsContext();
};