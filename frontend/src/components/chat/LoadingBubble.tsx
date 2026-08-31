export function LoadingBubble() {
  return (
    <div className="msg-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
      {/* Avatar */}
      <div style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: 7,
        background: 'var(--navy)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="#4A90D9" strokeWidth="1.1" fill="none"/>
          <circle cx="7" cy="7" r="1.3" fill="#4A90D9"/>
        </svg>
      </div>

      <div>
        {/* AI label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>AI Nexus</span>
        </div>

        {/* Typing bubble */}
        <div
          role="status"
          aria-label="Assistant is thinking"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '4px 18px 18px 18px',
            padding: '14px 18px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div className="dot-bounce">
            <span /><span /><span />
          </div>
        </div>
      </div>
    </div>
  );
}
