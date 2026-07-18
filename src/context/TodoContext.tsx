import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────

export type OrderSource = 'manual' | 'doordash' | 'ubereats' | 'grubhub';
export type OrderStatus = 'pending' | 'completed';

export interface Order {
  id:          string;
  orderNumber: string;
  customer:    string;
  items:       string;
  source:      OrderSource;
  status:      OrderStatus;
  createdAt:   Date;
}

interface TodoContextValue {
  orders:        Order[];
  addOrder:      (orderNumber: string, customer: string, items: string, source?: OrderSource) => void;
  completeOrder: (id: string) => void;
  removeOrder:   (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function todoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Seed data ─────────────────────────────────────────────────────

const SEED_ORDERS: Order[] = [
  {
    id: 'o1', orderNumber: '#1042', customer: 'Table 5',
    items: '2× Pasta Carbonara, 1× Caesar Salad, 2× House Wine',
    source: 'manual', status: 'pending',
    createdAt: new Date(Date.now() - 8 * 60_000),
  },
  {
    id: 'o2', orderNumber: '#DD562', customer: 'DoorDash',
    items: '1× Margherita Pizza, 1× Tiramisu, 2× Lemonade',
    source: 'doordash', status: 'pending',
    createdAt: new Date(Date.now() - 22 * 60_000),
  },
  {
    id: 'o3', orderNumber: '#UE101', customer: 'UberEats',
    items: '3× Chicken Parmesan, 1× Garlic Bread',
    source: 'ubereats', status: 'pending',
    createdAt: new Date(Date.now() - 35 * 60_000),
  },
  {
    id: 'o4', orderNumber: '#1043', customer: 'Jane Smith',
    items: '1× Risotto, 2× Bruschetta, 1× Espresso',
    source: 'manual', status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60_000),
  },
  {
    id: 'o5', orderNumber: '#GH88', customer: 'Grubhub',
    items: '2× BBQ Ribs, 1× Coleslaw, 2× Iced Tea',
    source: 'grubhub', status: 'pending',
    createdAt: new Date(Date.now() - 51 * 60_000),
  },
];

// ── Persistence helpers ───────────────────────────────────────────

const STORAGE_KEY = 'operon-orders';

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_ORDERS;
    const parsed: (Omit<Order, 'createdAt'> & { createdAt: string })[] = JSON.parse(raw);
    return parsed.map((o) => ({ ...o, createdAt: new Date(o.createdAt) }));
  } catch {
    return SEED_ORDERS;
  }
}

// ── Context ───────────────────────────────────────────────────────

const TodoContext = createContext<TodoContextValue>({
  orders:        SEED_ORDERS,
  addOrder:      () => {},
  completeOrder: () => {},
  removeOrder:   () => {},
});

export function useTodo() {
  return useContext(TodoContext);
}

// ── Provider ──────────────────────────────────────────────────────

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(loadOrders);

  // Sync to localStorage whenever orders change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const addOrder = useCallback((
    orderNumber: string,
    customer:    string,
    items:       string,
    source:      OrderSource = 'manual',
  ) => {
    setOrders((prev) => [
      {
        id: todoId(),
        orderNumber,
        customer,
        items,
        source,
        status: 'pending',
        createdAt: new Date(),
      },
      ...prev,
    ]);
  }, []);

  const completeOrder = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'completed' as OrderStatus } : o))
    );
  }, []);

  const removeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return (
    <TodoContext.Provider value={{ orders, addOrder, completeOrder, removeOrder }}>
      {children}
    </TodoContext.Provider>
  );
}
