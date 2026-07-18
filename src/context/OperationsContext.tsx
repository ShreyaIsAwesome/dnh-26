import { createContext, useContext, useState, useCallback } from 'react';
import type { FloorTable } from '../lib/operations';

// ── Types ─────────────────────────────────────────────────────────

interface OperationsContextValue {
  tables:      FloorTable[];
  floorPlan:   string | null;
  setTables:   React.Dispatch<React.SetStateAction<FloorTable[]>>;
  setFloorPlan: React.Dispatch<React.SetStateAction<string | null>>;
  updateTable: (id: string, patch: Partial<FloorTable>) => void;
}

// ── Context ───────────────────────────────────────────────────────

const OperationsContext = createContext<OperationsContextValue>({
  tables:      [],
  floorPlan:   null,
  setTables:   () => {},
  setFloorPlan: () => {},
  updateTable: () => {},
});

export function useOperations() {
  return useContext(OperationsContext);
}

// ── Provider ──────────────────────────────────────────────────────

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  // Start blank — no seed tables, no floor plan image
  const [tables,    setTables]    = useState<FloorTable[]>([]);
  const [floorPlan, setFloorPlan] = useState<string | null>(null);

  const updateTable = useCallback((id: string, patch: Partial<FloorTable>) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
  }, []);

  return (
    <OperationsContext.Provider value={{ tables, floorPlan, setTables, setFloorPlan, updateTable }}>
      {children}
    </OperationsContext.Provider>
  );
}
