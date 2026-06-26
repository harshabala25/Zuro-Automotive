import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'

interface Notification {
  id: string
  type: 'listing_approved' | 'listing_rejected'
  actor_username: string | null
  actor_avatar_url: string | null
  listing_id: string | null
  car_name: string | null
  reason: string | null
  is_read: boolean
  created_at: string
  listings?: { year: number; make: string; model: string; trim: string } | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function notifText(n: Notification) {
  const listing = n.listings
    ? [n.listings.year, n.listings.make, n.listings.model, n.listings.trim].filter(Boolean).join(' ')
    : n.car_name || 'your listing'
  switch (n.type) {
    case 'listing_approved': return `Your ${listing} was approved and is now live`
    case 'listing_rejected': return n.reason ? `Your ${listing} was rejected: ${n.reason}` : `Your ${listing} was rejected`
    default: return 'New notification'
  }
}

interface Props {
  onUnreadChange: (count: number) => void
}

export default function NotificationDropdown({ onUnreadChange }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        fetchUnreadCount(data.user.id)
      }
    })
  }, [])

  useEffect(() => {
    // On desktop: close on outside click
    // On mobile: the backdrop overlay handles this
    if (isMobile) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile])

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, open])

  async function fetchUnreadCount(userId: string) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    const c = count ?? 0
    setUnreadCount(c)
    onUnreadChange(c)
  }

  async function fetchNotifications() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*, listings(year, make, model, trim)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data ?? [])
    setLoading(false)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setUnreadCount(0)
    onUnreadChange(0)
  }

  function handleOpen() {
    if (!open) fetchNotifications()
    setOpen(v => !v)
  }

  const NotifList = (
    <div style={{ maxHeight: isMobile ? 'none' : 360, overflowY: 'auto', flex: isMobile ? 1 : 'none', minHeight: 0 }}>
      {loading && (
        <div style={{ padding: '20px 18px', fontSize: 13, color: '#555', fontFamily: 'system-ui, sans-serif' }}>Loading...</div>
      )}
      {!loading && notifications.length === 0 && (
        <div style={{ padding: '24px 18px', fontSize: 13, color: '#555', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>No notifications yet</div>
      )}
      {!loading && notifications.map(n => {
        const isLinkable = n.type !== 'listing_rejected' && !!n.listing_id
        const rowStyle: React.CSSProperties = {
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid #111',
          textDecoration: 'none',
          cursor: isLinkable ? 'pointer' : 'default',
          backgroundColor: n.is_read ? 'transparent' : 'rgba(1,163,252,0.06)',
          transition: 'background 0.15s',
          // Larger tap target on mobile
          minHeight: isMobile ? 64 : 'auto',
        }
        const content = (
          <>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, alignItems: 'center', backgroundColor: '#1a1a1a', overflow: 'hidden' }}>
              {n.type === 'listing_approved' ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-check" style={{ fontSize: 16, color: '#00cc66' }} />
                </div>
              ) : n.type === 'listing_rejected' ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-x" style={{ fontSize: 16, color: '#ff4444' }} />
                </div>
              ) : n.actor_avatar_url ? (
                <img src={n.actor_avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-user" style={{ fontSize: 16, color: '#888' }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#D3D1C7', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
                {notifText(n)}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#5F5E5A', fontFamily: 'system-ui, sans-serif' }}>
                {timeAgo(n.created_at)}
              </p>
            </div>
            {!n.is_read && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#01a3fc', flexShrink: 0, marginTop: 6 }} />
            )}
          </>
        )
        return isLinkable ? (
          <a
            key={n.id}
            href={`/listing/${n.listing_id}`}
            onClick={() => setOpen(false)}
            style={rowStyle}
            onMouseEnter={e => !isMobile && (e.currentTarget.style.background = 'rgba(1,163,252,0.12)')}
            onMouseLeave={e => !isMobile && (e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(1,163,252,0.06)')}
          >
            {content}
          </a>
        ) : (
          <div key={n.id} style={rowStyle}>{content}</div>
        )
      })}
    </div>
  )

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <div
        onClick={handleOpen}
        role="button"
        aria-label="Notifications"
        style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          justifyContent: 'center', width: 44, height: 44, borderRadius: '50%',
          border: '2px solid #000', cursor: 'pointer',
          backgroundColor: open ? '#000' : '#01a3fc', transition: 'background 0.2s',
        }}
        onMouseEnter={e => {
          if (isMobile) return
          e.currentTarget.style.backgroundColor = '#000';
          (e.currentTarget.querySelector('.bell-icon') as HTMLElement).style.color = '#01a3fc'
        }}
        onMouseLeave={e => {
          if (isMobile) return
          if (!open) {
            e.currentTarget.style.backgroundColor = '#01a3fc';
            (e.currentTarget.querySelector('.bell-icon') as HTMLElement).style.color = '#000'
          }
        }}
      >
        <i className="ti ti-bell bell-icon" style={{ fontSize: 20, color: open ? '#01a3fc' : '#000' }} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 9, height: 9, backgroundColor: '#ff3b30', borderRadius: '50%', border: '2px solid #01a3fc' }} />
        )}
      </div>

      {open && (
        isMobile ? (
          // MOBILE: full-screen bottom sheet with backdrop
          <>
            {/* Backdrop */}
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 998 }}
            />
            {/* Sheet */}
            <div style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              backgroundColor: '#0d0d0d',
              borderRadius: '16px 16px 0 0',
              zIndex: 999,
              display: 'flex', flexDirection: 'column',
              maxHeight: '85vh',
              overflow: 'hidden',
              // Safe area for notched phones
              paddingBottom: 'env(safe-area-inset-bottom)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
            }}>
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#333' }} />
              </div>
              {/* Header */}
              <div style={{ padding: '8px 18px 14px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#01a3fc', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
                  Notifications
                </p>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}>✕</button>
              </div>
              {NotifList}
            </div>
          </>
        ) : (
          // DESKTOP: positioned dropdown — anchored right, capped to viewport
          <>
            <div style={{ position: 'absolute', top: 48, right: 16, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid #0d0d0d', zIndex: 201 }} />
            <div style={{
              position: 'absolute', top: 52, right: 0,
              background: '#0d0d0d', border: '1px solid #1f1f1f',
              borderRadius: 14,
              // Clamp width to not overflow on smaller desktops
              width: 'min(320px, calc(100vw - 32px))',
              zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#01a3fc', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
                  Notifications
                </p>
              </div>
              {NotifList}
            </div>
          </>
        )
      )}
    </div>
  )
}