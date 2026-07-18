// ================================================================
// OperON – Chart Series: Spreadsheet Parsing & Persistence
// (revenue + active customers growth charts)
// ================================================================

import * as XLSX from 'xlsx';
import { findColumn, toNumber, toIsoDate } from './budget';

export interface RevenuePoint {
  week: string;  // x-axis label (period name or formatted date)
  value: number; // metric value for that period
}

export interface ParsedRevenue {
  points: RevenuePoint[];
  /** Original header names we matched, so the user can see how the sheet was read. */
  labelHeader: string | null;
  valueHeader: string | null;
}

const LABEL_HEADERS = ['week', 'month', 'period', 'date', 'day', 'quarter', 'year'];
const REVENUE_VALUE_HEADERS = ['revenue', 'sales', 'income', 'earnings', 'amount', 'total', 'value'];
const CUSTOMER_VALUE_HEADERS = ['customers', 'customer', 'count', 'visitors', 'guests', 'covers', 'active', 'total', 'value'];

const REVENUE_STORAGE_KEY = 'operon-revenue-data';
const CUSTOMER_STORAGE_KEY = 'operon-customers-data';

/**
 * Parse an uploaded spreadsheet into chart points. Looks for a value
 * column (from `valueHeaders`) and a label column (week/month/date/…).
 * Rows sharing a label are summed, so both weekly summaries and raw
 * per-visit dumps plot sensibly. When labels are dates the points are
 * sorted chronologically.
 */
async function parseSeriesFile(file: File, valueHeaders: string[]): Promise<ParsedRevenue> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });

  const totals = new Map<string, { value: number; iso: string | null; order: number }>();
  let labelHeader: string | null = null;
  let valueHeader: string | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) continue;

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const valueCol = findColumn(headers, valueHeaders);
    const labelCol = findColumn(headers, LABEL_HEADERS);
    if (valueCol === -1) continue; // no matching value column on this sheet

    if (valueHeader === null) {
      valueHeader = String(rows[0][valueCol]).trim();
      labelHeader = labelCol !== -1 ? String(rows[0][labelCol]).trim() : null;
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const value = toNumber(row[valueCol]);
      if (value === null) continue;

      const iso = labelCol !== -1 ? toIsoDate(row[labelCol]) : null;
      const rawLabel = labelCol !== -1 ? String(row[labelCol]).trim() : '';
      const label = iso
        ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : rawLabel || `P${totals.size + 1}`;

      const existing = totals.get(label);
      if (existing) {
        existing.value += value;
      } else {
        totals.set(label, { value, iso, order: totals.size });
      }
    }
  }

  const points = [...totals.entries()];
  const allDated = points.length > 0 && points.every(([, p]) => p.iso !== null);
  points.sort((a, b) =>
    allDated ? a[1].iso!.localeCompare(b[1].iso!) : a[1].order - b[1].order,
  );

  return {
    points: points.map(([week, p]) => ({ week, value: p.value })),
    labelHeader,
    valueHeader,
  };
}

export function parseRevenueFile(file: File): Promise<ParsedRevenue> {
  return parseSeriesFile(file, REVENUE_VALUE_HEADERS);
}

export function parseCustomerFile(file: File): Promise<ParsedRevenue> {
  return parseSeriesFile(file, CUSTOMER_VALUE_HEADERS);
}

// ── Persistence (local for now; swap for Supabase later) ──────────

function loadSeries(key: string): RevenuePoint[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as RevenuePoint[]) : [];
  } catch {
    return [];
  }
}

export function loadRevenueData(): RevenuePoint[] {
  return loadSeries(REVENUE_STORAGE_KEY);
}

export function saveRevenueData(points: RevenuePoint[]): void {
  localStorage.setItem(REVENUE_STORAGE_KEY, JSON.stringify(points));
}

export function clearRevenueData(): void {
  localStorage.removeItem(REVENUE_STORAGE_KEY);
}

export function loadCustomerData(): RevenuePoint[] {
  return loadSeries(CUSTOMER_STORAGE_KEY);
}

export function saveCustomerData(points: RevenuePoint[]): void {
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(points));
}

export function clearCustomerData(): void {
  localStorage.removeItem(CUSTOMER_STORAGE_KEY);
}
