import { useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  parseBudgetFile, loadBudgetEntries, saveBudgetEntries, clearBudgetEntries,
  totalSpend, totalsByCategory, formatMoney,
} from '../lib/budget';
import type { BudgetEntry } from '../lib/budget';
import './BudgetPage.css';

const ACCEPTED = '.xlsx,.xls,.csv,.ods,.tsv';

export default function BudgetPage() {
  const [entries, setEntries] = useState<BudgetEntry[]>(() => loadBudgetEntries());
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => totalsByCategory(entries), [entries]);
  const total = useMemo(() => totalSpend(entries), [entries]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setStatus('Reading spreadsheet…');
    try {
      const parsed: BudgetEntry[] = [];
      for (const file of Array.from(files)) {
        parsed.push(...(await parseBudgetFile(file)));
      }
      if (parsed.length === 0) {
        setStatus(null);
        setError("Couldn't find budget rows. Make sure the sheet has a header row with an amount/cost column.");
        return;
      }
      const next = [...entries, ...parsed];
      setEntries(next);
      saveBudgetEntries(next);
      setStatus(`Imported ${parsed.length} entries ✓`);
      setTimeout(() => setStatus(null), 4000);
    } catch {
      setStatus(null);
      setError("Couldn't read that file. Upload an Excel (.xlsx), CSV, or Google Sheets export.");
    }
  };

  const handleClear = () => {
    clearBudgetEntries();
    setEntries([]);
    setStatus(null);
    setError(null);
  };

  return (
    <div className="budget-page">
      <header className="dash-header">
        <div>
          <h1 className="dash-greeting">Budget</h1>
          <p className="dash-subtitle">Upload your expense sheets to track spending</p>
        </div>
        {entries.length > 0 && (
          <button className="budget-clear-btn" onClick={handleClear}>Clear data</button>
        )}
      </header>

      {/* Upload zone */}
      <div
        className={`budget-dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <span className="budget-dropzone-icon">📊</span>
        <p className="budget-dropzone-text">
          Drag &amp; drop your budget sheet here
          <br />
          <span className="budget-dropzone-hint">Excel (.xlsx), CSV, or a Google Sheets export</span>
        </p>
        <button className="budget-upload-btn" onClick={() => fileInputRef.current?.click()}>
          ⬆ Upload Spreadsheet
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          hidden
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        {status && <p className="budget-status">{status}</p>}
        {error && <p className="budget-error">{error}</p>}
      </div>

      {/* Format explainer — always shown, but moved below data when entries exist */}

      {entries.length > 0 && (
        <>
          {/* Summary stats */}
          <section className="stats-grid budget-stats">
            <div className="stat-card">
              <span className="stat-label">Total Spend</span>
              <span className="stat-value">{formatMoney(total)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Entries</span>
              <span className="stat-value">{entries.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Categories</span>
              <span className="stat-value">{categories.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Top Category</span>
              <span className="stat-value stat-value--small">{categories[0]?.category ?? '—'}</span>
            </div>
          </section>

          {/* Chart + table */}
          <div className="budget-panels">
            <section className="panel budget-chart-panel">
              <h2 className="panel-title">Spend by Category</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categories} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Tooltip formatter={(v) => formatMoney(Number(v))} />
                  <Bar dataKey="total" fill="#1a1a1e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="panel budget-table-panel">
              <h2 className="panel-title">Entries</h2>
              <div className="budget-table-scroll">
                <table className="budget-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td>{e.item}</td>
                        <td><span className="budget-cat-pill">{e.category}</span></td>
                        <td>{e.date ?? '—'}</td>
                        <td className="num">{formatMoney(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Format explainer – always at the bottom */}
      <div className="budget-format-help">
        <p className="budget-format-title">How your sheet is read</p>
        <p className="budget-format-text">
          The first row must be headers. We look for an <strong>item column</strong> (named item,
          name, description…), a <strong>category column</strong> (category, type, group…), an{' '}
          <strong>amount column</strong> (amount, cost, price, total…), and optionally a{' '}
          <strong>date column</strong>. Extra columns are ignored, rows without an amount are
          skipped, and every sheet in the workbook is scanned. For example:
        </p>
        <div className="budget-example-scroll">
          <table className="budget-example-table">
            <thead>
              <tr><th>Item</th><th>Category</th><th>Date</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr><td>Oat Milk</td><td>Dairy</td><td>2026-07-01</td><td>$1,240.50</td></tr>
              <tr><td>Chicken Breast</td><td>Meat</td><td>2026-07-02</td><td>$2,830</td></tr>
              <tr><td>Napkins</td><td>Supplies</td><td>2026-07-03</td><td>$190.25</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
