// ================================================================
// OperON – Feedback / Reputation Guard: Types & Data
// ================================================================

export type Platform = 'Yelp' | 'Google';
export type CategoryTag = 'Food' | 'Service' | 'Ambiance' | 'Price';

export interface Review {
  id: string;
  platform: Platform;
  stars: number; // 1–5
  userHandle: string;
  avatarInitials: string;
  textContent: string;
  date: string;   // ISO date string
  categoryTag: CategoryTag;
}

export interface Task {
  id: string;         // same as review id
  reviewId: string;
  stars: number;
  summary: string;    // short action description
  categoryTag: CategoryTag;
  platform: Platform;
  fixedAt?: string;   // ISO date when marked fixed
}

// ── Priority helpers ─────────────────────────────────────────────

export function getPriority(stars: number): 'high' | 'medium' | 'low' {
  if (stars <= 1) return 'high';
  if (stars <= 3) return 'medium';
  return 'low';
}

export const PRIORITY_LABEL: Record<string, string> = {
  high:   '🔴 P1 — Immediate',
  medium: '🟡 P2 — Consistency',
  low:    '🟢 P3 — Polish',
};

// ── Sentiment analysis ───────────────────────────────────────────

const POSITIVE_KEYWORDS = [
  'fresh', 'friendly', 'cozy', 'perfect', 'authentic', 'delicious',
  'warm', 'clean', 'generous', 'attentive', 'fast', 'great', 'love',
  'amazing', 'excellent', 'best', 'wonderful', 'homemade', 'nice',
];

const NEGATIVE_KEYWORDS = [
  'cold', 'slow', 'salty', 'wait', 'rude', 'dirty', 'small',
  'bland', 'overpriced', 'noisy', 'wrong', 'wrong order', 'raw',
  'dry', 'greasy', 'understaffed', 'forgotten', 'stale',
];

function countKeywords(texts: string[], keywords: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) counts.set(kw, (counts.get(kw) ?? 0) + 1);
    }
  }
  return counts;
}

export interface SentimentSummary {
  avgRating: number;
  totalReviews: number;
  positiveCount: number;
  negativeCount: number;
  topWin: string;
  topPain: string;
  ratingBreakdown: Record<number, number>;
}

export function computeSentiment(reviews: Review[]): SentimentSummary {
  const total = reviews.length;
  const avg   = total ? +(reviews.reduce((s, r) => s + r.stars, 0) / total).toFixed(1) : 0;

  const positiveTexts = reviews.filter(r => r.stars >= 4).map(r => r.textContent);
  const negativeTexts = reviews.filter(r => r.stars <= 2).map(r => r.textContent);

  const posCounts = countKeywords(positiveTexts, POSITIVE_KEYWORDS);
  const negCounts = countKeywords(negativeTexts, NEGATIVE_KEYWORDS);

  const topPos = [...posCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topNeg = [...negCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => breakdown[r.stars]++);

  return {
    avgRating: avg,
    totalReviews: total,
    positiveCount: reviews.filter(r => r.stars >= 4).length,
    negativeCount: reviews.filter(r => r.stars <= 2).length,
    topWin:  topPos ? `Guests consistently praise the "${topPos[0]}" experience (${topPos[1]}× mentioned).` : 'Guests are responding positively overall.',
    topPain: topNeg ? `The most common complaint is "${topNeg[0]}" — flagged in ${topNeg[1]} recent review(s).` : 'No dominant pain points found in recent reviews.',
    ratingBreakdown: breakdown,
  };
}

// ── Task generator ───────────────────────────────────────────────

const ACTION_TEMPLATES: Record<CategoryTag, (stars: number) => string> = {
  Food:     (s) => s === 1 ? 'Investigate food quality issue — taste/temperature reported off.' : 'Review food consistency — minor quality or portioning feedback.',
  Service:  (s) => s === 1 ? 'Address service complaint — guest reported poor staff interaction.' : 'Improve service consistency — moderate wait or attentiveness issue.',
  Ambiance: (s) => s === 1 ? 'Urgent atmosphere issue flagged — cleanliness or noise concern.' : 'Minor ambiance feedback — review seating or noise levels.',
  Price:    (s) => s === 1 ? 'Severe value concern raised — re-evaluate pricing vs. portion.' : 'Review price-to-value perception for flagged menu items.',
};

export function generateTasks(reviews: Review[]): Task[] {
  return reviews
    .filter(r => r.stars <= 3)
    .sort((a, b) => a.stars - b.stars)
    .map(r => ({
      id: r.id,
      reviewId: r.id,
      stars: r.stars,
      summary: ACTION_TEMPLATES[r.categoryTag](r.stars),
      categoryTag: r.categoryTag,
      platform: r.platform,
    }));
}

// ── Mock reviews ─────────────────────────────────────────────────

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rv1', platform: 'Yelp', stars: 1, userHandle: 'MikeT_eats',
    avatarInitials: 'MT',
    textContent: 'The soup was completely cold when it arrived. I told the waiter and waited 20 minutes — it came back lukewarm. Really disappointed. Won\'t be back.',
    date: '2026-04-01', categoryTag: 'Food',
  },
  {
    id: 'rv2', platform: 'Google', stars: 5, userHandle: 'LuciaR',
    avatarInitials: 'LR',
    textContent: 'Absolutely delicious! The homemade pasta was fresh and the sauce was authentic — just like my nonna used to make. The staff was incredibly friendly and attentive. Best Italian in the city!',
    date: '2026-04-02', categoryTag: 'Food',
  },
  {
    id: 'rv3', platform: 'Yelp', stars: 2, userHandle: 'JasonW99',
    avatarInitials: 'JW',
    textContent: 'Way too salty. The tiramisu was good but the pasta was salty beyond belief. Asked for a replacement and got an attitude from the server. Not a great experience.',
    date: '2026-03-28', categoryTag: 'Food',
  },
  {
    id: 'rv4', platform: 'Google', stars: 5, userHandle: 'SophieM',
    avatarInitials: 'SM',
    textContent: 'Warm, cozy atmosphere and the perfect date night spot. Every dish felt lovingly made. The owner came out to greet us — that personal touch is rare. Highly recommend!',
    date: '2026-04-03', categoryTag: 'Ambiance',
  },
  {
    id: 'rv5', platform: 'Yelp', stars: 3, userHandle: 'DaveK_foodie',
    avatarInitials: 'DK',
    textContent: 'Food is good, ambiance is nice, but the wait time is really getting out of hand. Waited 45 minutes for a table on a Wednesday. They need more staff on the floor.',
    date: '2026-03-30', categoryTag: 'Service',
  },
  {
    id: 'rv6', platform: 'Google', stars: 1, userHandle: 'AngryAnon',
    avatarInitials: 'AA',
    textContent: 'The server was rude and ignored our table for 30 minutes. When we finally got our food, the order was wrong. Nobody apologized. Felt completely forgotten. Zero stars if I could.',
    date: '2026-04-05', categoryTag: 'Service',
  },
  {
    id: 'rv7', platform: 'Yelp', stars: 4, userHandle: 'NinaP',
    avatarInitials: 'NP',
    textContent: 'Really lovely evening. The gnocchi was amazing and the wine selection is great. Slightly overpriced for the portion size but the quality makes up for it. Would definitely come back.',
    date: '2026-04-04', categoryTag: 'Price',
  },
  {
    id: 'rv8', platform: 'Google', stars: 5, userHandle: 'ChrisF_ATL',
    avatarInitials: 'CF',
    textContent: 'Best family Italian I\'ve had outside of Rome. The chef clearly loves what they do. Generous portions, warm service, clean and inviting space. Bring your family!',
    date: '2026-03-25', categoryTag: 'Food',
  },
  {
    id: 'rv9', platform: 'Yelp', stars: 2, userHandle: 'TinaB22',
    avatarInitials: 'TB',
    textContent: 'The noisy dining room made it impossible to have a conversation. Tables are packed too close together. Food was decent but the dry bread and cold butter were a rough start.',
    date: '2026-03-22', categoryTag: 'Ambiance',
  },
  {
    id: 'rv10', platform: 'Google', stars: 4, userHandle: 'OmarS',
    avatarInitials: 'OS',
    textContent: 'Fresh ingredients, nice staff, and a cozy feel. The pizza crust was a little dry but the toppings were generous and the flavors were excellent. Great neighborhood spot.',
    date: '2026-04-06', categoryTag: 'Food',
  },
];
