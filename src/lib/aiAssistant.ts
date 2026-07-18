// ================================================================
// OperON – AI Assistant Mock Brain
// ================================================================
// This module contains all response logic. When the real API is
// ready, swap out the mockRespond() function body.
//
// API_INTEGRATION_POINT – see bottom of file
// ================================================================

import { seedInventory, calculateStatus } from './inventory';
import { SEED_EMPLOYEES, SEED_RUSH_PERIODS, DAYS, formatHour } from './staffing';
import { MOCK_REVIEWS, computeSentiment } from './feedback';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface SuggestedQuestion {
  label: string;
  query: string;
  icon: string;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { label: 'Expiring soon',        query: 'What inventory is expiring in the next 48 hours?', icon: '⏰' },
  { label: 'Low stock',            query: 'What items need to be restocked?',                  icon: '📦' },
  { label: 'Friday staffing',      query: 'Are we overstaffed or understaffed for the Friday rush?', icon: '👥' },
  { label: 'Who works tonight?',   query: 'Who is working tonight?',                           icon: '🍽️' },
  { label: '1-star reviews',       query: 'Summarize the recent 1-star reviews.',              icon: '⭐' },
  { label: 'Sentiment summary',    query: 'What is the overall customer sentiment?',           icon: '🧠' },
  { label: 'Inventory status',     query: 'Give me a full inventory status report.',           icon: '📋' },
  { label: '86 the Ribeye',        query: 'I need to 86 the Ribeye.',                          icon: '🚫' },
  { label: 'Staff costs',          query: 'What is my total staffing cost this week?',         icon: '💰' },
  { label: 'Operations overview',  query: 'Give me a full operations overview.',               icon: '📊' },
];

// ── Helpers ──────────────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(isoDate);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - now.getTime()) / 86_400_000);
}

function todayDayIdx(): number {
  const d = new Date().getDay(); // 0 = Sun
  return d === 0 ? 6 : d - 1;   // Mon=0 … Sun=6
}

function staffForDay(dayIdx: number): typeof SEED_EMPLOYEES {
  return SEED_EMPLOYEES.filter(e => e.availability.some(a => a.day === dayIdx));
}

function rushesForDay(dayIdx: number) {
  return SEED_RUSH_PERIODS.filter(r => r.day === dayIdx);
}

// ── Intent matchers (simple keyword detection) ───────────────────

type Intent =
  | 'expiring'
  | 'restock'
  | 'staff_tonight'
  | 'staff_friday'
  | 'reviews_low'
  | 'sentiment'
  | 'inventory_full'
  | '86_item'
  | 'staff_cost'
  | 'ops_overview'
  | 'greeting'
  | 'unknown';

function detectIntent(q: string): Intent {
  const t = q.toLowerCase();
  if (/\b(86|eighty.?six|remove|pull|stop serving)\b/.test(t)) return '86_item';
  if (/\b(expir|spoil|going bad|48 hour|tomorrow)\b/.test(t))  return 'expiring';
  if (/\b(restock|low stock|running low|need more|order)\b/.test(t)) return 'restock';
  if (/\b(tonight|working tonight|on tonight|tonight'?s staff)\b/.test(t)) return 'staff_tonight';
  if (/\b(friday|fri).*(rush|staff|over|under)\b/.test(t))     return 'staff_friday';
  if (/\b(1.star|one.star|bad review|complaint|negative review)\b/.test(t)) return 'reviews_low';
  if (/\b(sentiment|opinion|vibe|overall|customer feel)\b/.test(t)) return 'sentiment';
  if (/\b(inventory|stock|supplies|pantry|full report)\b/.test(t)) return 'inventory_full';
  if (/\b(cost|wage|payroll|salary|rate|staffing cost)\b/.test(t)) return 'staff_cost';
  if (/\b(overview|summary|how are we|status|everything|operations)\b/.test(t)) return 'ops_overview';
  if (/\b(hello|hi|hey|good morning|good evening|how are you)\b/.test(t)) return 'greeting';
  return 'unknown';
}

// ── Response generators ──────────────────────────────────────────

function respondExpiring(): string {
  const items = seedInventory.filter(i => {
    const days = daysUntil(i.expiryDate);
    return days >= 0 && days <= 2;
  });
  if (items.length === 0) return 'Great news, Chef! Nothing in your inventory is expiring within the next 48 hours. You\'re in good shape.';
  const names = items.map(i => `**${i.name}** (${i.quantity} ${i.unit}, expires in ${daysUntil(i.expiryDate) === 0 ? 'today' : daysUntil(i.expiryDate) + 'd'})`).join(', ');
  return `⏰ **Expiring within 48 hours:** ${names}.\n\nI recommend featuring these in tonight's specials or a staff meal to avoid waste.`;
}

function respondRestock(): string {
  const items = seedInventory.filter(i => i.quantity < i.minThreshold);
  if (items.length === 0) return 'All inventory items are above their minimum thresholds. No restocking needed right now.';
  const lines = items.map(i => `• **${i.name}** — ${i.quantity} ${i.unit} (min: ${i.minThreshold})`).join('\n');
  return `📦 **Items that need restocking:**\n\n${lines}\n\nI suggest placing a supplier order today to avoid running out during service.`;
}

function respondStaffTonight(): string {
  const dayIdx = todayDayIdx();
  const staff  = staffForDay(dayIdx);
  const rushes = rushesForDay(dayIdx);
  if (staff.length === 0) return `I don't see anyone scheduled for ${DAYS[dayIdx]}. You may want to check the staffing calendar.`;
  const names = staff.map(e => `• **${e.name}** — ${e.role}`).join('\n');
  const rushNote = rushes.length
    ? `\n\nTonight's rush periods: ${rushes.map(r => `${r.label} (${formatHour(r.startHour)}–${formatHour(r.endHour)})`).join(', ')}.`
    : '';
  return `🍽️ **Staff on for ${DAYS[dayIdx]}:**\n\n${names}${rushNote}`;
}

function respondStaffFriday(): string {
  const friIdx = 4; // Friday = index 4 in Mon-based week
  const staff   = staffForDay(friIdx);
  const rushes  = rushesForDay(friIdx);
  const rushHours = rushes.flatMap(r =>
    Array.from({ length: r.endHour - r.startHour }, (_, i) => r.startHour + i),
  );
  const rushStaff = staff.filter(e =>
    e.availability.some(a => a.day === friIdx && rushHours.some(h => h >= a.startHour && h < a.endHour)),
  );
  const minRush = 4;
  const status = rushStaff.length >= minRush
    ? `✅ You have **${rushStaff.length} staff** during the Friday rush — that meets the recommended minimum of ${minRush}.`
    : `⚠️ **Understaffed alert!** Only **${rushStaff.length} staff** are available during the Friday rush. You need at least ${minRush}.`;
  const names = rushStaff.map(e => `• ${e.name} (${e.role})`).join('\n');
  return `${status}\n\n**Available during Friday rush:**\n${names || '  — none —'}\n\nRush windows: ${rushes.map(r => `${r.label} ${formatHour(r.startHour)}–${formatHour(r.endHour)}`).join(', ')}.`;
}

function respondLowReviews(): string {
  const bad = MOCK_REVIEWS.filter(r => r.stars <= 1);
  if (bad.length === 0) return 'No 1-star reviews on record — great job, Chef! 🎉';
  const lines = bad.map(r => `• **${r.userHandle}** (${r.platform}): "${r.textContent.slice(0, 80)}…"`).join('\n');
  return `⭐ **${bad.length} one-star review(s) found:**\n\n${lines}\n\nThese have been added to your Correction Task list. I recommend a direct response online and an internal process review.`;
}

function respondSentiment(): string {
  const s = computeSentiment(MOCK_REVIEWS);
  return `🧠 **Customer Sentiment Summary:**\n\n• **Avg rating:** ${s.avgRating} / 5 across ${s.totalReviews} reviews\n• **Positive:** ${s.positiveCount} reviews  |  **Negative:** ${s.negativeCount} reviews\n\n🏆 **Win:** ${s.topWin}\n⚠️ **Pain Point:** ${s.topPain}`;
}

function respondInventoryFull(): string {
  const expired = seedInventory.filter(i => calculateStatus(i.expiryDate) === 'Expired');
  const warning = seedInventory.filter(i => calculateStatus(i.expiryDate) === 'Warning');
  const low     = seedInventory.filter(i => i.quantity < i.minThreshold);
  const fresh   = seedInventory.filter(i => calculateStatus(i.expiryDate) === 'Fresh' && i.quantity >= i.minThreshold);
  return `📋 **Full Inventory Report:**\n\n🔴 **Expired (${expired.length}):** ${expired.map(i => i.name).join(', ') || 'None'}\n🟡 **Expiring soon (${warning.length}):** ${warning.map(i => i.name).join(', ') || 'None'}\n📦 **Low stock (${low.length}):** ${low.map(i => i.name).join(', ') || 'None'}\n✅ **Healthy (${fresh.length} items):** All good.\n\nAction needed on **${expired.length + warning.length + low.length}** items.`;
}

function respond86(query: string): string {
  const words = query.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
  const skipWords = new Set(['86', 'eighty', 'six', 'the', 'i', 'need', 'to', 'pull', 'remove', 'stop', 'serving', 'we', 'are', 'out', 'of']);
  const item = words.filter(w => w.length > 2 && !skipWords.has(w.toLowerCase())).join(' ');
  const itemName = item || 'that item';
  return `🚫 **86'd: ${itemName}**\n\nGot it, Chef. In a live system this would flag **${itemName}** across your menu, POS, and floor plan instantly.\n\nFor now, I'd recommend:\n1. Notifying your servers immediately.\n2. Updating your POS menu.\n3. Writing it on the board.\n\nIt's been logged in your operations notes.`;
}

function respondStaffCost(): string {
  const totalHours = SEED_EMPLOYEES.reduce((sum, e) => {
    const weeklyHours = e.availability.reduce((h, a) => h + (a.endHour - a.startHour), 0);
    return sum + weeklyHours;
  }, 0);
  const totalCost = SEED_EMPLOYEES.reduce((sum, e) => {
    const weeklyHours = e.availability.reduce((h, a) => h + (a.endHour - a.startHour), 0);
    return sum + weeklyHours * e.hourlyRate;
  }, 0);
  const lines = SEED_EMPLOYEES.map(e => {
    const hrs = e.availability.reduce((h, a) => h + (a.endHour - a.startHour), 0);
    return `• ${e.name} (${e.role}) — ${hrs}h @ $${e.hourlyRate}/hr = **$${hrs * e.hourlyRate}**`;
  }).join('\n');
  return `💰 **Weekly Staffing Cost Estimate:**\n\n${lines}\n\n**Total: $${totalCost.toLocaleString()} across ${totalHours} labor hours this week.**`;
}

function respondOpsOverview(): string {
  const expiring = seedInventory.filter(i => daysUntil(i.expiryDate) <= 2 && daysUntil(i.expiryDate) >= 0);
  const lowStock = seedInventory.filter(i => i.quantity < i.minThreshold);
  const badReviews = MOCK_REVIEWS.filter(r => r.stars <= 2).length;
  const todayStaff = staffForDay(todayDayIdx());
  const sentiment = computeSentiment(MOCK_REVIEWS);
  return `📊 **Operations Overview:**\n\n👨‍🍳 **Kitchen:** ${expiring.length} item(s) expiring soon, ${lowStock.length} low stock.\n\n👥 **Floor:** ${todayStaff.length} staff on today (${todayStaff.map(e => e.name.split(' ')[0]).join(', ')}).\n\n⭐ **Reviews:** Avg ${sentiment.avgRating}/5 across ${sentiment.totalReviews} reviews. ${badReviews} need attention.\n\n${expiring.length > 0 ? `⏰ **Priority:** Run specials on ${expiring.map(i => i.name).join(', ')} tonight.` : '✅ No urgent expiry issues.'}\n\n_Ask me about any area for a deeper dive._`;
}

function respondGreeting(): string {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, Chef! 👋 I'm your Digital Manager — ready to help you run the floor.\n\nYou can ask me about **inventory**, **staffing**, **customer reviews**, or just say **"operations overview"** to get a full status report. What do you need?`;
}

function respondUnknown(query: string): string {
  return `I'm not sure I have the data to answer "${query}" fully yet, Chef — but I'm learning!\n\nTry asking about:\n• Inventory status or expiring items\n• Staff schedule or costs\n• Customer reviews or sentiment\n• An operations overview\n\nOr use one of the suggested questions in the sidebar.`;
}

// ── Main mock brain ──────────────────────────────────────────────

export function buildResponse(query: string): string {
  const intent = detectIntent(query);
  switch (intent) {
    case 'expiring':        return respondExpiring();
    case 'restock':         return respondRestock();
    case 'staff_tonight':   return respondStaffTonight();
    case 'staff_friday':    return respondStaffFriday();
    case 'reviews_low':     return respondLowReviews();
    case 'sentiment':       return respondSentiment();
    case 'inventory_full':  return respondInventoryFull();
    case '86_item':         return respond86(query);
    case 'staff_cost':      return respondStaffCost();
    case 'ops_overview':    return respondOpsOverview();
    case 'greeting':        return respondGreeting();
    default:                return respondUnknown(query);
  }
}

// ── Simulated async wrapper (replace with real API call) ─────────

export async function mockRespond(query: string): Promise<string> {
  // Simulate network latency (600 ms – 1.4 s)
  const delay = 600 + Math.random() * 800;
  await new Promise(res => setTimeout(res, delay));

  // ================================================================
  // API_INTEGRATION_POINT
  //
  // Replace the mock logic below with a real LLM API call, e.g.:
  //
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     model: 'gpt-4o',
  //     messages: [
  //       {
  //         role: 'system',
  //         content: `You are OperON, a restaurant AI manager. You have access to the following live data:
  //           Inventory: ${JSON.stringify(seedInventory)}
  //           Staff: ${JSON.stringify(SEED_EMPLOYEES)}
  //           Reviews: ${JSON.stringify(MOCK_REVIEWS)}
  //           Rush Periods: ${JSON.stringify(SEED_RUSH_PERIODS)}
  //           Answer concisely and like a helpful restaurant manager.`,
  //       },
  //       { role: 'user', content: query },
  //     ],
  //   }),
  // });
  // const data = await response.json();
  // return data.choices[0].message.content;
  //
  // ================================================================

  return buildResponse(query);
}

// ── Unique ID helper ─────────────────────────────────────────────

export function msgId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
