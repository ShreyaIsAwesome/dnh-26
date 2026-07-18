// ================================================================
// OperON – Dynamic Staffing Engine: Types & Logic
// ================================================================

export type EmployeeRole =
  | 'Lead Cook'
  | 'Cook'
  | 'Server'
  | 'Busser'
  | 'Floater'
  | 'Host'
  | 'Bartender';

export const ROLES: EmployeeRole[] = [
  'Lead Cook', 'Cook', 'Server', 'Busser', 'Floater', 'Host', 'Bartender',
];

export const ROLE_COLORS: Record<EmployeeRole, string> = {
  'Lead Cook':  '#ef4444',
  'Cook':       '#f97316',
  'Server':     '#3b82f6',
  'Busser':     '#8b5cf6',
  'Floater':    '#10b981',
  'Host':       '#f59e0b',
  'Bartender':  '#ec4899',
};

export interface AvailabilityBlock {
  day: number;        // 0 = Mon … 6 = Sun
  startHour: number;  // 6–26 range
  endHour: number;    // 6–26 range (exclusive)
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  hourlyRate: number;
  availability: AvailabilityBlock[];
}

export interface RushPeriod {
  id: string;
  label: string;
  day: number;        // 0–6
  startHour: number;
  endHour: number;
}

export interface OnlineOrder {
  id: string;
  label: string;
  prepMinutes: number;
  day: number;
  startHour: number;  // may be fractional (e.g. 13.5 = 1:30 PM)
}

// ── Calendar constants ───────────────────────────────────────────

export const HOUR_START   = 6;   // 6 AM
export const HOUR_END     = 26;  // 2 AM next day (represented as 26)
export const TOTAL_HOURS  = HOUR_END - HOUR_START; // 20
export const HOUR_HEIGHT  = 60;  // px per hour slot
export const EMP_STRIP_W  = 20;  // px width per employee strip

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

// ── Helpers ──────────────────────────────────────────────────────

export function formatHour(h: number): string {
  const actual = h % 24;
  if (actual === 0)  return '12 AM';
  if (actual === 12) return '12 PM';
  if (actual < 12)   return `${actual} AM`;
  return `${actual - 12} PM`;
}

export function getWeekStart(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(weekStart: Date): Date[] {
  return DAYS.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function getRushPeriodForSlot(
  day: number,
  hour: number,
  rushPeriods: RushPeriod[],
): RushPeriod | undefined {
  return rushPeriods.find(r => r.day === day && hour >= r.startHour && hour < r.endHour);
}

export function getActiveEmployees(
  day: number,
  hour: number,
  employees: Employee[],
): Employee[] {
  return employees.filter(e =>
    e.availability.some(a => a.day === day && hour >= a.startHour && hour < a.endHour),
  );
}

// ── Auto-Stationing Logic ────────────────────────────────────────

export function getStationingPlan(
  activeCount: number,
  isRush: boolean,
): { roles: string[]; warning: string | null } {
  const roles: string[] = [];

  if (activeCount === 0) {
    return { roles: [], warning: '⚠️ No staff scheduled for this period!' };
  }

  if (activeCount >= 1) roles.push('Lead Cook');
  if (activeCount >= 2) roles.push('Server');
  if (activeCount >= 3) roles.push('Cook');
  if (activeCount >= 4) roles.push('Busser');
  if (activeCount >= 5) roles.push('Floater');
  if (activeCount >= 6) roles.push('Bartender');

  const minRequired = isRush ? 4 : 2;
  const warning =
    activeCount < minRequired
      ? `⚠️ Understaffed! Need ${minRequired - activeCount} more staff${isRush ? ' during rush' : ''}.`
      : null;

  return { roles, warning };
}

// ── Seed Data ────────────────────────────────────────────────────

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'e1', name: 'Maria Santos', role: 'Lead Cook', hourlyRate: 22,
    availability: [
      { day: 0, startHour: 9,  endHour: 17 },
      { day: 1, startHour: 9,  endHour: 17 },
      { day: 2, startHour: 9,  endHour: 17 },
      { day: 4, startHour: 14, endHour: 22 },
      { day: 5, startHour: 14, endHour: 22 },
    ],
  },
  {
    id: 'e2', name: 'James Chen', role: 'Cook', hourlyRate: 18,
    availability: [
      { day: 1, startHour: 10, endHour: 18 },
      { day: 2, startHour: 10, endHour: 18 },
      { day: 3, startHour: 10, endHour: 18 },
      { day: 5, startHour: 16, endHour: 24 },
      { day: 6, startHour: 12, endHour: 20 },
    ],
  },
  {
    id: 'e3', name: 'Aisha Johnson', role: 'Server', hourlyRate: 14,
    availability: [
      { day: 0, startHour: 11, endHour: 19 },
      { day: 2, startHour: 11, endHour: 19 },
      { day: 4, startHour: 17, endHour: 23 },
      { day: 5, startHour: 17, endHour: 25 },
      { day: 6, startHour: 11, endHour: 19 },
    ],
  },
  {
    id: 'e4', name: 'Dylan Park', role: 'Busser', hourlyRate: 12,
    availability: [
      { day: 3, startHour: 12, endHour: 20 },
      { day: 4, startHour: 12, endHour: 20 },
      { day: 5, startHour: 17, endHour: 25 },
      { day: 6, startHour: 17, endHour: 25 },
    ],
  },
  {
    id: 'e5', name: 'Rosa Nguyen', role: 'Host', hourlyRate: 13,
    availability: [
      { day: 0, startHour: 11, endHour: 19 },
      { day: 1, startHour: 11, endHour: 19 },
      { day: 4, startHour: 17, endHour: 23 },
      { day: 5, startHour: 17, endHour: 23 },
      { day: 6, startHour: 11, endHour: 19 },
    ],
  },
  {
    id: 'e6', name: 'Marco Torres', role: 'Bartender', hourlyRate: 16,
    availability: [
      { day: 3, startHour: 17, endHour: 25 },
      { day: 4, startHour: 17, endHour: 25 },
      { day: 5, startHour: 17, endHour: 26 },
      { day: 6, startHour: 17, endHour: 26 },
    ],
  },
];

export const SEED_RUSH_PERIODS: RushPeriod[] = [
  { id: 'r1', label: 'Lunch Rush',  day: 0, startHour: 11, endHour: 14 },
  { id: 'r2', label: 'Lunch Rush',  day: 1, startHour: 11, endHour: 14 },
  { id: 'r3', label: 'Lunch Rush',  day: 2, startHour: 11, endHour: 14 },
  { id: 'r4', label: 'Lunch Rush',  day: 3, startHour: 11, endHour: 14 },
  { id: 'r5', label: 'Lunch Rush',  day: 4, startHour: 11, endHour: 14 },
  { id: 'r6', label: 'Dinner Rush', day: 4, startHour: 18, endHour: 22 },
  { id: 'r7', label: 'Dinner Rush', day: 5, startHour: 18, endHour: 23 },
  { id: 'r8', label: 'Dinner Rush', day: 6, startHour: 17, endHour: 22 },
];
