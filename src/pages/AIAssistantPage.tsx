import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../lib/aiAssistant';
import { SUGGESTED_QUESTIONS, mockRespond, msgId } from '../lib/aiAssistant';
import './AIAssistantPage.css';

// ── Markdown-lite renderer ───────────────────────────────────────
// Converts **bold**, bullet •, and \n to HTML safely (no library needed)
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
}

// ── Chat bubble ──────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const timeStr = msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`ai-bubble-wrap ${isUser ? 'ai-bubble-wrap--user' : 'ai-bubble-wrap--assistant'}`}>
      {!isUser && (
        <div className="ai-avatar ai-avatar--assistant" aria-label="Assistant">
          <span>⚡</span>
        </div>
      )}
      <div className={`ai-bubble ${isUser ? 'ai-bubble--user' : 'ai-bubble--assistant'}`}>
        <p
          className="ai-bubble-text"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
        />
        <span className="ai-bubble-time">{timeStr}</span>
      </div>
      {isUser && (
        <div className="ai-avatar ai-avatar--user" aria-label="You">
          <span>👤</span>
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ─────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="ai-bubble-wrap ai-bubble-wrap--assistant">
      <div className="ai-avatar ai-avatar--assistant"><span>⚡</span></div>
      <div className="ai-bubble ai-bubble--assistant ai-bubble--typing">
        <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Good morning, Chef! 👋 I'm your **Digital Manager** — powered by your live restaurant data.\n\nAsk me about inventory, staffing, customer reviews, or say **\"operations overview\"** for a full status snapshot. I'm here to help you run the floor.",
  timestamp: new Date(),
};

export default function AIAssistantPage() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (query: string) => {
    const text = query.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: msgId(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await mockRespond(text);
      const assistantMsg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        text: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (query: string) => {
    sendMessage(query);
  };

  const clearChat = () => {
    setMessages([WELCOME_MSG]);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="ai-wrapper">

      {/* ── Left Sidebar ── */}
      <aside className="ai-sidebar">
        <div className="ai-sidebar-brand">
          <span className="ai-brand-icon">⚡</span>
          <span className="ai-brand-name">OperON AI</span>
        </div>

        <p className="ai-sidebar-heading">SUGGESTED QUESTIONS</p>
        <div className="ai-suggestions">
          {SUGGESTED_QUESTIONS.map((sq, i) => (
            <button
              key={i}
              className="ai-suggestion-btn"
              onClick={() => handleSuggestion(sq.query)}
              disabled={loading}
              title={sq.query}
            >
              <span className="ai-suggestion-icon">{sq.icon}</span>
              <span className="ai-suggestion-label">{sq.label}</span>
            </button>
          ))}
        </div>

        <div className="ai-sidebar-divider" />

        <p className="ai-sidebar-heading">DATA SOURCES</p>
        <div className="ai-sources">
          <div className="ai-source-row"><span className="ai-source-dot ai-source-dot--live" />Inventory</div>
          <div className="ai-source-row"><span className="ai-source-dot ai-source-dot--live" />Staff Schedule</div>
          <div className="ai-source-row"><span className="ai-source-dot ai-source-dot--live" />Customer Reviews</div>
          <div className="ai-source-row"><span className="ai-source-dot ai-source-dot--live" />Floor Operations</div>
        </div>

        <div className="ai-sidebar-divider" />

        <button className="ai-clear-btn" onClick={clearChat} disabled={loading}>
          🗑 Clear Chat
        </button>
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="ai-chat-area">

        {/* Messages */}
        <div className="ai-messages">
          {messages.map(msg => (
            <Bubble key={msg.id} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Sticky Input Bar */}
        <div className="ai-input-bar">
          <div className="ai-input-wrap">
            <textarea
              ref={inputRef}
              className="ai-input"
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — inventory, staffing, reviews…"
              disabled={loading}
              aria-label="Message input"
            />
            <button
              className="ai-send-btn"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? (
                <span className="ai-send-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="ai-input-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</p>
        </div>
      </div>
    </div>
  );
}
