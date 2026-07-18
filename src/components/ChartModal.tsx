import { useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  parseRevenueFile, loadRevenueData, saveRevenueData, clearRevenueData,
  parseCustomerFile, loadCustomerData, saveCustomerData, clearCustomerData,
} from '../lib/revenue';
import type { RevenuePoint, ParsedRevenue } from '../lib/revenue';
import './ChartModal.css';

const revenueData = [
  { week: 'W1', value: 18200 },
  { week: 'W2', value: 19500 },
  { week: 'W3', value: 17800 },
  { week: 'W4', value: 21000 },
  { week: 'W5', value: 20400 },
  { week: 'W6', value: 22100 },
  { week: 'W7', value: 23600 },
  { week: 'W8', value: 24830 },
];

const customerData = [
  { week: 'W1', value: 940 },
  { week: 'W2', value: 988 },
  { week: 'W3', value: 1020 },
  { week: 'W4', value: 1054 },
  { week: 'W5', value: 1103 },
  { week: 'W6', value: 1175 },
  { week: 'W7', value: 1230 },
  { week: 'W8', value: 1284 },
];

const config = {
  revenue: {
    title: 'Total Revenue Growth',
    data: revenueData,
    color: '#27ae60',
    label: 'Revenue ($)',
    format: (v: number) => `$${v.toLocaleString()}`,
    noun: 'Revenue',
    sheetName: 'revenue sheet',
    columnsHint: 'revenue, sales, income, amount, total…',
    exampleRows: [
      ['January', '$31,200'],
      ['February', '$29,800'],
    ],
    summaryStat: 'sum' as const,
    parse: parseRevenueFile,
    load: loadRevenueData,
    save: saveRevenueData,
    clear: clearRevenueData,
  },
  customers: {
    title: 'Active Customers Growth',
    data: customerData,
    color: '#3b82f6',
    label: 'Customers',
    format: (v: number) => v.toLocaleString(),
    noun: 'Customers',
    sheetName: 'customer sheet',
    columnsHint: 'customers, count, visitors, guests, covers…',
    exampleRows: [
      ['January', '940'],
      ['February', '1,020'],
    ],
    summaryStat: 'last' as const,
    parse: parseCustomerFile,
    load: loadCustomerData,
    save: saveCustomerData,
    clear: clearCustomerData,
  },
};

interface ChartModalProps {
  type: 'revenue' | 'customers';
  onClose: () => void;
}

export default function ChartModal({ type, onClose }: ChartModalProps) {
  const cfg = config[type];
  const { title, data: sampleData, color, format } = cfg;
  const [uploaded, setUploaded] = useState<RevenuePoint[]>(() => cfg.load());
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<ParsedRevenue | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usingUploaded = uploaded.length > 0;
  const data = usingUploaded ? uploaded : sampleData;

  const handleFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      const parsed = await cfg.parse(files[0]);
      if (parsed.points.length === 0) {
        setError(`Couldn't find ${cfg.noun.toLowerCase()} rows — the sheet needs a header row with a column like ${cfg.columnsHint}`);
        return;
      }
      setPending(parsed);
    } catch {
      setError("Couldn't read that file. Upload an Excel (.xlsx), CSV, or Google Sheets export.");
    }
  };

  const handleConfirm = () => {
    if (!pending) return;
    cfg.save(pending.points);
    setUploaded(pending.points);
    setPending(null);
    setImporting(false);
  };

  const handleCancelImport = () => {
    setPending(null);
    setImporting(false);
    setError(null);
  };

  const handleReset = () => {
    cfg.clear();
    setUploaded([]);
    setError(null);
  };

  const pendingSummary = pending
    ? cfg.summaryStat === 'sum'
      ? { word: 'total', value: pending.points.reduce((sum, p) => sum + p.value, 0) }
      : { word: 'latest', value: pending.points[pending.points.length - 1].value }
    : null;

  const renderImport = () => (
    <div className="chart-import">
      {!pending ? (
        <>
          <div
            className={`chart-dropzone${dragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files); }}
          >
            <span className="chart-dropzone-icon">📈</span>
            <p className="chart-dropzone-text">
              Drag &amp; drop your {cfg.sheetName} here
              <br />
              <span className="chart-dropzone-hint">Excel (.xlsx), CSV, or a Google Sheets export</span>
            </p>
            <button className="chart-upload-btn" onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </button>
          </div>

          <div className="chart-format-help">
            <p className="chart-format-title">How your sheet is read</p>
            <p className="chart-format-text">
              The first row must be headers. We look for a <strong>period column</strong> (named
              week, month, date, period…) and a <strong>{cfg.noun.toLowerCase()} column</strong> (named{' '}
              {cfg.columnsHint}). Rows with the same period are added together, and
              dates are sorted oldest → newest. For example:
            </p>
            <table className="chart-example-table">
              <thead>
                <tr><th>Month</th><th>{cfg.noun}</th></tr>
              </thead>
              <tbody>
                {cfg.exampleRows.map(([month, value]) => (
                  <tr key={month}><td>{month}</td><td>{value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="chart-preview">
          <p className="chart-preview-summary">
            Read <strong>{pending.points.length} periods</strong> from column
            {' '}<span className="chart-col-pill">{pending.valueHeader}</span>
            {pending.labelHeader && (
              <> grouped by <span className="chart-col-pill">{pending.labelHeader}</span></>
            )}
            {' '}· {pendingSummary!.word} <strong>{format(Math.round(pendingSummary!.value))}</strong>
          </p>
          <div className="chart-preview-scroll">
            <table className="chart-example-table chart-preview-table">
              <thead>
                <tr><th>Period</th><th>{cfg.noun}</th></tr>
              </thead>
              <tbody>
                {pending.points.map((p) => (
                  <tr key={p.week}><td>{p.week}</td><td>{format(p.value)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-preview-question">Does this look right?</p>
        </div>
      )}

      {error && <p className="chart-error">{error}</p>}

      <div className="chart-import-actions">
        <button className="chart-reset-btn" onClick={handleCancelImport}>Cancel</button>
        {pending && (
          <>
            <button className="chart-reset-btn" onClick={() => { setPending(null); setError(null); }}>
              Pick another file
            </button>
            <button className="chart-upload-btn" onClick={handleConfirm}>✓ Use This Data</button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.ods,.tsv"
        hidden
        onChange={(e) => { handleFile(e.target.files); e.target.value = ''; }}
      />
    </div>
  );

  return (
    <div className="chart-backdrop" onClick={onClose}>
      <div className="chart-card" onClick={(e) => e.stopPropagation()}>
        <button className="chart-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 className="chart-title">{title}</h2>
        <div className="chart-subheader">
          <p className="chart-subtitle">
            {importing
              ? `Import ${cfg.noun.toLowerCase()} data`
              : usingUploaded
                ? `Your data · ${data.length} periods`
                : 'Last 8 weeks (sample data)'}
          </p>
          {!importing && (
            <div className="chart-actions">
              {usingUploaded && (
                <button className="chart-reset-btn" onClick={handleReset}>Use sample</button>
              )}
              <button className="chart-upload-btn" onClick={() => { setImporting(true); setError(null); }}>
                ⬆ Upload Data
              </button>
            </div>
          )}
        </div>
        {!importing && error && <p className="chart-error">{error}</p>}

        {importing ? renderImport() : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12, fill: '#aaa', fontFamily: 'Space Grotesk, sans-serif' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={format}
                tick={{ fontSize: 11, fill: '#aaa', fontFamily: 'Space Grotesk, sans-serif' }}
                axisLine={false}
                tickLine={false}
                width={74}
              />
              <Tooltip
                formatter={(value) => [format(Number(value)), title.split(' ')[0] + ' ' + title.split(' ')[1]]}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e8e8ec',
                  fontSize: '13px',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
