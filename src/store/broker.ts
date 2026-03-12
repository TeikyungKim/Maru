import { create } from 'zustand';
import { BrokerAPI } from '../brokers/types';
import { createBroker, resetBroker } from '../brokers/broker-factory';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

interface BrokerState {
  brokerKey: string | null;
  broker: BrokerAPI | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  selectBroker: (key: string) => Promise<void>;
  setAuthenticated: (value: boolean) => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useBrokerStore = create<BrokerState>((set, get) => ({
  brokerKey: null,
  broker: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  selectBroker: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const broker = createBroker(key);
      await storage.set(STORAGE_KEYS.BROKER, key);
      set({ brokerKey: key, broker, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),

  logout: async () => {
    const { brokerKey } = get();
    await storage.delete(STORAGE_KEYS.KIS_ACCESS_TOKEN);
    await storage.delete(STORAGE_KEYS.KIS_TOKEN_EXPIRES);
    resetBroker();
    set({
      broker: brokerKey ? createBroker(brokerKey) : null,
      isAuthenticated: false,
    });
  },

  clearError: () => set({ error: null }),
}));
