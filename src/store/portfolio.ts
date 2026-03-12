import { create } from 'zustand';
import { AccountBalance, Holding } from '../brokers/types';

interface PortfolioState {
  balance: AccountBalance | null;
  holdings: Holding[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;

  setBalance: (balance: AccountBalance) => void;
  setHoldings: (holdings: Holding[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  balance: null,
  holdings: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  setBalance: (balance) => set({ balance, lastUpdated: Date.now() }),
  setHoldings: (holdings) => set({ holdings, lastUpdated: Date.now() }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({ balance: null, holdings: [], isLoading: false, error: null, lastUpdated: null }),
}));
