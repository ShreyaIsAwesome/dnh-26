// ================================================================
// OperON – Budget: Types, Spreadsheet Parsing & Persistence
// ================================================================

import * as XLSX from 'xlsx';

export interface BudgetEntry {
  id: string;
  item: string;
  category: string;
  amount: number;
  date: string | null; // ISO date string when the sheet provides one
}

export interface CategoryTotal {
  category: string;
  total: number;
}

const STORAGE_KEY = 'operon-budget-entries';

// ── Spreadsheet parsing ───────────────────────────────────────────

const ITEM_HEADERS = ['item', 'name', 'description', 'expense', 'line item', 'detail'];
const CATEGORY_HEADERS = ['category', 'type', 'group', 'department'];
const AMOUNT_HEADERS = ['amount', 'cost', 'price', 'total', 'spend', 'value', 'budget'];
const DATE_HEADERS = ['date', 'day', 'month', 'period', 'when'];

export function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,€£\s]/g, '');
    const n = Number(cleaned);
    if (cleaned !== '' && Number.isFinite(n)) return n;
  }
  return null;
}

export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Parse an uploaded spreadsheet (.xlsx, .xls, .csv, or a Google Sheets
 * export) into budget entries. Column matching is fuzzy: any header
 * containing "item"/"name", "category", "amount"/"cost", "date" etc.
 * is picked up, so most restaurant budget sheets work as-is.
 */
export async function parseBudgetFile(file: File): Promise<BudgetEntry[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });
  const entries: BudgetEntry[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) continue;

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const itemCol = findColumn(headers, ITEM_HEADERS);
    const categoryCol = findColumn(headers, CATEGORY_HEADERS);
    const amountCol = findColumn(headers, AMOUNT_HEADERS);
    const dateCol = findColumn(headers, DATE_HEADERS);
    if (amountCol === -1) continue; // not a budget sheet

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const amount = toNumber(row[amountCol]);
      if (amount === null) continue;

      const item = itemCol !== -1 ? String(row[itemCol]).trim() : '';
      entries.push({
        id: `${sheetName}-${r}-${entries.length}`,
        item: item || `Row ${r + 1}`,
        category: categoryCol !== -1 && String(row[categoryCol]).trim()
          ? String(row[categoryCol]).trim()
          : 'Uncategorized',
        amount,
        date: dateCol !== -1 ? toIsoDate(row[dateCol]) : null,
      });
    }
  }

  return entries;
}

// ── Summaries ─────────────────────────────────────────────────────

export function totalSpend(entries: BudgetEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

export function totalsByCategory(entries: BudgetEntry[]): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// ── Persistence (local for now; swap for Supabase later) ──────────

export function loadBudgetEntries(): BudgetEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BudgetEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveBudgetEntries(entries: BudgetEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearBudgetEntries(): void {
  localStorage.removeItem(STORAGE_KEY);
}
