import { useState, useRef, useEffect, useCallback } from 'react';
import type { InventoryItem, Category, Status } from '../lib/inventory';
import {
  calculateStatus, checkRestock, parseInvoice,
  seedInventory, CATEGORIES, STORAGE_LOCATIONS, UNITS,
} from '../lib/inventory';
import { searchIngredients } from '../lib/typesense';
import type { IngredientHit } from '../lib/typesense';
import { useActivity } from '../context/ActivityContext';
import './InventoryPage.css';

// ── helpers ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<Status, string> = {
  Expired: 'EXPIRED',
  Warning: 'EXPIRES SOON',
  Fresh:   'FRESH',
};

const STATUS_CLASS: Record<Status, string> = {
  Expired: 'status-expired',
  Warning: 'status-warning',
  Fresh:   'status-fresh',
};

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const BLANK_FORM = {
  name: '',
  category: 'Produce' as Category,
  quantity: '',
  unit: 'Lbs',
  expiryDate: '',
  storageLocation: 'Walk-in Cooler',
  minThreshold: '',
};

// ── component ─────────────────────────────────────────────────────

type View = 'vault' | 'burnlist';

export default function InventoryPage() {
  const { addActivity } = useActivity();
  const [items, setItems] = useState<InventoryItem[]>(seedInventory);
  const [view, setView] = useState<View>('vault');
  const [filterCat, setFilterCat] = useState<Category | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Typesense autocomplete ────────────────────────────────────
  const [suggestions, setSuggestions] = useState<IngredientHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      const hits = await searchIngredients(query);
      setSuggestions(hits);
      setShowSuggestions(hits.length > 0);
      setActiveSuggestion(-1);
    }, 200);
  }, []);

  const selectSuggestion = (hit: IngredientHit) => {
    setForm((f) => ({
      ...f,
      name:     hit.name,
      category: (hit.category as Category) ?? f.category,
      unit:     hit.unit ?? f.unit,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (nameInputRef.current && !nameInputRef.current.closest('.inv-autocomplete-wrapper')?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-alerts: low stock & expiring ────────────────────────
  const alertedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    items.forEach((item) => {
      const lowKey     = `low-${item.id}`;
      const expKey     = `exp-${item.id}`;
      const isLow      = checkRestock(item.quantity, item.minThreshold);
      const isExpiring = item.status === 'Warning' || item.status === 'Expired';

      if (isLow && !alertedRef.current.has(lowKey)) {
        alertedRef.current.add(lowKey);
        addActivity(`Low stock: ${item.name} (${item.quantity} ${item.unit} remaining)`, 'alert');
      }
      if (isExpiring && !alertedRef.current.has(expKey)) {
        alertedRef.current.add(expKey);
        const label = item.status === 'Expired' ? 'Expired' : 'Expiring soon';
        addActivity(
          `${label}: ${item.name} — ${new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          'alert',
        );
      }
    });
  // We intentionally only want this to fire when items changes, addActivity is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── derived lists ─────────────────────────────────────────────

  const restockAlerts = items.filter((i) => checkRestock(i.quantity, i.minThreshold));

  const displayItems = (() => {
    let list = items;
    if (view === 'burnlist') {
      list = [...list].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    }
    if (filterCat !== 'All') list = list.filter((i) => i.category === filterCat);
    if (filterStatus !== 'All') list = list.filter((i) => i.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.storageLocation.toLowerCase().includes(q));
    }
    return list;
  })();

  const counts = {
    expired: items.filter((i) => i.status === 'Expired').length,
    warning: items.filter((i) => i.status === 'Warning').length,
    fresh:   items.filter((i) => i.status === 'Fresh').length,
  };

  // ── handlers ──────────────────────────────────────────────────

  const handleFormChange = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expiryDate) { setFormError('Expiry date is required.'); return; }
    if (!form.name.trim()) { setFormError('Ingredient name is required.'); return; }
    const qty = parseFloat(form.quantity);
    const thresh = parseFloat(form.minThreshold);
    if (isNaN(qty) || qty < 0) { setFormError('Enter a valid quantity.'); return; }

    const newItem: InventoryItem = {
      id: newId(),
      name: form.name.trim(),
      category: form.category,
      quantity: qty,
      unit: form.unit,
      expiryDate: form.expiryDate,
      storageLocation: form.storageLocation,
      minThreshold: isNaN(thresh) ? 0 : thresh,
      status: calculateStatus(form.expiryDate),
    };

    setItems((prev) => [newItem, ...prev]);
    addActivity(`Inventory added: ${newItem.name} (${newItem.quantity} ${newItem.unit})`, 'inventory');
    // Auto-alert if already below threshold
    if (checkRestock(newItem.quantity, newItem.minThreshold)) {
      addActivity(`Low stock alert: ${newItem.name}`, 'alert');
    }
    setForm(BLANK_FORM);
    setFormError('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (target) addActivity(`Inventory removed: ${target.name}`, 'inventory');
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleOCRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrError('');

    // Mock OCR — in production swap with a real vision/OCR API call
    setTimeout(() => {
      const mockExtracted = `Whole Milk, 10, Cases, ${new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}, Dairy\nChicken Thighs, 20, Lbs, ${new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)}, Meat\nOlive Oil, 6, Boxes, ${new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)}, Dry`;
      const parsed = parseInvoice(mockExtracted);
      const newItems: InventoryItem[] = parsed.map((p) => ({
        ...p,
        id: newId(),
        storageLocation: 'Walk-in Cooler',
        minThreshold: 2,
        status: calculateStatus(p.expiryDate),
      }));
      setItems((prev) => [...newItems, ...prev]);
      addActivity(`Invoice scanned: ${newItems.length} item${newItems.length !== 1 ? 's' : ''} added`, 'inventory');
      setOcrLoading(false);
    }, 1800);

    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  // ── render ────────────────────────────────────────────────────

  return (
    <div className="inv-wrapper">
      {/* ── Top bar ── */}
      <div className="inv-topbar">
        <div className="inv-title-row">
          <h1 className="inv-title">Inventory Vault</h1>
          <div className="inv-top-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={handleOCRUpload}
            />
            <button
              className="inv-btn inv-btn--secondary"
              onClick={() => fileRef.current?.click()}
              disabled={ocrLoading}
            >
              {ocrLoading ? '⏳ Scanning...' : '📷 Upload Invoice'}
            </button>
            <button
              className="inv-btn inv-btn--primary"
              onClick={() => { setShowForm(true); setFormError(''); }}
            >
              + Manual Add
            </button>
          </div>
        </div>
        {ocrError && <p className="inv-ocr-error">{ocrError}</p>}

        {/* Status summary pills */}
        <div className="inv-summary">
          <button
            className={`summary-pill pill-expired${filterStatus === 'Expired' ? ' active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'Expired' ? 'All' : 'Expired')}
          >
            🔴 {counts.expired} Expired
          </button>
          <button
            className={`summary-pill pill-warning${filterStatus === 'Warning' ? ' active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'Warning' ? 'All' : 'Warning')}
          >
            🟠 {counts.warning} Expires Soon
          </button>
          <button
            className={`summary-pill pill-fresh${filterStatus === 'Fresh' ? ' active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'Fresh' ? 'All' : 'Fresh')}
          >
            🟢 {counts.fresh} Fresh
          </button>
          {restockAlerts.length > 0 && (
            <span className="summary-pill pill-restock">
              ⚠️ {restockAlerts.length} Low Stock
            </span>
          )}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="inv-controls">
        <div className="view-toggle">
          <button
            className={`view-btn${view === 'vault' ? ' active' : ''}`}
            onClick={() => setView('vault')}
          >All Items</button>
          <button
            className={`view-btn${view === 'burnlist' ? ' active' : ''}`}
            onClick={() => setView('burnlist')}
          >🔥 Burn List</button>
        </div>

        <input
          className="inv-search"
          type="search"
          placeholder="Search ingredient or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="inv-select"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as Category | 'All')}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Burn list header ── */}
      {view === 'burnlist' && (
        <div className="burnlist-banner">
          🔥 <strong>Burn List</strong> — sorted by nearest expiry. Use these first.
        </div>
      )}

      {/* ── Item list ── */}
      <div className="inv-list">
        {displayItems.length === 0 && (
          <div className="inv-empty">No items match your filters.</div>
        )}
        {displayItems.map((item) => (
          <div className={`inv-row inv-row--${item.status.toLowerCase()}`} key={item.id}>
            <div className={`inv-status-bar ${STATUS_CLASS[item.status]}`} />

            <div className="inv-row-main">
              <div className="inv-row-name">
                <span className="inv-name">{item.name}</span>
                <span className="inv-category">{item.category}</span>
              </div>
              <div className="inv-row-meta">
                <span className="inv-meta-item">
                  <span className="inv-meta-label">QTY</span>
                  {item.quantity} {item.unit}
                  {checkRestock(item.quantity, item.minThreshold) && (
                    <span className="restock-badge">LOW</span>
                  )}
                </span>
                <span className="inv-meta-item">
                  <span className="inv-meta-label">EXPIRES</span>
                  {new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="inv-meta-item">
                  <span className="inv-meta-label">LOCATION</span>
                  {item.storageLocation}
                </span>
                <span className={`inv-status-badge ${STATUS_CLASS[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            </div>

            <button className="inv-delete" onClick={() => handleDelete(item.id)} aria-label="Delete item">✕</button>
          </div>
        ))}
      </div>

      {/* ── Manual Add Modal ── */}
      {showForm && (
        <div className="inv-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <button className="inv-modal-close" onClick={() => setShowForm(false)} aria-label="Close">✕</button>
            <h2 className="inv-modal-title">Add Inventory Item</h2>

            <form className="inv-form" onSubmit={handleAddItem}>
              <div className="inv-form-row">
                <div className="inv-field">
                  <label className="inv-label">INGREDIENT NAME *</label>
                  <div className="inv-autocomplete-wrapper">
                    <input
                      ref={nameInputRef}
                      className="inv-input"
                      type="text"
                      value={form.name}
                      autoComplete="off"
                      onChange={(e) => {
                        handleFormChange('name', e.target.value);
                        fetchSuggestions(e.target.value);
                      }}
                      onKeyDown={handleNameKeyDown}
                      onFocus={() => form.name.trim() && suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Start typing to search…"
                      required
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="inv-suggestions">
                        {suggestions.map((hit, i) => (
                          <li
                            key={hit.id}
                            className={`inv-suggestion-item${i === activeSuggestion ? ' active' : ''}`}
                            onMouseDown={() => selectSuggestion(hit)}
                          >
                            <span className="inv-suggestion-name">{hit.name}</span>
                            <span className="inv-suggestion-meta">{hit.category}{hit.unit ? ` · ${hit.unit}` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="inv-field">
                  <label className="inv-label">CATEGORY</label>
                  <select className="inv-input" value={form.category} onChange={(e) => handleFormChange('category', e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-field inv-field--sm">
                  <label className="inv-label">QUANTITY</label>
                  <input className="inv-input" type="number" min="0" step="0.1" value={form.quantity} onChange={(e) => handleFormChange('quantity', e.target.value)} required />
                </div>
                <div className="inv-field inv-field--sm">
                  <label className="inv-label">UNIT</label>
                  <select className="inv-input" value={form.unit} onChange={(e) => handleFormChange('unit', e.target.value)}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="inv-field inv-field--sm">
                  <label className="inv-label">MIN THRESHOLD</label>
                  <input className="inv-input" type="number" min="0" step="0.1" value={form.minThreshold} onChange={(e) => handleFormChange('minThreshold', e.target.value)} />
                </div>
              </div>

              <div className="inv-form-row">
                <div className="inv-field">
                  <label className="inv-label">EXPIRY DATE *</label>
                  <input className="inv-input" type="date" value={form.expiryDate} onChange={(e) => handleFormChange('expiryDate', e.target.value)} required />
                </div>
                <div className="inv-field">
                  <label className="inv-label">STORAGE LOCATION</label>
                  <select className="inv-input" value={form.storageLocation} onChange={(e) => handleFormChange('storageLocation', e.target.value)}>
                    {STORAGE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {formError && <p className="inv-form-error">{formError}</p>}

              <button className="inv-btn inv-btn--primary inv-form-submit" type="submit">
                Add to Vault
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
