import { useState, useRef } from 'react';
import { useTodo } from '../context/TodoContext';
import { useActivity, formatTimeAgo } from '../context/ActivityContext';
import type { OrderSource } from '../context/TodoContext';
import './OrdersPage.css';

// ── Constants ─────────────────────────────────────────────────────

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

const SOURCE_FILTERS: { value: OrderSource | 'all'; label: string }[] = [
  { value: 'all',      label: 'All Sources' },
  { value: 'manual',   label: 'In-House'    },
  { value: 'doordash', label: 'DoorDash'    },
  { value: 'ubereats', label: 'UberEats'    },
  { value: 'grubhub',  label: 'Grubhub'     },
  { value: 'online',   label: 'Online'      },
];

// ── Component ─────────────────────────────────────────────────────

export default function OrdersPage() {
  const { orders, addOrder, completeOrder, removeOrder } = useTodo();
  const { addActivity } = useActivity();

  const [sourceFilter, setSourceFilter] = useState<OrderSource | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [newCustomer,  setNewCustomer]  = useState('');
  const [newItems,     setNewItems]     = useState('');
  const [newSource,    setNewSource]    = useState<OrderSource>('manual');
  const customerRef = useRef<HTMLInputElement>(null);

  const pending   = orders.filter((o) => o.status === 'pending');
  const completed = orders.filter((o) => o.status === 'completed');

  const filtered = orders.filter((o) => {
    const matchSource = sourceFilter === 'all' || o.source === sourceFilter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSource && matchStatus;
  });

  const handleComplete = (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (order) {
      completeOrder(id);
      addActivity(`Order ${order.orderNumber} fulfilled — ${order.customer}`, 'order');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newItems.trim()) return;
    const orderNum = `#Q${Date.now().toString(36).slice(-4).toUpperCase()}`;
    addOrder(orderNum, newCustomer.trim(), newItems.trim(), newSource);
    addActivity(`New order ${orderNum} placed — ${newCustomer.trim()}`, 'order');
    setNewCustomer('');
    setNewItems('');
    setNewSource('manual');
    setShowAddForm(false);
  };

  const toggleForm = () => {
    setShowAddForm((v) => !v);
    if (!showAddForm) setTimeout(() => customerRef.current?.focus(), 50);
  };

  return (
    <div className="ord-wrapper">

      {/* ── Header ── */}
      <div className="ord-header">
        <div>
          <h1 className="ord-title">Orders</h1>
          <p className="ord-subtitle">
            <span className="ord-sub-pill ord-sub-pill--pending">{pending.length} pending</span>
            <span className="ord-sub-pill ord-sub-pill--done">{completed.length} completed</span>
            <span className="ord-sub-pill">{orders.length} total</span>
          </p>
        </div>
        <button className="ord-btn ord-btn--primary" onClick={toggleForm}>
          {showAddForm ? '✕ Cancel' : '+ New Order'}
        </button>
      </div>

      {/* ── Inline add form ── */}
      {showAddForm && (
        <form className="ord-add-form" onSubmit={handleSubmit}>
          <input
            ref={customerRef}
            className="ord-add-input"
            type="text"
            placeholder="Customer / table name"
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            required
          />
          <input
            className="ord-add-input"
            type="text"
            placeholder="Items (e.g. 2× Burger, 1× Salad)"
            value={newItems}
            onChange={(e) => setNewItems(e.target.value)}
            required
          />
          <select
            className="ord-add-select"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value as OrderSource)}
          >
            <option value="manual">In-House</option>
            <option value="doordash">DoorDash</option>
            <option value="ubereats">UberEats</option>
            <option value="grubhub">Grubhub</option>
            <option value="online">Online</option>
          </select>
          <button className="ord-btn ord-btn--primary" type="submit">Place Order</button>
        </form>
      )}

      {/* ── Filters ── */}
      <div className="ord-filters">
        <div className="ord-filter-group">
          {SOURCE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              className={`ord-filter-btn${sourceFilter === value ? ' active' : ''}`}
              onClick={() => setSourceFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ord-filter-group ord-filter-group--right">
          {(['all', 'pending', 'completed'] as const).map((s) => (
            <button
              key={s}
              className={`ord-filter-btn ord-filter-btn--status${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Orders list ── */}
      <div className="ord-list">
        {filtered.length === 0 ? (
          <div className="ord-empty">
            <span>✅</span>
            <span>No orders match the current filters.</span>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.id}
              className={`ord-row${order.status === 'completed' ? ' ord-row--done' : ''}`}
            >
              <div className="ord-row-body">
                <div className="ord-row-top">
                  <span className="ord-row-num">{order.orderNumber}</span>
                  <span className="ord-row-customer">{order.customer}</span>
                  <span className={`ord-source-tag ${SOURCE_CLASS[order.source]}`}>
                    {SOURCE_LABEL[order.source]}
                  </span>
                  {order.status === 'completed' && (
                    <span className="ord-completed-tag">✓ Completed</span>
                  )}
                </div>
                <div className="ord-row-items">{order.items}</div>
                <div className="ord-row-time">{formatTimeAgo(order.createdAt)}</div>
              </div>
              <div className="ord-row-actions">
                {order.status === 'pending' && (
                  <button
                    className="ord-action-btn ord-action-btn--complete"
                    onClick={() => handleComplete(order.id)}
                  >
                    ✓ Complete
                  </button>
                )}
                <button
                  className="ord-action-btn ord-action-btn--remove"
                  onClick={() => removeOrder(order.id)}
                  aria-label="Remove order"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
