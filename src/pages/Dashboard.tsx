import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useActivity, formatTimeAgo } from '../context/ActivityContext';
import type { ActivityType } from '../context/ActivityContext';
import { useTodo } from '../context/TodoContext';
import ChartModal from '../components/ChartModal';
import InventoryPage from './InventoryPage';
import OperationsPage from './OperationsPage';
import StaffingPage from './StaffingPage';
import FeedbackPage from './FeedbackPage';
import AIAssistantPage from './AIAssistantPage';
import TodoPage from './TodoPage';
import './Dashboard.css';

type Tab = 'dashboard' | 'inventory' | 'operations' | 'calendar' | 'feedback' | 'ai-assistant' | 'todo';
type ChartType = 'revenue' | 'customers';

const stats = [
  { label: 'Total Revenue',    value: '$24,830', change: '+12.4%', up: true,  action: 'chart-revenue'   },
  { label: 'Active Customers', value: '1,284',   change: '+5.7%',  up: true,  action: 'chart-customers' },
  { label: 'Open Orders',      value: '38',       change: '-2.1%', up: false, action: 'tab-operations'  },
  { label: 'Staff On Shift',   value: '9',        change: '0%',    up: true,  action: 'tab-calendar'    },
];

const TYPE_ICON: Record<ActivityType, string> = {
  order:      '📦',
  payment:    '💳',
  staff:      '👤',
  alert:      '⚠️',
  customer:   '🙋',
  inventory:  '🥦',
  operations: '🪑',
  rush:       '🔥',
};

const navItems: { label: string; tab: Tab }[] = [
  { label: 'Dashboard',    tab: 'dashboard'    },
  { label: 'Task Board',   tab: 'todo'         },
  { label: 'Inventory',    tab: 'inventory'    },
  { label: 'Operations',   tab: 'operations'   },
  { label: 'Calendar',     tab: 'calendar'     },
  { label: 'Feedback',     tab: 'feedback'     },
  { label: 'AI Assistant', tab: 'ai-assistant' },
];

// ── New Order Modal ───────────────────────────────────────────────

let orderCounter = 1043;

interface NewOrderModalProps {
  onSave: (orderId: string, customer: string, items: string) => void;
  onClose: () => void;
}

function NewOrderModal({ onSave, onClose }: NewOrderModalProps) {
  const orderId  = `#${orderCounter}`;
  const [customer, setCustomer] = useState('');
  const [items,    setItems]    = useState('');
  const [error,    setError]    = useState('');
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) { setError('Customer name is required.'); return; }
    if (!items.trim())    { setError('Please enter at least one item.'); return; }
    orderCounter++;
    onSave(orderId, customer.trim(), items.trim());
  };

  return (
    <div className="dash-modal-backdrop" onClick={onClose}>
      <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
        <button className="dash-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 className="dash-modal-title">New Order</h2>
        <form className="dash-order-form" onSubmit={handleSubmit}>
          <div className="dash-order-field">
            <label className="dash-order-label">ORDER ID</label>
            <input className="dash-order-input dash-order-input--readonly" value={orderId} readOnly />
          </div>
          <div className="dash-order-field">
            <label className="dash-order-label">CUSTOMER NAME *</label>
            <input
              ref={firstRef}
              className="dash-order-input"
              type="text"
              placeholder="e.g. Jane Smith"
              value={customer}
              onChange={(e) => { setCustomer(e.target.value); setError(''); }}
            />
          </div>
          <div className="dash-order-field">
            <label className="dash-order-label">ITEMS ORDERED *</label>
            <textarea
              className="dash-order-textarea"
              placeholder="e.g. 2× Burger, 1× Caesar Salad, 3× Lemonade"
              value={items}
              rows={3}
              onChange={(e) => { setItems(e.target.value); setError(''); }}
            />
          </div>
          {error && <p className="dash-order-error">{error}</p>}
          <button className="dash-order-submit" type="submit">Place Order</button>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { activities, addActivity } = useActivity();
  const { addOrder } = useTodo();

  const [activeTab,      setActiveTab]      = useState<Tab>('dashboard');
  const [chartModal,     setChartModal]     = useState<ChartType | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Re-render every minute so "X min ago" timestamps stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleStatClick = (action: string) => {
    if (action === 'chart-revenue')        setChartModal('revenue');
    else if (action === 'chart-customers') setChartModal('customers');
    else if (action === 'tab-calendar')    setActiveTab('calendar');
    else if (action === 'tab-operations')  setActiveTab('operations');
  };

  const handleOrderSave = (orderId: string, customer: string, items: string) => {
    addActivity(`New order ${orderId} placed — ${customer} — ${items}`, 'order');
    addOrder(orderId, customer, items, 'manual');
    setShowOrderModal(false);
  };

  const renderMain = () => {
    if (activeTab === 'todo')         return <TodoPage onNavigate={(tab) => setActiveTab(tab as Tab)} />;
    if (activeTab === 'inventory')    return <InventoryPage />;
    if (activeTab === 'operations')   return <OperationsPage />;
    if (activeTab === 'calendar')     return <StaffingPage />;
    if (activeTab === 'feedback')     return <FeedbackPage />;
    if (activeTab === 'ai-assistant') return <AIAssistantPage />;

    return (
      <>
        {/* Header */}
        <header className="dash-header">
          <div>
            <h1 className="dash-greeting">Good morning 👋</h1>
            <p className="dash-subtitle">{user?.email ?? 'Welcome back'}</p>
          </div>
          <div className="dash-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </header>

        {/* Stats grid */}
        <section className="stats-grid">
          {stats.map((s) => (
            <div
              className="stat-card stat-card--clickable"
              key={s.label}
              onClick={() => handleStatClick(s.action)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStatClick(s.action)}
            >
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
              <span className={`stat-change ${s.up ? 'up' : 'down'}`}>{s.change} vs last week</span>
            </div>
          ))}
        </section>

        {/* Lower panels */}
        <div className="dash-panels">
          {/* Activity feed */}
          <section className="panel activity-panel">
            <h2 className="panel-title">Recent Activity</h2>
            <ul className="activity-list">
              {activities.slice(0, 12).map((item) => (
                <li className="activity-item" key={item.id}>
                  <span className="activity-icon">{TYPE_ICON[item.type] ?? '📌'}</span>
                  <span className="activity-text">{item.action}</span>
                  <span className="activity-time">{formatTimeAgo(item.timestamp)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick Actions */}
          <section className="panel quick-panel">
            <h2 className="panel-title">Quick Actions</h2>
            <div className="quick-grid">
              <button
                className="quick-btn quick-btn--primary"
                onClick={() => setShowOrderModal(true)}
              >📦 New Order</button>
              <button className="quick-btn quick-btn--primary" onClick={() => setActiveTab('todo')}>
                ✓ Task Board
              </button>
              <button className="quick-btn" onClick={() => setActiveTab('inventory')}>
                🥦 Update Stock
              </button>
              <button className="quick-btn" onClick={() => setActiveTab('calendar')}>
                📅 Schedule
              </button>
              
            </div>
          </section>
        </div>
      </>
    );
  };

  return (
    <div className="dash-wrapper">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="sidebar-logo">OperON</div>
        <nav className="sidebar-nav">
          {navItems.map(({ label, tab }) => (
            <button
              key={tab}
              className={`nav-item${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="sidebar-signout" onClick={handleSignOut}>Sign Out</button>
      </aside>

      {/* Main content */}
      <main className={`dash-main${activeTab === 'ai-assistant' ? ' dash-main--full' : ''}`}>
        {renderMain()}
      </main>

      {/* Chart modal */}
      {chartModal && (
        <ChartModal type={chartModal} onClose={() => setChartModal(null)} />
      )}

      {/* New Order modal */}
      {showOrderModal && (
        <NewOrderModal
          onSave={handleOrderSave}
          onClose={() => setShowOrderModal(false)}
        />
      )}
    </div>
  );
}
