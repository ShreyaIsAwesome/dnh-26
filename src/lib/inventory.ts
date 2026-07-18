// ================================================================
// OperON – Inventory: Types, Logic & Seed Data
// ================================================================

export type Category = 'Dairy' | 'Produce' | 'Dry' | 'Meat' | 'Seafood' | 'Beverage' | 'Other';
export type Status = 'Expired' | 'Warning' | 'Fresh';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  expiryDate: string; // ISO date string  e.g. "2026-04-12"
  storageLocation: string;
  minThreshold: number;
  status: Status; // derived
}

// ── Core logic ────────────────────────────────────────────────────

export function calculateStatus(expiryDate: string): Status {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < now) return 'Expired';
  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilExpiry <= 48) return 'Warning';
  return 'Fresh';
}

export function checkRestock(quantity: number, minThreshold: number): boolean {
  return quantity < minThreshold;
}

/**
 * parseInvoice – mock OCR parser.
 * In production this would call a vision/OCR API.
 * Input: raw text extracted from invoice image.
 * Output: partial InventoryItem array (without id / storageLocation / minThreshold).
 */
export function parseInvoice(rawText: string): Omit<InventoryItem, 'id' | 'storageLocation' | 'minThreshold' | 'status'>[] {
  // Mock: parses lines like "Whole Milk, 10, Cases, 2026-04-20, Dairy"
  const lines = rawText.split('\n').filter(Boolean);
  return lines.map((line) => {
    const parts = line.split(',').map((p) => p.trim());
    const expiryRaw = parts[3] ?? new Date().toISOString().slice(0, 10);
    const category = (parts[4] as Category) ?? 'Other';
    return {
      name: parts[0] ?? 'Unknown Item',
      quantity: parseFloat(parts[1]) || 1,
      unit: parts[2] ?? 'Units',
      expiryDate: expiryRaw,
      category,
    };
  });
}

// ── Seed data ─────────────────────────────────────────────────────

const today = new Date();
const d = (offsetDays: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
};

const seed: Omit<InventoryItem, 'status'>[] = [
  { id: '1',  name: 'Whole Milk',       category: 'Dairy',    quantity: 4,  unit: 'Gallons', expiryDate: d(-1),  storageLocation: 'Walk-in Cooler',  minThreshold: 5  },
  { id: '2',  name: 'Heavy Cream',      category: 'Dairy',    quantity: 2,  unit: 'Quarts',  expiryDate: d(1),   storageLocation: 'Walk-in Cooler',  minThreshold: 3  },
  { id: '3',  name: 'Butter',           category: 'Dairy',    quantity: 6,  unit: 'Lbs',     expiryDate: d(10),  storageLocation: 'Walk-in Cooler',  minThreshold: 4  },
  { id: '4',  name: 'Roma Tomatoes',    category: 'Produce',  quantity: 3,  unit: 'Cases',   expiryDate: d(2),   storageLocation: 'Produce Rack',    minThreshold: 4  },
  { id: '5',  name: 'Baby Spinach',     category: 'Produce',  quantity: 2,  unit: 'Bags',    expiryDate: d(0),   storageLocation: 'Produce Rack',    minThreshold: 3  },
  { id: '6',  name: 'Yellow Onions',    category: 'Produce',  quantity: 10, unit: 'Lbs',     expiryDate: d(14),  storageLocation: 'Dry Shelf 1',     minThreshold: 5  },
  { id: '7',  name: 'Chicken Breast',   category: 'Meat',     quantity: 15, unit: 'Lbs',     expiryDate: d(1),   storageLocation: 'Walk-in Freezer', minThreshold: 10 },
  { id: '8',  name: 'Ground Beef',      category: 'Meat',     quantity: 8,  unit: 'Lbs',     expiryDate: d(-2),  storageLocation: 'Walk-in Freezer', minThreshold: 6  },
  { id: '9',  name: 'Atlantic Salmon',  category: 'Seafood',  quantity: 5,  unit: 'Lbs',     expiryDate: d(1),   storageLocation: 'Walk-in Cooler',  minThreshold: 4  },
  { id: '10', name: 'All-Purpose Flour',category: 'Dry',      quantity: 20, unit: 'Lbs',     expiryDate: d(60),  storageLocation: 'Dry Shelf 2',     minThreshold: 10 },
  { id: '11', name: 'Oat Milk',         category: 'Beverage', quantity: 2,  unit: 'Cases',   expiryDate: d(30),  storageLocation: 'Dry Shelf 3',     minThreshold: 4  },
  { id: '12', name: 'Garlic Cloves',    category: 'Produce',  quantity: 8,  unit: 'Heads',   expiryDate: d(21),  storageLocation: 'Produce Rack',    minThreshold: 5  },
];

export const seedInventory: InventoryItem[] = seed.map((item) => ({
  ...item,
  status: calculateStatus(item.expiryDate),
}));

export const CATEGORIES: Category[] = ['Dairy', 'Produce', 'Dry', 'Meat', 'Seafood', 'Beverage', 'Other'];

export const STORAGE_LOCATIONS = [
  'Walk-in Cooler',
  'Walk-in Freezer',
  'Produce Rack',
  'Dry Shelf 1',
  'Dry Shelf 2',
  'Dry Shelf 3',
  'Hot Hold',
  'Bar Fridge',
];

export const UNITS = ['Lbs', 'Kg', 'Gallons', 'Liters', 'Cases', 'Bags', 'Boxes', 'Units', 'Quarts', 'Oz', 'Heads'];
