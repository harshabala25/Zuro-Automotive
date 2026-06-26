import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import NotificationDropdown from '../pages/NotificationDropdown'

interface NavbarProps {
  defaultSearch?: string
}

export default function Navbar({ defaultSearch = '' }: NavbarProps) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [navSearch, setNavSearch] = useState(defaultSearch)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function loadAll() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: convos } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

      const convoIds = convos?.map((c: any) => c.id) ?? []
      if (convoIds.length > 0) {
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .in('conversation_id', convoIds)
        setUnreadMessages(msgCount ?? 0)
      }
    }
    loadAll()
  }, [])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
      if (!session?.user) {
        setProfile(null)
        setUnreadMessages(0)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navAvatar = profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="Avatar"
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )

  const btnStyle = {
    padding: '9px 20px', backgroundColor: '#01a3fc', color: '#000',
    textDecoration: 'none', borderRadius: 7, fontWeight: 900,
    fontSize: 13, letterSpacing: 1, whiteSpace: 'nowrap' as const,
    border: '2px solid #000', display: 'inline-block',
    transition: 'background-color 0.2s, color 0.2s',
  }

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#01a3fc',
        borderBottom: '1px solid #222', padding: isMobile ? '12px 16px' : '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        {/* LOGO */}
        <a href="/">
          <img src="/ZuroLogBlue.png" alt="Zuro" style={{ height: 28, marginBottom: -10 }} />
        </a>

        {/* DESKTOP: search */}
        {!isMobile && (
          <div style={{ flex: 1, maxWidth: 600 }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', pointerEvents: 'none',
              }}>
                <i className="ti ti-search" style={{ fontSize: 16, color: '#01a3fc' }} />
              </span>
              <input
                type="text"
                placeholder="Search for cars (ex: Toyota Corolla)"
                value={navSearch}
                onChange={e => setNavSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && navSearch.trim())
                    window.location.href = `/buy?search=${encodeURIComponent(navSearch.trim())}`
                }}
                style={{
                  width: '100%', padding: '11px 16px 11px 38px',
                  backgroundColor: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 14, color: '#000', boxSizing: 'border-box' as const,
                  fontFamily: 'system-ui, sans-serif',
                }}
              />
            </div>
          </div>
        )}

        {/* DESKTOP: nav links + icons */}
        {!isMobile && (
          <>
            <a href="/sell" style={btnStyle}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#000'; e.currentTarget.style.color = '#01a3fc' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#01a3fc'; e.currentTarget.style.color = '#000' }}
            >SELL YOUR CAR</a>

            <a href="/buy" style={btnStyle}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#000'; e.currentTarget.style.color = '#01a3fc' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#01a3fc'; e.currentTarget.style.color = '#000' }}
            >BUY A CAR</a>

            {currentUser && (
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                justifyContent: 'center', width: 44, height: 44, borderRadius: '50%',
                border: '2px solid #000', cursor: 'pointer', backgroundColor: '#01a3fc',
              }}>
                <NotificationDropdown onUnreadChange={() => {}} />
              </div>
            )}

            {currentUser ? (
              <div ref={dropdownRef} style={{ position: 'relative', zIndex: 9999 }}>
                <div onClick={() => setDropdownOpen(prev => !prev)}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', border: '2px solid #000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', backgroundColor: '#00aaff',
                  }}>
                  {navAvatar}
                </div>
                {unreadMessages > 0 && (
                  <div style={{
                    position: 'absolute', bottom: 1, right: 1, width: 11, height: 11,
                    borderRadius: '50%', backgroundColor: '#ff6a00', border: '2px solid #01a3fc',
                    pointerEvents: 'none',
                  }} />
                )}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#0d0d0d',
                    border: '1px solid #1f1f1f', borderRadius: 14, width: 220,
                    zIndex: 9999, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #1a1a1a' }}>
                      <p style={{ margin: 0, fontSize: 11, color: '#00aaff', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>Signed in as</p>
                      <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 900, color: '#fff', fontFamily: "'Arial Black', Arial, sans-serif" }}>@{profile?.username || 'user'}</p>
                    </div>
                    <div style={{ padding: '6px 0' }}>
                      {[
                        { label: 'My Profile', href: '/profile', icon: 'user-circle', badge: false },
                        { label: 'Messages', href: '/messages', icon: 'message-2', badge: unreadMessages > 0 },
                      ].map(item => (
                        <a key={item.href} href={item.href} onClick={() => setDropdownOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 18px', textDecoration: 'none', color: '#ccc', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(1,163,252,0.12)'; e.currentTarget.style.color = '#01a3fc' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ccc' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <i className={`ti ti-${item.icon}`} style={{ fontSize: 18 }} />
                            {item.label}
                          </div>
                          {item.badge && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff3b30', flexShrink: 0 }} />}
                        </a>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid #1a1a1a', padding: '6px 0 4px' }}>
                      <button
                        onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 18px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#555', fontSize: 14, fontFamily: 'system-ui, sans-serif', textAlign: 'left' as const }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.08)'; e.currentTarget.style.color = '#ff4444' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555' }}
                      >
                        <i className="ti ti-logout" style={{ fontSize: 18 }} />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a href="/signup" style={btnStyle}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#000'; e.currentTarget.style.color = '#01a3fc' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#01a3fc'; e.currentTarget.style.color = '#000' }}
              >SIGN UP</a>
            )}
          </>
        )}

        {/* MOBILE: right side icons */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {currentUser && (
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                justifyContent: 'center', width: 38, height: 38, borderRadius: '50%',
                border: '2px solid #000', backgroundColor: '#01a3fc',
              }}>
                <NotificationDropdown onUnreadChange={() => {}} />
              </div>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              style={{ background: 'none', border: '2px solid #000', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span style={{ display: 'block', width: 20, height: 2, backgroundColor: '#000' }} />
              <span style={{ display: 'block', width: 20, height: 2, backgroundColor: '#000' }} />
              <span style={{ display: 'block', width: 20, height: 2, backgroundColor: '#000' }} />
            </button>
          </div>
        )}
      </nav>

      {/* MOBILE MENU DRAWER */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0d0d0d', zIndex: 999,
          display: 'flex', flexDirection: 'column', padding: 24, gap: 16,
          overflowY: 'auto',
        }}>
          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <a href="/buy">
              <img src="/mobileLOGO.png" alt="Zuro" style={{ height: 28, marginBottom: -10 }} />
            </a>
            <button onClick={() => setMobileMenuOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 28 }}>
              ✕
            </button>
          </div>
         

          {/* Mobile search */}
          <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' as const }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <i className="ti ti-search" style={{ fontSize: 16, color: '#01a3fc' }} />
            </span>
            <input
              type="text"
              placeholder="Search for cars..."
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && navSearch.trim()) {
                  window.location.href = `/buy?search=${encodeURIComponent(navSearch.trim())}`
                }
              }}
              style={{
                width: '100%', padding: '12px 16px 12px 38px', backgroundColor: '#1a1a1a',
                border: '1px solid #333', borderRadius: 8, fontSize: 15, color: '#fff',
                boxSizing: 'border-box' as const, fontFamily: 'system-ui, sans-serif',
              }}
            />
          </div>

          {/* Signed in as */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #01a3fc', overflow: 'hidden', backgroundColor: '#00aaff', flexShrink: 0 }}>
                {navAvatar}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#01a3fc', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Signed in as</p>
                <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 900, color: '#fff' }}>@{profile?.username || 'user'}</p>
              </div>
            </div>
          )}

          {/* Nav links */}
          {[
            { label: 'Buy a Car', href: '/buy', icon: 'car' },
            { label: 'Sell Your Car', href: '/sell', icon: 'tag' },
            ...(currentUser ? [
              { label: 'My Profile', href: '/profile', icon: 'user-circle' },
              { label: 'Messages', href: '/messages', icon: 'message-2' },
            ] : [
              { label: 'Sign Up', href: '/signup', icon: 'user-plus' },
              { label: 'Log In', href: '/login', icon: 'login' },
            ]),
          ].map(item => (
            <a key={item.href} href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 4px', textDecoration: 'none', color: '#fff',
                fontSize: 17, fontWeight: 700, borderBottom: '1px solid #1a1a1a',
              }}
            >
              <i className={`ti ti-${item.icon}`} style={{ fontSize: 22, color: '#01a3fc' }} />
              {item.label}
              {item.label === 'Messages' && unreadMessages > 0 && (
                <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff3b30' }} />
              )}
            </a>
          ))}

          {/* Log out */}
          {currentUser && (
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
              style={{
                marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#ff4444', fontSize: 17, fontWeight: 700, padding: '14px 4px',
              }}
            >
              <i className="ti ti-logout" style={{ fontSize: 22 }} />
              Log Out
            </button>
          )}
        </div>
      )}
    </>
  )
}