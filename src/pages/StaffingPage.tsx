import { useState, useCallback, useMemo } from 'react';
import type { Employee, EmployeeRole, OnlineOrder, RushPeriod } from '../lib/staffing';
import {
  DAYS, HOURS, HOUR_START, HOUR_HEIGHT, ROLES, ROLE_COLORS, EMP_STRIP_W,
  SEED_EMPLOYEES, SEED_RUSH_PERIODS,
  formatHour, getWeekStart, getWeekDates,
  getRushPeriodForSlot, getActiveEmployees, getStationingPlan,
} from '../lib/staffing';
import { useActivity } from '../context/ActivityContext';
import './StaffingPage.css';

// ── Helpers ──────────────────────────────────────────────────────

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── PeakModal ────────────────────────────────────────────────────

interface PeakModalProps {
  onSave: (r: Omit<RushPeriod, 'id'>) => void;
  onClose: () => void;
}

function PeakModal({ onSave, onClose }: PeakModalProps) {
  const [day, setDay] = useState(4);
  const [startHour, setStartHour] = useState(18);
  const [endHour, setEndHour] = useState(22);
  const [label, setLabel] = useState('Dinner Rush');

  const handleSave = () => {
    if (endHour <= startHour) return;
    onSave({ day, startHour, endHour, label: label.trim() || 'Rush' });
  };

  return (
    <div className="stf-modal-overlay" onClick={onClose}>
      <div className="stf-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="stf-modal-title">Set Peak Hours</h3>
        <label className="stf-form-label">
          Day
          <select className="stf-form-select" value={day} onChange={e => setDay(+e.target.value)}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </label>
        <label className="stf-form-label">
          Label
          <input
            className="stf-form-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Dinner Rush"
          />
        </label>
        <div className="stf-form-row">
          <label className="stf-form-label">
            From
            <select className="stf-form-select" value={startHour} onChange={e => setStartHour(+e.target.value)}>
              {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </label>
          <label className="stf-form-label">
            To
            <select className="stf-form-select" value={endHour} onChange={e => setEndHour(+e.target.value)}>
              {HOURS.filter(h => h > startHour).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </label>
        </div>
        {endHour <= startHour && (
          <p className="stf-form-error">End time must be after start time.</p>
        )}
        <div className="stf-modal-actions">
          <button className="stf-btn stf-btn--primary" onClick={handleSave} disabled={endHour <= startHour}>
            Save Peak Period
          </button>
          <button className="stf-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── OrderModal ───────────────────────────────────────────────────

interface OrderModalProps {
  onSave: (o: Omit<OnlineOrder, 'id'>) => void;
  onClose: () => void;
}

const PREP_OPTIONS = [10, 15, 20, 30, 45, 60];

function OrderModal({ onSave, onClose }: OrderModalProps) {
  const [label, setLabel] = useState('2× Pizza, 1× Pasta');
  const [prepMinutes, setPrepMinutes] = useState(20);
  const [day, setDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // convert Sun=0 to Mon=0
  });
  const [startHour, setStartHour] = useState(() => {
    const h = new Date().getHours();
    return Math.max(HOUR_START, Math.min(h, 25));
  });
  const [startMin, setStartMin] = useState(0);

  const handleSave = () => {
    onSave({
      label: label.trim() || 'Online Order',
      prepMinutes,
      day,
      startHour: startHour + startMin / 60,
    });
  };

  return (
    <div className="stf-modal-overlay" onClick={onClose}>
      <div className="stf-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="stf-modal-title">Simulate Online Order</h3>
        <label className="stf-form-label">
          Order Items
          <input
            className="stf-form-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. 2× Pizza, 1× Burger"
          />
        </label>
        <label className="stf-form-label">
          Prep Time
          <select className="stf-form-select" value={prepMinutes} onChange={e => setPrepMinutes(+e.target.value)}>
            {PREP_OPTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <label className="stf-form-label">
          Day
          <select className="stf-form-select" value={day} onChange={e => setDay(+e.target.value)}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </label>
        <div className="stf-form-row">
          <label className="stf-form-label">
            Start Hour
            <select className="stf-form-select" value={startHour} onChange={e => setStartHour(+e.target.value)}>
              {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </label>
          <label className="stf-form-label">
            Minute
            <select className="stf-form-select" value={startMin} onChange={e => setStartMin(+e.target.value)}>
              <option value={0}>:00</option>
              <option value={30}>:30</option>
            </select>
          </label>
        </div>
        <div className="stf-modal-actions">
          <button className="stf-btn stf-btn--accent" onClick={handleSave}>
            📦 Simulate Order
          </button>
          <button className="stf-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── EmployeeModal ────────────────────────────────────────────────

interface EmployeeModalProps {
  onSave: (e: Omit<Employee, 'id'>) => void;
  onClose: () => void;
}

function EmployeeModal({ onSave, onClose }: EmployeeModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('Server');
  const [hourlyRate, setHourlyRate] = useState(14);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);

  const toggleDay = (d: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim() || selectedDays.size === 0) return;
    onSave({
      name: name.trim(),
      role,
      hourlyRate,
      availability: Array.from(selectedDays).map(day => ({ day, startHour, endHour })),
    });
  };

  return (
    <div className="stf-modal-overlay" onClick={onClose}>
      <div className="stf-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="stf-modal-title">Add Employee</h3>
        <label className="stf-form-label">
          Name
          <input
            className="stf-form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full name"
          />
        </label>
        <label className="stf-form-label">
          Role
          <select className="stf-form-select" value={role} onChange={e => setRole(e.target.value as EmployeeRole)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="stf-form-label">
          Hourly Rate ($)
          <input
            className="stf-form-input"
            type="number"
            min={8}
            max={100}
            value={hourlyRate}
            onChange={e => setHourlyRate(Math.max(8, +e.target.value))}
          />
        </label>
        <div className="stf-form-label">
          Available Days
          <div className="stf-day-checkboxes">
            {DAYS.map((d, i) => (
              <button
                key={i}
                className={`stf-day-chip${selectedDays.has(i) ? ' stf-day-chip--on' : ''}`}
                onClick={() => toggleDay(i)}
                type="button"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="stf-form-row">
          <label className="stf-form-label">
            Shift Start
            <select className="stf-form-select" value={startHour} onChange={e => setStartHour(+e.target.value)}>
              {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </label>
          <label className="stf-form-label">
            Shift End
            <select className="stf-form-select" value={endHour} onChange={e => setEndHour(+e.target.value)}>
              {HOURS.filter(h => h > startHour).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </label>
        </div>
        {(!name.trim() || selectedDays.size === 0) && (
          <p className="stf-form-error">Enter a name and select at least one day.</p>
        )}
        <div className="stf-modal-actions">
          <button
            className="stf-btn stf-btn--primary"
            onClick={handleSave}
            disabled={!name.trim() || selectedDays.size === 0 || endHour <= startHour}
          >
            Add Employee
          </button>
          <button className="stf-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function StaffingPage() {
  const { addActivity } = useActivity();
  const [employees,   setEmployees]   = useState<Employee[]>(SEED_EMPLOYEES);
  const [rushPeriods, setRushPeriods] = useState<RushPeriod[]>(SEED_RUSH_PERIODS);
  const [orders,      setOrders]      = useState<OnlineOrder[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null);

  const [showPeakModal,  setShowPeakModal]  = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEmpModal,   setShowEmpModal]   = useState(false);

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const todayDayIdx = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  // Employees visible per day (for left-to-right strip ordering)
  const dayEmployeeMap = useMemo(
    () => DAYS.map((_, d) => employees.filter(e => e.availability.some(a => a.day === d))),
    [employees],
  );

  // Stationing info for selected slot
  const stationingInfo = useMemo(() => {
    if (!selectedSlot) return null;
    const { day, hour } = selectedSlot;
    const activeEmps = getActiveEmployees(day, hour, employees);
    const rush       = getRushPeriodForSlot(day, hour, rushPeriods);
    const plan       = getStationingPlan(activeEmps.length, !!rush);
    return { activeEmps, rush, plan };
  }, [selectedSlot, employees, rushPeriods]);

  // ── Callbacks ──────────────────────────────────────────────────

  const handleColumnClick = useCallback((dayIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = HOUR_START + Math.max(0, Math.min(Math.floor(y / HOUR_HEIGHT), 19));
    setSelectedSlot({ day: dayIdx, hour });
  }, []);

  const addRushPeriod = useCallback((r: Omit<RushPeriod, 'id'>) => {
    setRushPeriods(prev => [...prev, { id: newId(), ...r }]);
    addActivity(`Rush hour set: ${r.label} on ${DAYS[r.day]} ${formatHour(r.startHour)}–${formatHour(r.endHour)}`, 'rush');
    setShowPeakModal(false);
  }, [addActivity]);

  const deleteRushPeriod = useCallback((id: string) => {
    setRushPeriods(prev => prev.filter(r => r.id !== id));
  }, []);

  const addOrder = useCallback((o: Omit<OnlineOrder, 'id'>) => {
    setOrders(prev => [...prev, { id: newId(), ...o }]);
    addActivity(`Online order queued: ${o.label} (${o.prepMinutes} min prep)`, 'order');
    setShowOrderModal(false);
  }, [addActivity]);

  const deleteOrder = useCallback((id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  const addEmployee = useCallback((emp: Omit<Employee, 'id'>) => {
    setEmployees(prev => [...prev, { id: newId(), ...emp }]);
    addActivity(`Staff added: ${emp.name} (${emp.role})`, 'staff');
    setShowEmpModal(false);
  }, [addActivity]);

  const deleteEmployee = useCallback((id: string) => {
    const target = employees.find(e => e.id === id);
    if (target) addActivity(`Staff removed: ${target.name}`, 'staff');
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, [addActivity, employees]);

  // Week label
  const weekLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  })();

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="stf-wrapper">

      {/* ── Page Header ── */}
      <div className="stf-page-header">
        <div className="stf-page-header-left">
          <h1 className="stf-page-title">Dynamic Staffing Engine</h1>
          <span className="stf-week-label">📅 {weekLabel}</span>
        </div>
        <div className="stf-header-actions">
          <button className="stf-btn stf-btn--rush"    onClick={() => setShowPeakModal(true)}>🔥 Set Peak</button>
          <button className="stf-btn stf-btn--accent"  onClick={() => setShowOrderModal(true)}>📦 Simulate Order</button>
          <button className="stf-btn stf-btn--primary" onClick={() => setShowEmpModal(true)}>+ Employee</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="stf-body">

        {/* ── Sidebar ── */}
        <aside className="stf-sidebar">

          {/* Auto-Stationing Panel */}
          <section className="stf-sidebar-section">
            <p className="stf-sidebar-heading">AUTO-STATIONING</p>
            {selectedSlot ? (
              <div>
                <div className="stf-slot-header">
                  <span className="stf-slot-day">{DAYS[selectedSlot.day]}</span>
                  <span className="stf-slot-time">{formatHour(selectedSlot.hour)}</span>
                  {stationingInfo?.rush && (
                    <span className="stf-rush-badge">{stationingInfo.rush.label}</span>
                  )}
                </div>
                <div className="stf-active-count">
                  <span className="stf-count-num">{stationingInfo?.activeEmps.length ?? 0}</span>
                  <span> staff available</span>
                </div>
                {stationingInfo?.activeEmps.map(e => (
                  <div key={e.id} className="stf-active-emp">
                    <span className="stf-role-dot" style={{ background: ROLE_COLORS[e.role] }} />
                    <span className="stf-emp-small-name">{e.name}</span>
                    <span className="stf-emp-small-role">{e.role}</span>
                  </div>
                ))}
                {(stationingInfo?.plan.roles.length ?? 0) > 0 && (
                  <div className="stf-station-plan">
                    <p className="stf-station-plan-title">Recommended Stations</p>
                    {stationingInfo!.plan.roles.map((r, i) => (
                      <div key={i} className="stf-station-role">
                        <span className="stf-role-dot" style={{ background: ROLE_COLORS[r as EmployeeRole] ?? '#888' }} />
                        {r}
                      </div>
                    ))}
                  </div>
                )}
                {stationingInfo?.plan.warning && (
                  <div className="stf-understaffed-warn">{stationingInfo.plan.warning}</div>
                )}
              </div>
            ) : (
              <p className="stf-hint">Click any time slot to analyze staffing.</p>
            )}
          </section>

          <div className="stf-sidebar-divider" />

          {/* Employee Roster */}
          <section className="stf-sidebar-section">
            <p className="stf-sidebar-heading">STAFF ROSTER</p>
            {employees.map(e => (
              <div key={e.id} className="stf-emp-row">
                <span
                  className="stf-role-chip"
                  style={{ background: ROLE_COLORS[e.role] }}
                  title={e.role}
                >
                  {e.name[0]}
                </span>
                <div className="stf-emp-row-info">
                  <span className="stf-emp-row-name">{e.name}</span>
                  <span className="stf-emp-row-meta">{e.role} · ${e.hourlyRate}/hr</span>
                </div>
                <button
                  className="stf-row-del"
                  onClick={() => deleteEmployee(e.id)}
                  aria-label="Remove employee"
                >✕</button>
              </div>
            ))}
          </section>

          <div className="stf-sidebar-divider" />

          {/* Rush Periods */}
          <section className="stf-sidebar-section">
            <p className="stf-sidebar-heading">PEAK PERIODS</p>
            {rushPeriods.length === 0 && <p className="stf-hint">No rush periods set.</p>}
            {rushPeriods.map(r => (
              <div key={r.id} className="stf-rush-row">
                <span className="stf-day-tag">{DAYS[r.day]}</span>
                <div className="stf-rush-row-info">
                  <span className="stf-rush-row-label">{r.label}</span>
                  <span className="stf-rush-row-time">{formatHour(r.startHour)}–{formatHour(r.endHour)}</span>
                </div>
                <button
                  className="stf-row-del"
                  onClick={() => deleteRushPeriod(r.id)}
                  aria-label="Remove rush period"
                >✕</button>
              </div>
            ))}
          </section>

          <div className="stf-sidebar-divider" />

          {/* Active Orders */}
          <section className="stf-sidebar-section">
            <p className="stf-sidebar-heading">GHOST ORDERS</p>
            {orders.length === 0 && <p className="stf-hint">No simulated orders.</p>}
            {orders.map(o => (
              <div key={o.id} className="stf-rush-row">
                <span className="stf-day-tag">{DAYS[o.day]}</span>
                <div className="stf-rush-row-info">
                  <span className="stf-rush-row-label">{o.label}</span>
                  <span className="stf-rush-row-time">{o.prepMinutes} min prep</span>
                </div>
                <button
                  className="stf-row-del"
                  onClick={() => deleteOrder(o.id)}
                  aria-label="Remove order"
                >✕</button>
              </div>
            ))}
          </section>

        </aside>

        {/* ── Calendar ── */}
        <div className="stf-calendar-wrap">
          <div className="stf-calendar-scroll">

            {/* Sticky day header row */}
            <div className="stf-grid-header">
              <div className="stf-time-spacer" />
              {DAYS.map((d, idx) => {
                const date = weekDates[idx];
                const isToday = idx === todayDayIdx;
                return (
                  <div
                    key={idx}
                    className={`stf-day-header${isToday ? ' stf-day-header--today' : ''}`}
                  >
                    <span className="stf-day-name">{d}</span>
                    <span className="stf-day-date">{date.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Grid content */}
            <div className="stf-grid-content">

              {/* Sticky time column */}
              <div className="stf-time-col">
                {HOURS.map(h => (
                  <div key={h} className="stf-time-slot">
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div className="stf-days-container">
                {DAYS.map((_, dayIdx) => {
                  const dayEmps = dayEmployeeMap[dayIdx];
                  return (
                    <div
                      key={dayIdx}
                      className="stf-day-col"
                      onClick={(e) => handleColumnClick(dayIdx, e)}
                    >
                      {/* Hour grid lines */}
                      {HOURS.map((h, hi) => (
                        <div
                          key={h}
                          className="stf-hour-line"
                          style={{ top: hi * HOUR_HEIGHT }}
                        />
                      ))}

                      {/* Rush hour bands */}
                      {rushPeriods.filter(r => r.day === dayIdx).map(r => (
                        <div
                          key={r.id}
                          className="stf-rush-band"
                          style={{
                            top: (r.startHour - HOUR_START) * HOUR_HEIGHT,
                            height: (r.endHour - r.startHour) * HOUR_HEIGHT,
                          }}
                        >
                          <span className="stf-rush-band-label">{r.label}</span>
                          <button
                            className="stf-rush-band-del"
                            onClick={(e) => { e.stopPropagation(); deleteRushPeriod(r.id); }}
                            aria-label="Remove peak"
                          >✕</button>
                        </div>
                      ))}

                      {/* Employee availability strips */}
                      {dayEmps.map((emp, empIdx) =>
                        emp.availability
                          .filter(a => a.day === dayIdx)
                          .map((a, aIdx) => (
                            <div
                              key={`${emp.id}-${aIdx}`}
                              className="stf-emp-strip"
                              style={{
                                top: Math.max(0, (a.startHour - HOUR_START) * HOUR_HEIGHT),
                                height: Math.max(
                                  (Math.min(a.endHour, 26) - a.startHour) * HOUR_HEIGHT,
                                  20,
                                ),
                                left: 2 + empIdx * EMP_STRIP_W,
                                width: EMP_STRIP_W - 2,
                                background: ROLE_COLORS[emp.role],
                              }}
                              title={`${emp.name} · ${emp.role} · $${emp.hourlyRate}/hr`}
                            >
                              <span className="stf-emp-initial">{emp.name[0]}</span>
                            </div>
                          )),
                      )}

                      {/* Online order ghost blocks */}
                      {orders.filter(o => o.day === dayIdx).map((o, oi) => (
                        <div
                          key={o.id}
                          className="stf-order-ghost"
                          style={{
                            top: Math.max(0, (o.startHour - HOUR_START) * HOUR_HEIGHT) + oi * 3,
                            height: Math.max((o.prepMinutes / 60) * HOUR_HEIGHT, 24),
                          }}
                          title={`📦 ${o.label} — ${o.prepMinutes} min prep`}
                        >
                          <span className="stf-order-icon">📦</span>
                          <span className="stf-order-label">{o.label}</span>
                          <button
                            className="stf-order-del"
                            onClick={(e) => { e.stopPropagation(); deleteOrder(o.id); }}
                            aria-label="Remove order"
                          >✕</button>
                        </div>
                      ))}

                      {/* Selected slot highlight */}
                      {selectedSlot?.day === dayIdx && (
                        <div
                          className="stf-selected-slot"
                          style={{
                            top: (selectedSlot.hour - HOUR_START) * HOUR_HEIGHT,
                            height: HOUR_HEIGHT,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Legend */}
          <div className="stf-legend">
            <span className="stf-legend-item">
              <span className="stf-legend-swatch stf-legend-swatch--rush" /> Rush Hour
            </span>
            <span className="stf-legend-item">
              <span className="stf-legend-swatch stf-legend-swatch--emp" /> Staff Available
            </span>
            <span className="stf-legend-item">
              <span className="stf-legend-swatch stf-legend-swatch--order" /> Online Order
            </span>
            <span className="stf-legend-item">
              <span className="stf-legend-swatch stf-legend-swatch--selected" /> Selected Slot
            </span>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showPeakModal  && <PeakModal     onSave={addRushPeriod} onClose={() => setShowPeakModal(false)}  />}
      {showOrderModal && <OrderModal    onSave={addOrder}       onClose={() => setShowOrderModal(false)} />}
      {showEmpModal   && <EmployeeModal onSave={addEmployee}    onClose={() => setShowEmpModal(false)}   />}

    </div>
  );
}
