// ================================================================
// OperON – Operations: Types & Logic
// ================================================================

export type TableStatus = 'available' | 'occupied' | 'dirty';
export type TableShape = 'square-2' | 'round-4' | 'round-6' | 'bar' | 'kitchen';

export interface FloorTable {
  id: string;
  label: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  status: TableStatus;
  seatedAt: number | null;
}

export interface ShapeDefinition {
  shape: TableShape;
  capacity: number;
  icon: string;
  desc: string;
}

// 90 minutes in ms
export const TURN_TIME_ALERT_MS = 90 * 60 * 1000;

export const STATUS_NEXT: Record<TableStatus, TableStatus> = {
  available: 'occupied',
  occupied: 'dirty',
  dirty: 'available',
};

export const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  dirty: 'Needs Busing',
};

export function cycleStatus(table: FloorTable): Pick<FloorTable, 'status' | 'seatedAt'> {
  const next = STATUS_NEXT[table.status];
  return { status: next, seatedAt: next === 'occupied' ? Date.now() : null };
}

export function isOverTurnTime(seatedAt: number | null, now: number): boolean {
  if (!seatedAt) return false;
  return now - seatedAt > TURN_TIME_ALERT_MS;
}

export function formatElapsed(seatedAt: number, now: number): string {
  const totalMin = Math.floor((now - seatedAt) / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const SHAPE_LIBRARY: ShapeDefinition[] = [
  { shape: 'square-2', capacity: 2, icon: '⬛', desc: 'Square 2-top' },
  { shape: 'round-4',  capacity: 4, icon: '⭕', desc: 'Round 4-top' },
  { shape: 'round-6',  capacity: 6, icon: '🔵', desc: 'Round 6-top' },
  { shape: 'bar',      capacity: 8, icon: '▬',  desc: 'Bar Section' },
  { shape: 'kitchen',  capacity: 0, icon: '🍳', desc: 'Kitchen Pass' },
];

// Seed data – some tables start occupied/overdue for demo purposes
const _now = Date.now();

export const SEED_TABLES: FloorTable[] = [
  { id: 't1', label: 'T1', shape: 'square-2', capacity: 2, x: 44,  y: 44,  status: 'available', seatedAt: null },
  { id: 't2', label: 'T2', shape: 'round-4',  capacity: 4, x: 170, y: 40,  status: 'occupied',  seatedAt: _now - 97  * 60000 },
  { id: 't3', label: 'T3', shape: 'round-4',  capacity: 4, x: 320, y: 40,  status: 'dirty',     seatedAt: null },
  { id: 't4', label: 'T4', shape: 'square-2', capacity: 2, x: 468, y: 44,  status: 'available', seatedAt: null },
  { id: 't5', label: 'T5', shape: 'round-6',  capacity: 6, x: 36,  y: 190, status: 'occupied',  seatedAt: _now - 42  * 60000 },
  { id: 't6', label: 'T6', shape: 'round-4',  capacity: 4, x: 240, y: 188, status: 'available', seatedAt: null },
  { id: 't7', label: 'T7', shape: 'square-2', capacity: 2, x: 414, y: 194, status: 'occupied',  seatedAt: _now - 112 * 60000 },
  { id: 't8', label: 'T8', shape: 'bar',      capacity: 8, x: 40,  y: 340, status: 'available', seatedAt: null },
  { id: 't9', label: 'T9', shape: 'round-4',  capacity: 4, x: 272, y: 338, status: 'dirty',     seatedAt: null },
];
