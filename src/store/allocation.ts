import { create } from 'zustand';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

export interface AllocationItem {
  code: string;
  name: string;
  targetRatio: number; // 목표 비율 (%)
  type: 'stock' | 'etf' | 'cash';
}

export interface AllocationConfig {
  items: AllocationItem[];
  threshold: number; // 리밸런싱 허용 오차 (%)
  autoCheck: boolean;
  checkIntervalMinutes: number;
}

const DEFAULT_CONFIG: AllocationConfig = {
  items: [],
  threshold: 2,
  autoCheck: false,
  checkIntervalMinutes: 60,
};

interface AllocationState {
  config: AllocationConfig;
  isLoaded: boolean;

  loadConfig: () => Promise<void>;
  saveConfig: (config: AllocationConfig) => Promise<void>;
  addItem: (item: AllocationItem) => Promise<void>;
  removeItem: (code: string) => Promise<void>;
  updateItem: (code: string, updates: Partial<AllocationItem>) => Promise<void>;
  setThreshold: (threshold: number) => Promise<void>;
}

export const useAllocationStore = create<AllocationState>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoaded: false,

  loadConfig: async () => {
    const saved = await storage.getJSON<AllocationConfig>(STORAGE_KEYS.ALLOCATION_CONFIG);
    set({ config: saved ?? DEFAULT_CONFIG, isLoaded: true });
  },

  saveConfig: async (config: AllocationConfig) => {
    await storage.setJSON(STORAGE_KEYS.ALLOCATION_CONFIG, config);
    set({ config });
  },

  addItem: async (item: AllocationItem) => {
    const { config, saveConfig } = get();
    const newItems = [...config.items.filter((i) => i.code !== item.code), item];
    await saveConfig({ ...config, items: newItems });
  },

  removeItem: async (code: string) => {
    const { config, saveConfig } = get();
    await saveConfig({ ...config, items: config.items.filter((i) => i.code !== code) });
  },

  updateItem: async (code: string, updates: Partial<AllocationItem>) => {
    const { config, saveConfig } = get();
    const newItems = config.items.map((i) => (i.code === code ? { ...i, ...updates } : i));
    await saveConfig({ ...config, items: newItems });
  },

  setThreshold: async (threshold: number) => {
    const { config, saveConfig } = get();
    await saveConfig({ ...config, threshold });
  },
}));
