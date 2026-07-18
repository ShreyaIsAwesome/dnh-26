import { useState, useMemo } from 'react';
import type { Platform, Task } from '../lib/feedback';
import {
  MOCK_REVIEWS, generateTasks, computeSentiment,
  getPriority, PRIORITY_LABEL,
} from '../lib/feedback';
import './FeedbackPage.css';

// ── Star renderer ────────────────────────────────────────────────

function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="fb-stars" aria-label={`${count} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? 'fb-star fb-star--filled' : 'fb-star fb-star--empty'}>★</span>
      ))}
    </span>
  );
}

// ── Rating bar ───────────────────────────────────────────────────

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="fb-rbar-row">
      <span className="fb-rbar-label">{label}</span>
      <div className="fb-rbar-track">
        <div className="fb-rbar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="fb-rbar-count">{count}</span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [starFilter,     setStarFilter]     = useState<number | null>(null);
  const [platformFilter, setPlatformFilter] = useState<Platform | null>(null);
  const [activeTasks,    setActiveTasks]    = useState<Task[]>(() => generateTasks(MOCK_REVIEWS));
  const [fixedTasks,     setFixedTasks]     = useState<Task[]>([]);

  const sentiment = useMemo(() => computeSentiment(MOCK_REVIEWS), []);

  const filteredReviews = useMemo(() => {
    return MOCK_REVIEWS.filter(r => {
      if (starFilter     !== null && r.stars    !== starFilter)     return false;
      if (platformFilter !== null && r.platform !== platformFilter) return false;
      return true;
    });
  }, [starFilter, platformFilter]);

  const handleMarkFixed = (taskId: string) => {
    const task = activeTasks.find(t => t.id === taskId);
    if (!task) return;
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setActiveTasks(prev => prev.filter(t => t.id !== taskId));
    setFixedTasks(prev => [{ ...task, fixedAt: now }, ...prev]);
  };

  const platformOptions: Platform[] = ['Yelp', 'Google'];
  const starOptions = [5, 4, 3, 2, 1];

  return (
    <div className="fb-wrapper">

      {/* ── Left Filter Sidebar ── */}
      <aside className="fb-left-sidebar">
        <p className="fb-sidebar-heading">PLATFORM</p>
        <button
          className={`fb-filter-btn${platformFilter === null ? ' fb-filter-btn--active' : ''}`}
          onClick={() => setPlatformFilter(null)}
        >All Platforms</button>
        {platformOptions.map(p => (
          <button
            key={p}
            className={`fb-filter-btn fb-filter-btn--${p.toLowerCase()}${platformFilter === p ? ' fb-filter-btn--active' : ''}`}
            onClick={() => setPlatformFilter(prev => prev === p ? null : p)}
          >
            {p === 'Yelp' ? '🔴' : '🔵'} {p}
          </button>
        ))}

        <div className="fb-sidebar-divider" />

        <p className="fb-sidebar-heading">STAR RATING</p>
        <button
          className={`fb-filter-btn${starFilter === null ? ' fb-filter-btn--active' : ''}`}
          onClick={() => setStarFilter(null)}
        >All Ratings</button>
        {starOptions.map(s => (
          <button
            key={s}
            className={`fb-filter-btn${starFilter === s ? ' fb-filter-btn--active' : ''}`}
            onClick={() => setStarFilter(prev => prev === s ? null : s)}
          >
            <Stars count={s} /> <span className="fb-filter-count">({sentiment.ratingBreakdown[s]})</span>
          </button>
        ))}

        <div className="fb-sidebar-divider" />

        <p className="fb-sidebar-heading">OVERVIEW</p>
        <div className="fb-overview">
          <div className="fb-avg-rating">
            <span className="fb-avg-num">{sentiment.avgRating}</span>
            <Stars count={Math.round(sentiment.avgRating)} />
          </div>
          <p className="fb-total-label">{sentiment.totalReviews} reviews total</p>
          {[5, 4, 3, 2, 1].map(s => (
            <RatingBar
              key={s}
              label={`${s}★`}
              count={sentiment.ratingBreakdown[s]}
              total={sentiment.totalReviews}
            />
          ))}
        </div>
      </aside>

      {/* ── Center Main ── */}
      <div className="fb-center">

        {/* Sentiment Summary Card */}
        <div className="fb-sentiment-card">
          <div className="fb-sentiment-header">
            <span className="fb-sentiment-icon">🧠</span>
            <div>
              <h2 className="fb-sentiment-title">Monthly Sentiment Summary</h2>
              <p className="fb-sentiment-meta">
                {sentiment.positiveCount} positive · {sentiment.negativeCount} negative · {sentiment.totalReviews} total
              </p>
            </div>
          </div>
          <div className="fb-sentiment-insights">
            <div className="fb-insight fb-insight--win">
              <span className="fb-insight-label">🏆 WIN</span>
              <p className="fb-insight-text">{sentiment.topWin}</p>
            </div>
            <div className="fb-insight fb-insight--pain">
              <span className="fb-insight-label">⚠️ AREA FOR IMPROVEMENT</span>
              <p className="fb-insight-text">{sentiment.topPain}</p>
            </div>
          </div>
        </div>

        {/* Smart To-Do List */}
        <div className="fb-section-header">
          <h3 className="fb-section-title">🛠 Active Correction Tasks</h3>
          <span className="fb-section-count">{activeTasks.length} open</span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="fb-empty">
            <span className="fb-empty-icon">✅</span>
            <p>All issues resolved! Check the Improvements History below.</p>
          </div>
        ) : (
          <div className="fb-task-list">
            {activeTasks.map(task => {
              const priority = getPriority(task.stars);
              const review = MOCK_REVIEWS.find(r => r.id === task.reviewId);
              return (
                <div key={task.id} className={`fb-task fb-task--${priority}`}>
                  <div className="fb-task-left">
                    <span className={`fb-priority-badge fb-priority-badge--${priority}`}>
                      {PRIORITY_LABEL[priority]}
                    </span>
                    <div className="fb-task-body">
                      <p className="fb-task-summary">{task.summary}</p>
                      {review && (
                        <p className="fb-task-quote">"{review.textContent.slice(0, 90)}{review.textContent.length > 90 ? '…' : ''}"</p>
                      )}
                      <div className="fb-task-meta-row">
                        <Stars count={task.stars} />
                        <span className={`fb-platform-tag fb-platform-tag--${task.platform.toLowerCase()}`}>{task.platform}</span>
                        <span className="fb-category-tag">{task.categoryTag}</span>
                        {review && <span className="fb-task-user">— {review.userHandle}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    className="fb-fix-btn"
                    onClick={() => handleMarkFixed(task.id)}
                    aria-label="Mark as fixed"
                  >
                    ✓ Mark Fixed
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Improvements History */}
        {fixedTasks.length > 0 && (
          <>
            <div className="fb-section-header fb-section-header--history">
              <h3 className="fb-section-title">📈 Improvements History</h3>
              <span className="fb-section-count">{fixedTasks.length} resolved</span>
            </div>
            <div className="fb-fixed-list">
              {fixedTasks.map(task => {
                const priority = getPriority(task.stars);
                return (
                  <div key={task.id} className="fb-fixed-row">
                    <span className="fb-fixed-check">✔</span>
                    <div className="fb-fixed-info">
                      <span className="fb-fixed-summary">{task.summary}</span>
                      <div className="fb-fixed-meta">
                        <Stars count={task.stars} />
                        <span className={`fb-platform-tag fb-platform-tag--${task.platform.toLowerCase()}`}>{task.platform}</span>
                        <span className={`fb-priority-badge fb-priority-badge--${priority} fb-priority-badge--sm`}>
                          {priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <span className="fb-fixed-date">Fixed {task.fixedAt}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Right Reviews Sidebar ── */}
      <aside className="fb-right-sidebar">
        <p className="fb-sidebar-heading">
          REVIEWS
          {(starFilter || platformFilter) && (
            <button
              className="fb-clear-filters"
              onClick={() => { setStarFilter(null); setPlatformFilter(null); }}
            >clear filters</button>
          )}
        </p>
        <p className="fb-review-count">{filteredReviews.length} showing</p>
        <div className="fb-review-list">
          {filteredReviews.map(r => (
            <div key={r.id} className={`fb-review-card fb-review-card--${r.stars <= 2 ? 'low' : r.stars <= 3 ? 'mid' : 'high'}`}>
              <div className="fb-review-top">
                <div className="fb-avatar">{r.avatarInitials}</div>
                <div className="fb-review-identity">
                  <span className="fb-review-user">{r.userHandle}</span>
                  <span className={`fb-platform-tag fb-platform-tag--${r.platform.toLowerCase()}`}>{r.platform}</span>
                </div>
              </div>
              <div className="fb-review-stars-row">
                <Stars count={r.stars} />
                <span className="fb-review-date">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="fb-review-text">{r.textContent}</p>
              <span className="fb-review-category">{r.categoryTag}</span>
            </div>
          ))}
          {filteredReviews.length === 0 && (
            <p className="fb-no-results">No reviews match the current filters.</p>
          )}
        </div>
      </aside>

    </div>
  );
}
