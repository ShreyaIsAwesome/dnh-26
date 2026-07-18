import { createContext, useContext, useState, useCallback } from 'react';
import type { InventoryItem } from '../lib/inventory';
import { seedInventory } from '../lib/inventory';

// ── Types ─────────────────────────────────────────────────────────

interface InventoryContextValue {
  items: InventoryItem[];
  addItem:   (item: InventoryItem) => void;
  addItems:  (items: InventoryItem[]) => void;
  deleteItem: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────

const InventoryContext = createContext<InventoryContextValue>({
  items:      seedInventory,
  addItem:    () => {},
  addItems:   () => {},
  deleteItem: () => {},
});

export function useInventory() {
  return useContext(InventoryContext);
}

// ── Provider ──────────────────────────────────────────────────────

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(seedInventory);

  const addItem = useCallback((item: InventoryItem) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const addItems = useCallback((newItems: InventoryItem[]) => {
    setItems((prev) => [...newItems, ...prev]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <InventoryContext.Provider value={{ items, addItem, addItems, deleteItem }}>
      {children}
    </InventoryContext.Provider>
  );
}
