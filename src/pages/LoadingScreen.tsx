export default function LoadingScreen() {
  return (
            <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '28px',
        zIndex: 9999
        }}>
      <img src="/ZuroRecLog.png" style={{ width: '180px' }} alt="Zuro" />

      <div style={{ position: 'relative', width: '44px', height: '44px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '20px', height: '20px',
              borderRadius: '50%',
              background: '#1aabf0',
              top: '50%', left: '50%',
              marginTop: '-5px', marginLeft: '-5px',
              animation: `orbit 1.2s linear ${-i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      <div style={{ width: '220px' }}>
        <div style={{ width: '100%', height: '3px', background: '#222', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: '#1aabf0', borderRadius: '99px',
            animation: 'fill 2.5s ease-in-out forwards'
          }} />
        </div>
        <p style={{ color: '#1aabf0', fontSize: '11px', textAlign: 'center', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '8px' }}>
          Loading...
        </p>
      </div>

      <style>{`
        @keyframes orbit {
          0%   { transform: rotate(0deg)   translateX(14px) scale(1);   opacity: 1; }
          25%  { transform: rotate(90deg)  translateX(14px) scale(.85); opacity: .7; }
          50%  { transform: rotate(180deg) translateX(14px) scale(.65); opacity: .4; }
          75%  { transform: rotate(270deg) translateX(14px) scale(.85); opacity: .7; }
          100% { transform: rotate(360deg) translateX(14px) scale(1);   opacity: 1; }
        }
        @keyframes fill {
          0%   { width: 0%; }
          60%  { width: 75%; }
          90%  { width: 92%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  )
}