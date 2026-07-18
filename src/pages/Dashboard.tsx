import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChartModal from '../components/ChartModal';
import InventoryPage from './InventoryPage';
import OperationsPage from './OperationsPage';
import StaffingPage from './StaffingPage';
import FeedbackPage from './FeedbackPage';
import AIAssistantPage from './AIAssistantPage';
import './Dashboard.css';

type Tab = 'dashboard' | 'inventory' | 'operations' | 'calendar' | 'feedback' | 'ai-assistant';
type ChartType = 'revenue' | 'customers';

const stats = [
  { label: 'Total Revenue', value: '$24,830', change: '+12.4%', up: true, action: 'chart-revenue' },
  { label: 'Active Customers', value: '1,284', change: '+5.7%', up: true, action: 'chart-customers' },
  { label: 'Open Orders', value: '38', change: '-2.1%', up: false, action: 'tab-operations' },
  { label: 'Staff On Shift', value: '9', change: '0%', up: true, action: 'tab-calendar' },
];

const recentActivity = [
  { id: 1, action: 'New order #1042 placed', time: '2 min ago', type: 'order' },
  { id: 2, action: 'Invoice #887 paid – $320.00', time: '14 min ago', type: 'payment' },
  { id: 3, action: 'Staff schedule updated for Fri', time: '1 hr ago', type: 'staff' },
  { id: 4, action: 'Low stock alert: Oat Milk', time: '2 hr ago', type: 'alert' },
  { id: 5, action: 'New customer registered', time: '3 hr ago', type: 'customer' },
  { id: 6, action: 'Order #1039 fulfilled', time: '4 hr ago', type: 'order' },
];

const typeIcon: Record<string, string> = {
  order: '📦',
  payment: '💳',
  staff: '👤',
  alert: '⚠️',
  customer: '🙋',
};

const navItems: { label: string; tab: Tab }[] = [
  { label: 'Dashboard', tab: 'dashboard' },
  { label: 'Inventory', tab: 'inventory' },
  { label: 'Operations', tab: 'operations' },
  { label: 'Calendar', tab: 'calendar' },
  { label: 'Feedback', tab: 'feedback' },
  { label: 'AI Assistant', tab: 'ai-assistant' },
];

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="tab-placeholder">
      <span className="tab-placeholder-icon">🚧</span>
      <h2>{label}</h2>
      <p>This section is coming soon.</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [chartModal, setChartModal] = useState<ChartType | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleStatClick = (action: string) => {
    if (action === 'chart-revenue') setChartModal('revenue');
    else if (action === 'chart-customers') setChartModal('customers');
    else if (action === 'tab-calendar') setActiveTab('calendar');
    else if (action === 'tab-operations') setActiveTab('operations');
  };

  const renderMain = () => {
    if (activeTab === 'inventory')  return <InventoryPage />;
    if (activeTab === 'operations') return <OperationsPage />;
    if (activeTab === 'calendar')      return <StaffingPage />;
    if (activeTab === 'feedback')      return <FeedbackPage />;
    if (activeTab === 'ai-assistant')  return <AIAssistantPage />;

    if (activeTab !== 'dashboard') {
      const label = navItems.find((n) => n.tab === activeTab)?.label ?? activeTab;
      return <TabPlaceholder label={label} />;
    }

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
          <section className="panel activity-panel">
            <h2 className="panel-title">Recent Activity</h2>
            <ul className="activity-list">
              {recentActivity.map((item) => (
                <li className="activity-item" key={item.id}>
                  <span className="activity-icon">{typeIcon[item.type]}</span>
                  <span className="activity-text">{item.action}</span>
                  <span className="activity-time">{item.time}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel quick-panel">
            <h2 className="panel-title">Quick Actions</h2>
            <div className="quick-grid">
              <button className="quick-btn">+ New Order</button>
              <button className="quick-btn">+ Add Customer</button>
              <button className="quick-btn">📋 View Reports</button>
              <button className="quick-btn">📦 Update Stock</button>
              <button className="quick-btn">📅 Manage Schedule</button>
              <button className="quick-btn">💬 Send Message</button>
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
    </div>
  );
}
