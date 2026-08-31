import { useState } from 'react';
import { Citation } from '../../lib/api';

interface CitationChipProps {
  citation: Citation;
  index: number;
}

export function CitationChip({ citation, index }: CitationChipProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isPdf = citation.documentTitle?.toLowerCase().endsWith('.pdf');

  return (
    <div id={`cite-${index + 1}`} style={{ display: 'inline-block', maxWidth: '100%', transition: 'transform 0.2s' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-label={`Citation ${index + 1}: ${citation.documentTitle}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="citation-chip-btn"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
          background: hovered ? 'var(--blue-pale)' : 'var(--surface-2)',
          border: `1px solid ${hovered ? 'var(--blue-light)' : 'var(--border)'}`,
          color: hovered ? 'var(--blue)' : 'var(--text-secondary)',
          fontSize: 11.5, fontFamily: 'inherit', fontWeight: 500,
          transition: 'all 0.15s ease', minHeight: 'unset',
        }}
      >
        {/* Doc type icon */}
        <div style={{
          width: 16, height: 16, borderRadius: 3, flexShrink: 0,
          background: isPdf ? '#FEE2E2' : '#ECFDF5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPdf ? (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1h4.5L8 3.5V8H1V1z" stroke="#DC2626" strokeWidth="0.9"/>
              <path d="M5.5 1v2.5H8" stroke="#DC2626" strokeWidth="0.9"/>
            </svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M2 2h5M2 4.5h5M2 7h3" stroke="#16A34A" strokeWidth="0.9" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        {/* Citation index */}
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue)' }}>[{index + 1}]</span>

        {/* Title */}
        <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {citation.documentTitle}
        </span>

        {/* Chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
        >
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded snippet */}
      {expanded && (
        <div className="citation-expanded-panel" style={{
          marginTop: 6, padding: '10px 13px',
          borderRadius: 8, background: 'var(--surface)',
          border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-secondary)',
          maxWidth: 340, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          lineHeight: 1.6, boxSizing: 'border-box',
        }}>
          <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 5, fontSize: 12 }}>
            📄 {citation.documentTitle}
          </p>
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 8 }}>"{citation.snippet}"</p>
          
          {/* View source for URLs */}
          {citation.documentTitle?.startsWith('http') && (
            <a
              href={citation.documentTitle}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: 'var(--blue)',
                textDecoration: 'none', background: 'var(--blue-pale)',
                padding: '3px 8px', borderRadius: 4,
              }}
            >
              View Source →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
