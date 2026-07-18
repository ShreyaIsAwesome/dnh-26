import { createContext, useContext, useState, useMemo } from 'react';
import type { Employee, OnlineOrder, RushPeriod } from '../lib/staffing';
import { SEED_EMPLOYEES, SEED_RUSH_PERIODS, getActiveEmployees } from '../lib/staffing';

// ── Types ─────────────────────────────────────────────────────────

interface StaffingContextValue {
  employees:       Employee[];
  rushPeriods:     RushPeriod[];
  onlineOrders:    OnlineOrder[];
  staffOnShiftNow: number;
  setEmployees:    React.Dispatch<React.SetStateAction<Employee[]>>;
  setRushPeriods:  React.Dispatch<React.SetStateAction<RushPeriod[]>>;
  setOnlineOrders: React.Dispatch<React.SetStateAction<OnlineOrder[]>>;
}

// ── Context ───────────────────────────────────────────────────────

const StaffingContext = createContext<StaffingContextValue>({
  employees:       SEED_EMPLOYEES,
  rushPeriods:     SEED_RUSH_PERIODS,
  onlineOrders:    [],
  staffOnShiftNow: 0,
  setEmployees:    () => {},
  setRushPeriods:  () => {},
  setOnlineOrders: () => {},
});

export function useStaffing() {
  return useContext(StaffingContext);
}

// ── Provider ──────────────────────────────────────────────────────

export function StaffingProvider({ children }: { children: React.ReactNode }) {
  const [employees,    setEmployees]    = useState<Employee[]>(SEED_EMPLOYEES);
  const [rushPeriods,  setRushPeriods]  = useState<RushPeriod[]>(SEED_RUSH_PERIODS);
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);

  // Count employees whose availability covers right now
  const staffOnShiftNow = useMemo(() => {
    const now    = new Date();
    const jsDay  = now.getDay();                   // 0 = Sun
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1;   // Mon=0 … Sun=6
    const hour   = now.getHours();
    return getActiveEmployees(dayIdx, hour, employees).length;
  }, [employees]);

  return (
    <StaffingContext.Provider value={{
      employees, rushPeriods, onlineOrders, staffOnShiftNow,
      setEmployees, setRushPeriods, setOnlineOrders,
    }}>
      {children}
    </StaffingContext.Provider>
  );
}
