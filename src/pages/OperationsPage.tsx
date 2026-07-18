import { useState, useEffect, useRef, useCallback } from 'react';
import type { FloorTable, TableStatus, TableShape } from '../lib/operations';
import {
  cycleStatus, isOverTurnTime, formatElapsed,
  SHAPE_LIBRARY, STATUS_LABEL, TURN_TIME_ALERT_MS,
} from '../lib/operations';
import { useActivity } from '../context/ActivityContext';
import { useOperations } from '../context/OperationsContext';
import './OperationsPage.css';

// ── helpers ──────────────────────────────────────────────────────

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function nextLabel(tables: FloorTable[]): string {
  const nums = tables
    .map((t) => parseInt(t.label.replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n));
  return `T${nums.length ? Math.max(...nums) + 1 : 1}`;
}

// ── Draggable table node ─────────────────────────────────────────
// Each node manages its own drag with native mouse events (no lib needed)

interface TableNodeProps {
  table: FloorTable;
  now: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onToggle: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onResize:  (id: string, w: number, h: number, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

const MIN_TABLE_SIZE = 40;
type Corner = 'nw' | 'ne' | 'sw' | 'se';

function TableNode({ table, now, canvasRef, onToggle, onDragEnd, onResize, onDelete }: TableNodeProps) {
  const ref = useRef<HTMLDivElement>(null!);
  const overTime = isOverTurnTime(table.seatedAt, now);
  const elapsed = table.seatedAt ? formatElapsed(table.seatedAt, now) : '';

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Let delete / resize handles handle their own events
    if ((e.target as HTMLElement).closest('.ops-tbl-del, .ops-resize-handle')) return;
    e.preventDefault();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const origX = table.x;
    const origY = table.y;
    let didDrag = false;
    const livePos = { x: origX, y: origY };

    const onMove = (ev: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !ref.current) return;
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag = true;

      const maxX = canvas.clientWidth  - ref.current.offsetWidth;
      const maxY = canvas.clientHeight - ref.current.offsetHeight;
      livePos.x = Math.max(0, Math.min(origX + dx, maxX));
      livePos.y = Math.max(0, Math.min(origY + dy, maxY));
      ref.current.style.transform = `translate(${livePos.x}px, ${livePos.y}px)`;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (didDrag) {
        onDragEnd(table.id, livePos.x, livePos.y);
      } else {
        onToggle(table.id);
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, corner: Corner) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const origW  = ref.current.offsetWidth;
    const origH  = ref.current.offsetHeight;
    const origTX = table.x;
    const origTY = table.y;
    const live = { w: origW, h: origH, x: origTX, y: origTY };

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newW = origW, newH = origH, newX = origTX, newY = origTY;

      if (corner === 'se') {
        newW = Math.max(MIN_TABLE_SIZE, origW + dx);
        newH = Math.max(MIN_TABLE_SIZE, origH + dy);
      } else if (corner === 'sw') {
        newW = Math.max(MIN_TABLE_SIZE, origW - dx);
        newH = Math.max(MIN_TABLE_SIZE, origH + dy);
        newX = origTX + (origW - newW);
      } else if (corner === 'ne') {
        newW = Math.max(MIN_TABLE_SIZE, origW + dx);
        newH = Math.max(MIN_TABLE_SIZE, origH - dy);
        newY = origTY + (origH - newH);
      } else {
        // nw
        newW = Math.max(MIN_TABLE_SIZE, origW - dx);
        newH = Math.max(MIN_TABLE_SIZE, origH - dy);
        newX = origTX + (origW - newW);
        newY = origTY + (origH - newH);
      }

      live.w = newW; live.h = newH; live.x = newX; live.y = newY;
      if (ref.current) {
        ref.current.style.width     = `${newW}px`;
        ref.current.style.height    = `${newH}px`;
        ref.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      onResize(table.id, live.w, live.h, live.x, live.y);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const statusClass = `ops-tbl--${table.status}`;
  const shapeClass  = `ops-tbl--${table.shape}`;
  const alertClass  = overTime ? 'ops-tbl--alert' : '';

  return (
    <div
      ref={ref}
      className={['ops-tbl', shapeClass, statusClass, alertClass].filter(Boolean).join(' ')}
      style={{
        transform: `translate(${table.x}px, ${table.y}px)`,
        ...(table.w != null ? { width:  `${table.w}px` } : {}),
        ...(table.h != null ? { height: `${table.h}px` } : {}),
      }}
      onMouseDown={handleMouseDown}
      title={`${table.label} · ${STATUS_LABEL[table.status]}${elapsed ? ` · ${elapsed}` : ''}`}
    >
      <span className="ops-tbl-label">{table.label}</span>
      {table.capacity > 0 && <span className="ops-tbl-cap">{table.capacity}p</span>}
      {elapsed && <span className="ops-tbl-time">{elapsed}</span>}
      {overTime && <span className="ops-tbl-overtime-icon">⏱</span>}
      <button
        className="ops-tbl-del"
        onClick={(e) => { e.stopPropagation(); onDelete(table.id); }}
        aria-label="Remove table"
      >✕</button>
      {/* Corner resize handles */}
      <div className="ops-resize-handle ops-resize-handle--nw" onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
      <div className="ops-resize-handle ops-resize-handle--ne" onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
      <div className="ops-resize-handle ops-resize-handle--sw" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
      <div className="ops-resize-handle ops-resize-handle--se" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function OperationsPage() {
  const { addActivity } = useActivity();
  const { tables, setTables, floorPlan, setFloorPlan } = useOperations();
  const [now, setNow]             = useState(Date.now());
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // Tick every 30 s so elapsed times & alerts stay fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── callbacks ──────────────────────────────────────────────────

  const handleToggle = useCallback((id: string) => {
    setTables((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, ...cycleStatus(t) };
      const msgs: Record<TableStatus, string> = {
        occupied:  `Table ${t.label} seated`,
        dirty:     `Table ${t.label} cleared — needs busing`,
        available: `Table ${t.label} cleaned and ready`,
      };
      addActivity(msgs[updated.status], 'operations');
      return updated;
    }));
  }, [addActivity]);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, x, y } : t));
  }, []);

  const handleResize = useCallback((id: string, w: number, h: number, x: number, y: number) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, w, h, x, y } : t));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAdd = (shape: TableShape, capacity: number) => {
    const canvas = canvasRef.current;
    const cw = canvas ? canvas.clientWidth  : 500;
    const ch = canvas ? canvas.clientHeight : 400;
    const jitter = () => (Math.random() - 0.5) * 100;
    const x = Math.max(10, Math.min(cw - 110, Math.round(cw / 2 - 40 + jitter())));
    const y = Math.max(10, Math.min(ch - 80,  Math.round(ch / 2 - 30 + jitter())));
    setTables((prev) => [
      ...prev,
      { id: newId(), label: nextLabel(prev), shape, capacity, x, y, status: 'available' as TableStatus, seatedAt: null },
    ]);
  };

  const handleFloorPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setFloorPlan(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── derived stats ──────────────────────────────────────────────

  const nonKitchen  = tables.filter((t) => t.shape !== 'kitchen');
  const occupied    = nonKitchen.filter((t) => t.status === 'occupied');
  const available   = nonKitchen.filter((t) => t.status === 'available');
  const dirty       = nonKitchen.filter((t) => t.status === 'dirty');
  const alerts      = occupied.filter((t) => isOverTurnTime(t.seatedAt, now));
  const capPct      = nonKitchen.length > 0 ? Math.round((occupied.length / nonKitchen.length) * 100) : 0;
  const isHighLoad  = capPct >= 75;

  // Bottleneck: sections where 3+ nearby occupied tables cluster
  // Simplified: flag if 2+ tables are occupied AND within 160px of each other
  const bottleneckIds = new Set<string>();
  for (let i = 0; i < occupied.length; i++) {
    for (let j = i + 1; j < occupied.length; j++) {
      const a = occupied[i], b = occupied[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 160) {
        bottleneckIds.add(a.id);
        bottleneckIds.add(b.id);
      }
    }
  }

  return (
    <div className="ops-wrapper">
      {/* ── Header ── */}
      <div className="ops-header">
        <h1 className="ops-title">Operations Center</h1>
        <div className="ops-header-right">
          {/* Capacity bar */}
          <div className="ops-capbar-wrap">
            <span className="ops-capbar-label">Capacity Load</span>
            <div className="ops-capbar">
              <div
                className={`ops-capbar-fill${isHighLoad ? ' ops-capbar-fill--high' : ''}`}
                style={{ width: `${capPct}%` }}
              />
            </div>
            <span className={`ops-capbar-pct${isHighLoad ? ' ops-capbar-pct--high' : ''}`}>{capPct}%</span>
          </div>
          {/* Stat pills */}
          <div className="ops-pills">
            <span className="ops-pill ops-pill--available">{available.length} Available</span>
            <span className="ops-pill ops-pill--occupied">{occupied.length} Occupied</span>
            <span className="ops-pill ops-pill--dirty">{dirty.length} Dirty</span>
            {alerts.length > 0 && (
              <span className="ops-pill ops-pill--alert">⏱ {alerts.length} Over 90 min</span>
            )}
            {bottleneckIds.size > 0 && (
              <span className="ops-pill ops-pill--bottleneck">🔥 Bottleneck</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="ops-body">
        {/* Sidebar */}
        <aside className="ops-sidebar">
          <p className="ops-sidebar-heading">ADD TABLE</p>
          <div className="ops-lib">
            {SHAPE_LIBRARY.map((def) => (
              <button
                key={def.shape}
                className={`ops-lib-btn ops-lib-btn--${def.shape}`}
                onClick={() => handleAdd(def.shape, def.capacity)}
                title={`Add ${def.desc}`}
              >
                <span className="ops-lib-icon">{def.icon}</span>
                <span className="ops-lib-desc">{def.desc}</span>
              </button>
            ))}
          </div>

          <div className="ops-divider" />

          <p className="ops-sidebar-heading">STATUS KEY</p>
          <div className="ops-legend">
            <div className="ops-legend-row"><span className="ops-dot ops-dot--available" />Available — click to seat</div>
            <div className="ops-legend-row"><span className="ops-dot ops-dot--occupied"  />Occupied — click when done</div>
            <div className="ops-legend-row"><span className="ops-dot ops-dot--dirty"     />Needs Busing — click when clean</div>
            <div className="ops-legend-row"><span className="ops-dot ops-dot--alert"     />⏱ Over 90 min (pulsing)</div>
          </div>

          <div className="ops-divider" />

          <p className="ops-sidebar-heading">FLOOR PLAN</p>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFloorPlan} />
          <button className="ops-upload-btn" onClick={() => fileRef.current?.click()}>
            📐 Upload Floor Plan
          </button>
          {floorPlan && (
            <button className="ops-upload-btn ops-upload-btn--clear" onClick={() => setFloorPlan(null)}>
              ✕ Clear Image
            </button>
          )}

          <p className="ops-hint">Drag tables to reposition. Click to cycle status.</p>
        </aside>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="ops-canvas"
          style={floorPlan ? {
            backgroundImage: `url(${floorPlan})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : {}}
        >
          {/* Grid overlay when no floor plan */}
          {!floorPlan && <div className="ops-grid" aria-hidden="true" />}

          {tables.map((table) => (
            <TableNode
              key={table.id}
              table={table}
              now={now}
              canvasRef={canvasRef}
              onToggle={handleToggle}
              onDragEnd={handleDragEnd}
              onResize={handleResize}
              onDelete={handleDelete}
            />
          ))}

          {tables.length === 0 && (
            <div className="ops-canvas-empty">
              Add tables from the sidebar to populate your floor plan.
            </div>
          )}

          {/* Turn-time alert banner */}
          {alerts.length > 0 && (
            <div className="ops-alert-banner">
              ⏱ {alerts.map((t) => t.label).join(', ')} — over {Math.round(TURN_TIME_ALERT_MS / 60000)} min
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
