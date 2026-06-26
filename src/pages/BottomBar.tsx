export default function BottomBar() {
  return (
    <footer style={{ backgroundColor: '#00afff', borderTop: '1px solid #01a3fc', padding: '60px 40px', textAlign: 'center'}}>
      <p style={{ color: '#000', fontSize: 18, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 28 }}>FOLLOW US</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 32 }}>
        <a href="https://www.instagram.com/zuroautomotive/" target="_blank" rel="noreferrer" style={{ color: '#000' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
          </svg>
        </a>
        <a href="https://www.youtube.com/@zuro_offical" target="_blank" rel="noreferrer" style={{ color: '#000' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
          </svg>
        </a>
        <a href="https://www.tiktok.com/@zuroautomotiveofficial" target="_blank" rel="noreferrer" style={{ color: '#000' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
          </svg>
        </a>
      </div>
      <p style={{ color: '#000', fontSize: 13, opacity: 0.7, fontFamily: 'system-ui, sans-serif' }}>
        <a href="/privacy" style={{ color: '#000', textDecoration: 'none' }}>Privacy Policy</a>
        {' | '}
        <a href="/terms" style={{ color: '#000', textDecoration: 'none' }}>Terms of Service</a>
        {' | '}
        © Copyright 2026 Zuro
      </p>
    </footer>
  );
}