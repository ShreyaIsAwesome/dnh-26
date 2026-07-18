import { useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTodo } from '../context/TodoContext';
import { useActivity, formatTimeAgo } from '../context/ActivityContext';
import { checkRestock } from '../lib/inventory';
import type { OrderSource } from '../context/TodoContext';
import './TodoPage.css';

// ── Constants ────────────────────────────────────────────────────

const SOURCE_LABEL: Record<OrderSource, string> = {
  manual:   'In-House',
  doordash: 'DoorDash',
  ubereats: 'UberEats',
  grubhub:  'Grubhub',
  online:   'Online',
};

const SOURCE_CLASS: Record<OrderSource, string> = {
  manual:   'source-manual',
  doordash: 'source-doordash',
  ubereats: 'source-ubereats',
  grubhub:  'source-grubhub',
  online:   'source-online',
};

const DAILY_TASKS_SEED = [
  { id: 'd1', label: 'Check walk-in cooler & freezer temperatures',   done: false },
  { id: 'd2', label: 'Date and store all new deliveries',              done: false },
  { id: 'd3', label: 'Confirm shift roster is fully staffed',          done: false },
  { id: 'd4', label: 'Restock napkins, condiments & utensils',         done: false },
  { id: 'd5', label: 'Sanitize prep stations and cutting boards',      done: false },
  { id: 'd6', label: 'Verify POS system is running correctly',         done: false },
  { id: 'd7', label: 'Empty and clean the grease trap',                done: false },
  { id: 'd8', label: 'Count and log opening cash drawer',              done: false },
];

const DAILY_TASKS_KEY = 'operon-daily-tasks';

function loadDailyTasks() {
  try {
    const raw = localStorage.getItem(DAILY_TASKS_KEY);
    if (!raw) return DAILY_TASKS_SEED;
    return JSON.parse(raw) as typeof DAILY_TASKS_SEED;
  } catch {
    return DAILY_TASKS_SEED;
  }
}

// ── Props ────────────────────────────────────────────────────────

interface TodoPageProps {
  onNavigate: (tab: string) => void;
}

// ── Component ────────────────────────────────────────────────────

export default function TodoPage({ onNavigate: _onNavigate }: TodoPageProps) {
  const { items, deleteItem } = useInventory();
  const { orders, addOrder, completeOrder, removeOrder } = useTodo();
  const { addActivity } = useActivity();

  const [dailyTasks, setDailyTasks] = useState(loadDailyTasks);

  // Sync daily tasks to localStorage
  useEffect(() => {
    localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  // ── Acknowledged supply alerts ───────────────────────────────────
  const [checkedAlerts, setCheckedAlerts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('operon-checked-alerts') ?? '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('operon-checked-alerts', JSON.stringify(checkedAlerts));
  }, [checkedAlerts]);

  // ids being animated before removal
  const [fadingAlerts, setFadingAlerts] = useState<string[]>([]);

  // ── Add-order inline form ─────────────────────────────────────
  const [showAddOrder, setShowAddOrder]       = useState(false);
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderItems, setNewOrderItems]       = useState('');
  const [newOrderSource, setNewOrderSource]     = useState<OrderSource>('manual');
  const orderCustomerRef = useRef<HTMLInputElement>(null);

  // ── Add-task inline form ──────────────────────────────────────
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const taskInputRef = useRef<HTMLInputElement>(null);

  // ── Derived lists ─────────────────────────────────────────────
  const lowStockItems  = items.filter(
    (i) => checkRestock(i.quantity, i.minThreshold) && !checkedAlerts.includes(i.id)
  );
  const expiredItems   = items.filter((i) => i.status === 'Expired');
  const pendingOrders  = orders.filter((o) => o.status === 'pending');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const doneDailyCount = dailyTasks.filter((t) => t.done).length;

  // ── Handlers ──────────────────────────────────────────────────

  const handleCompleteOrder = (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (order) {
      completeOrder(id);
      addActivity(`Order ${order.orderNumber} fulfilled — ${order.customer}`, 'order');
    }
  };

  const handleDiscardExpired = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      deleteItem(itemId);
      addActivity(`Expired item discarded: ${item.name}`, 'inventory');
    }
  };

  const handleAcknowledgeRestock = (id: string) => {
    setFadingAlerts((prev) => [...prev, id]);
    setTimeout(() => {
      setCheckedAlerts((prev) => [...prev, id]);
      setFadingAlerts((prev) => prev.filter((x) => x !== id));
    }, 500);
  };

  const toggleDailyTask = (id: string) => {
    setDailyTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const resetDailyTasks = () => setDailyTasks((prev) => prev.map((t) => ({ ...t, done: false })));

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomer.trim() || !newOrderItems.trim()) return;
    const orderNum = `#Q${Date.now().toString(36).slice(-4).toUpperCase()}`;
    addOrder(orderNum, newOrderCustomer.trim(), newOrderItems.trim(), newOrderSource);
    addActivity(`New order ${orderNum} added — ${newOrderCustomer.trim()}`, 'order');
    setNewOrderCustomer('');
    setNewOrderItems('');
    setNewOrderSource('manual');
    setShowAddOrder(false);
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    const id = `custom-${Date.now().toString(36)}`;
    setDailyTasks((prev) => [...prev, { id, label: newTaskLabel.trim(), done: false }]);
    setNewTaskLabel('');
    setShowAddTask(false);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="todo-wrapper">

      {/* ── Page Header ── */}
      <div className="todo-header">
        <div>
          <h1 className="todo-title">Task Board</h1>
          <p className="todo-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="todo-header-badges">
          {lowStockItems.length  > 0 && <span className="todo-badge badge-stock">⚠️ {lowStockItems.length} Low Stock</span>}
          {expiredItems.length   > 0 && <span className="todo-badge badge-waste">🗑️ {expiredItems.length} Expired</span>}
          {pendingOrders.length  > 0 && <span className="todo-badge badge-order">📦 {pendingOrders.length} Pending</span>}
        </div>
      </div>

      {/* ── 2×2 Grid ── */}
      <div className="todo-grid">

        {/* ────────────────────────────────────────────────────────
            SECTION 1 — Supply Alerts (low stock)
        ──────────────────────────────────────────────────────── */}
        <section className="todo-card todo-card--supply">
          <div className="todo-card-head">
            <div className="todo-card-title-row">
              <span className="todo-card-icon">⚠️</span>
              <h2 className="todo-card-title">Supply Alerts</h2>
              <span className={`todo-count-pill ${lowStockItems.length > 0 ? 'pill-warn' : 'pill-ok'}`}>
                {lowStockItems.length}
              </span>
            </div>
            <p className="todo-card-desc">
              Items below minimum threshold. Restock to clear.
            </p>
          </div>

          <div className="todo-list">
            {lowStockItems.length === 0 ? (
              <div className="todo-empty">
                <span>✅</span><span>All stock levels are healthy!</span>
              </div>
            ) : (
              lowStockItems.map((item) => {
                const pct = Math.min(100, (item.quantity / item.minThreshold) * 100);
                return (
                  <div className="todo-row todo-row--supply" key={item.id}>
                    <div className="todo-row-body">
                      <span className="todo-row-name">{item.name}</span>
                      <span className="todo-row-meta">
                        {item.quantity} / {item.minThreshold} {item.unit} · {item.category}
                      </span>
                      <div className="todo-bar">
                        <div className="todo-bar-fill todo-bar-fill--warn" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button
                      className={`todo-btn btn-restock${fadingAlerts.includes(item.id) ? ' btn-checked' : ''}`}
                      onClick={() => handleAcknowledgeRestock(item.id)}
                      disabled={fadingAlerts.includes(item.id)}
                    >
                      {fadingAlerts.includes(item.id) ? '✓ Done' : '+ Restock'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────
            SECTION 2 — Waste Management (expired)
        ──────────────────────────────────────────────────────── */}
        <section className="todo-card todo-card--waste">
          <div className="todo-card-head">
            <div className="todo-card-title-row">
              <span className="todo-card-icon">🗑️</span>
              <h2 className="todo-card-title">Waste Management</h2>
              <span className={`todo-count-pill ${expiredItems.length > 0 ? 'pill-danger' : 'pill-ok'}`}>
                {expiredItems.length}
              </span>
            </div>
            <p className="todo-card-desc">
              Expired items in inventory. Discard to clear.
            </p>
          </div>

          <div className="todo-list">
            {expiredItems.length === 0 ? (
              <div className="todo-empty">
                <span>✅</span><span>No expired items — great job!</span>
              </div>
            ) : (
              expiredItems.map((item) => (
                <div className="todo-row todo-row--expired" key={item.id}>
                  <div className="todo-row-body">
                    <span className="todo-row-name">{item.name}</span>
                    <span className="todo-row-meta">
                      Expired {new Date(item.expiryDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })} · {item.storageLocation}
                    </span>
                  </div>
                  <button
                    className="todo-btn btn-discard"
                    onClick={() => handleDiscardExpired(item.id)}
                  >
                    Discard ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────
            SECTION 3 — Active Orders
        ──────────────────────────────────────────────────────── */}
        <section className="todo-card todo-card--orders">
          <div className="todo-card-head">
            <div className="todo-card-title-row">
              <span className="todo-card-icon">📦</span>
              <h2 className="todo-card-title">Active Orders</h2>
              <span className={`todo-count-pill ${pendingOrders.length > 0 ? 'pill-blue' : 'pill-ok'}`}>
                {pendingOrders.length}
              </span>
              <button
                className="todo-add-btn"
                onClick={() => { setShowAddOrder((v) => !v); setTimeout(() => orderCustomerRef.current?.focus(), 50); }}
                aria-label="Add order"
              >
                {showAddOrder ? '✕' : '+'}
              </button>
            </div>
            <p className="todo-card-desc">
              In-house &amp; online orders pending fulfillment.
            </p>
          </div>

          <div className="todo-list">
            {pendingOrders.length === 0 ? (
              <div className="todo-empty">
                <span>✅</span><span>All caught up — no pending orders!</span>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div className="todo-row todo-row--order" key={order.id}>
                  <div className="todo-row-body">
                    <div className="todo-order-top">
                      <span className="todo-row-name">{order.orderNumber} — {order.customer}</span>
                      <span className={`todo-source-tag ${SOURCE_CLASS[order.source]}`}>
                        {SOURCE_LABEL[order.source]}
                      </span>
                    </div>
                    <span className="todo-row-meta">{order.items}</span>
                    <span className="todo-row-time">{formatTimeAgo(order.createdAt)}</span>
                  </div>
                  <div className="todo-order-btns">
                    <button
                      className="todo-btn btn-done"
                      onClick={() => handleCompleteOrder(order.id)}
                    >
                      ✓ Done
                    </button>
                    <button
                      className="todo-btn btn-remove"
                      onClick={() => removeOrder(order.id)}
                      aria-label="Remove order"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
            {completedOrders.length > 0 && (
              <div className="todo-completed-tally">
                ✓ {completedOrders.length} order{completedOrders.length !== 1 ? 's' : ''} completed this session
              </div>
            )}
            {showAddOrder && (
              <form className="todo-inline-form" onSubmit={handleSubmitOrder}>
                <input
                  ref={orderCustomerRef}
                  className="todo-inline-input"
                  type="text"
                  placeholder="Customer / table name"
                  value={newOrderCustomer}
                  onChange={(e) => setNewOrderCustomer(e.target.value)}
                  required
                />
                <input
                  className="todo-inline-input"
                  type="text"
                  placeholder="Items (e.g. 2× Burger, 1× Salad)"
                  value={newOrderItems}
                  onChange={(e) => setNewOrderItems(e.target.value)}
                  required
                />
                <div className="todo-inline-row">
                  <select
                    className="todo-inline-select"
                    value={newOrderSource}
                    onChange={(e) => setNewOrderSource(e.target.value as OrderSource)}
                  >
                    <option value="manual">In-House</option>
                    <option value="doordash">DoorDash</option>
                    <option value="ubereats">UberEats</option>
                    <option value="grubhub">Grubhub</option>
                    <option value="online">Online</option>
                  </select>
                  <button className="todo-btn btn-done" type="submit">Add Order</button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────
            SECTION 4 — Daily Maintenance Checklist
        ──────────────────────────────────────────────────────── */}
        <section className="todo-card todo-card--daily">
          <div className="todo-card-head">
            <div className="todo-card-title-row">
              <span className="todo-card-icon">📋</span>
              <h2 className="todo-card-title">Daily Checklist</h2>
              <span className={`todo-count-pill ${doneDailyCount === dailyTasks.length ? 'pill-ok' : 'pill-blue'}`}>
                {doneDailyCount}/{dailyTasks.length}
              </span>
              <button
                className="todo-add-btn"
                onClick={() => { setShowAddTask((v) => !v); setTimeout(() => taskInputRef.current?.focus(), 50); }}
                aria-label="Add task"
              >
                {showAddTask ? '✕' : '+'}
              </button>
            </div>
            <div className="todo-card-desc-row">
              <p className="todo-card-desc">Standard opening / operations tasks.</p>
              <button className="todo-reset-link" onClick={resetDailyTasks}>Reset</button>
            </div>
          </div>

          <div className="todo-list">
            {dailyTasks.map((task) => (
              <div
                key={task.id}
                className={`todo-row todo-row--daily${task.done ? ' done' : ''}`}
                onClick={() => toggleDailyTask(task.id)}
                role="checkbox"
                aria-checked={task.done}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleDailyTask(task.id)}
              >
                <span className={`todo-checkbox${task.done ? ' checked' : ''}`}>
                  {task.done ? '✓' : ''}
                </span>
                <span className="todo-row-label">{task.label}</span>
                <button
                  className="todo-task-delete"
                  onClick={(e) => { e.stopPropagation(); setDailyTasks((prev) => prev.filter((t) => t.id !== task.id)); }}
                  aria-label="Remove task"
                >
                  ×
                </button>
              </div>
            ))}
            {showAddTask && (
              <form className="todo-inline-form" onSubmit={handleSubmitTask}>
                <div className="todo-inline-row">
                  <input
                    ref={taskInputRef}
                    className="todo-inline-input"
                    type="text"
                    placeholder="New task description…"
                    value={newTaskLabel}
                    onChange={(e) => setNewTaskLabel(e.target.value)}
                    required
                  />
                  <button className="todo-btn btn-done" type="submit">Add</button>
                </div>
              </form>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
