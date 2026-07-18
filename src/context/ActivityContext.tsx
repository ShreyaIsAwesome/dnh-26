import { createContext, useContext, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────

export type ActivityType =
  | 'order'
  | 'payment'
  | 'staff'
  | 'alert'
  | 'customer'
  | 'inventory'
  | 'operations'
  | 'rush';

export interface ActivityEvent {
  id: string;
  action: string;
  timestamp: Date;
  type: ActivityType;
}

interface ActivityContextValue {
  activities: ActivityEvent[];
  addActivity: (action: string, type: ActivityType) => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function actId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Returns a human-readable "X min ago" string from a Date. */
export function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} hr ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} day${diffD > 1 ? 's' : ''} ago`;
}

// ── Seed data (pre-populates the feed on first load) ─────────────

const SEED: ActivityEvent[] = [
  { id: 's1', action: 'New order #1042 placed — John Smith — Burger, Fries', timestamp: new Date(Date.now() - 2   * 60_000), type: 'order'     },
  { id: 's2', action: 'Invoice #887 paid – $320.00',                         timestamp: new Date(Date.now() - 14  * 60_000), type: 'payment'    },
  { id: 's3', action: 'Staff schedule updated for Fri',                      timestamp: new Date(Date.now() - 60  * 60_000), type: 'staff'      },
  { id: 's4', action: 'Low stock alert: Oat Milk',                           timestamp: new Date(Date.now() - 120 * 60_000), type: 'alert'      },
  { id: 's5', action: 'New customer registered',                             timestamp: new Date(Date.now() - 180 * 60_000), type: 'customer'   },
  { id: 's6', action: 'Order #1039 fulfilled',                               timestamp: new Date(Date.now() - 240 * 60_000), type: 'order'      },
];

// ── Context ───────────────────────────────────────────────────────

const ActivityContext = createContext<ActivityContextValue>({
  activities: SEED,
  addActivity: () => {},
});

export function useActivity() {
  return useContext(ActivityContext);
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<ActivityEvent[]>(SEED);

  const addActivity = useCallback((action: string, type: ActivityType) => {
    setActivities((prev) => [
      { id: actId(), action, timestamp: new Date(), type },
      ...prev.slice(0, 49), // cap at 50
    ]);
  }, []);

  return (
    <ActivityContext.Provider value={{ activities, addActivity }}>
      {children}
    </ActivityContext.Provider>
  );
}
