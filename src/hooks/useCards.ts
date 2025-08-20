import { useCardsContext } from '@/context/cards/CardsContext';

export const useCards = () => {
  return useCardsContext();
};