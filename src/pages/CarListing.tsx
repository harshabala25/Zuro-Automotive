import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import Navbar from '../pages/Navbar'
import BottomBar from '../pages/BottomBar';
import React from 'react';

const THUMB_COUNT = 7

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function TI({ name, size = 18, color }: { name: string; size?: number; color?: string }) {
  return (
    <i
      className={`ti ti-${name}`}
      style={{ fontSize: size, color: color ?? 'inherit', flexShrink: 0, lineHeight: 1 }}
      aria-hidden="true"
    />
  )
}

export default function CarListing() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [thumbStart, setThumbStart] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [carfaxLoading, setCarfaxLoading] = useState(false)
  const navigate = useNavigate()

  const CustomIcon = ({ type, size = 18, color = "#01a3fc" }: { type: string; size?: number; color?: string }) => {
    if (type === "drivetrain") {
      return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="14" height="14" rx="4" fill={color}/>
          <rect x="38" y="10" width="14" height="14" rx="4" fill={color}/>
          <line x1="22" y1="17" x2="38" y2="17" stroke={color} strokeWidth="2.5"/>
          <rect x="8" y="36" width="14" height="14" rx="4" fill={color}/>
          <rect x="38" y="36" width="14" height="14" rx="4" fill={color}/>
          <line x1="22" y1="43" x2="38" y2="43" stroke={color} strokeWidth="2.5"/>
          <line x1="30" y1="17" x2="30" y2="43" stroke={color} strokeWidth="2.5"/>
        </svg>
      )
    }
    if (type === "transmission") {
      return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="12" x2="15" y2="48" stroke={color} strokeWidth="1.5"/>
          <line x1="30" y1="12" x2="30" y2="48" stroke={color} strokeWidth="1.5"/>
          <line x1="45" y1="12" x2="45" y2="48" stroke={color} strokeWidth="1.5"/>
          <line x1="15" y1="30" x2="45" y2="30" stroke={color} strokeWidth="1.5"/>
          <circle cx="15" cy="12" r="5" fill={color}/>
          <circle cx="30" cy="12" r="5" fill={color}/>
          <circle cx="45" cy="12" r="5" fill={color}/>
          <circle cx="15" cy="48" r="5" fill={color}/>
          <circle cx="30" cy="48" r="5" fill={color}/>
          <circle cx="45" cy="48" r="5" fill={color}/>
        </svg>
      )
    }
    return null
  }

  useEffect(() => {
    async function fetchListing() {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles(username, avatar_url), user_id')
        .eq('id', id)
        .single()
      if (error || !data) { setNotFound(true); setCar(null) }
      else setCar(data)
      if (userData.user && id) {
        const { data: favData } = await supabase
          .from('favorites').select('id').eq('user_id', userData.user.id).eq('listing_id', id).maybeSingle()
        setLiked(!!favData)
      }
      setLoading(false)
    }
    if (id) fetchListing()
  }, [id])

  async function handleLike() {
    if (!user) { window.location.href = '/login'; return }
    if (String(user.id) === String(car?.user_id)) return
    if (likeLoading) return
    if (car?.status !== 'approved' && !liked) return // block new likes on non-approved listings
    setLikeLoading(true)
    if (liked) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', id)
      setLiked(false)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: id })
      setLiked(true)
    }
    setLikeLoading(false)
  }

  async function handleViewCarfax() {
    if (!user) { window.location.href = '/login'; return }
    if (!car?.carfax_url || carfaxLoading) return
    setCarfaxLoading(true)
    const { data, error } = await supabase.storage.from('carfax').createSignedUrl(car.carfax_url, 60)
    setCarfaxLoading(false)
    if (error || !data?.signedUrl) { alert('Could not load the Carfax report. Please try again.'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  function goTo(index: number) {
    const photos = car?.photos || []
    const clamped = Math.max(0, Math.min(photos.length - 1, index))
    setCurrentIndex(clamped)
    if (clamped < thumbStart) setThumbStart(clamped)
    else if (clamped >= thumbStart + THUMB_COUNT) setThumbStart(clamped - THUMB_COUNT + 1)
  }

  function shiftThumbs(dir: number) {
    const photos = car?.photos || []
    const next = thumbStart + dir
    if (next < 0 || next + THUMB_COUNT > photos.length) return
    setThumbStart(next)
  }

  const specRow = (
    iconName: string,
    label: string,
    value: string | number | null | undefined,
    customIcon?: React.ReactNode
  ) => {
    if (value === null || value === undefined || value === '') return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #141414', fontFamily: 'system-ui, sans-serif' }}>
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {customIcon ?? <TI name={iconName} size={16} color="#01a3fc" />}
        </span>
        <span style={{ fontSize: 12, color: '#01a3fc', minWidth: 90, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: 13, color: '#ddd', fontWeight: 500, marginLeft: 'auto', textAlign: 'right' }}>{value}</span>
      </div>
    )
  }

  const sectionTitle = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#01a3fc', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #141414' }}>{label}</div>
  )

  if (loading) return (
    <div style={{ backgroundColor: '#060606', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#01a3fc', fontFamily: 'system-ui, sans-serif', letterSpacing: 2, fontSize: 13, textTransform: 'uppercase' }}>Loading Car...</p>
    </div>
  )

  if (notFound || !car) return (
    <div style={{ backgroundColor: '#060606', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#fff', fontSize: 24, fontWeight: 900 }}>Listing not found</p>
      <a href="/buy" style={{ color: '#01a3fc', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>← Back to listings</a>
    </div>
  )

  const photos: string[] = car.photos?.length > 0
    ? car.photos
    : [`https://via.placeholder.com/900x550/111111/01a3fc?text=${encodeURIComponent(car.make || 'Car')}`]

  const seller = car.profiles
  const fuelType = car.fuel_type || ''
  const isPHEV = fuelType === 'PHEV'
  const hasGasEngine = ['Gasoline', 'Diesel', 'Hybrid', 'PHEV', 'Hydrogen'].includes(fuelType)
  const hasMPG = ['Gasoline', 'Diesel', 'Hybrid', 'PHEV', 'Hydrogen'].includes(fuelType)
  const hasMPGe = ['PHEV', 'Electric'].includes(fuelType)
  const hasRange = ['PHEV', 'Electric', 'Hydrogen'].includes(fuelType)
  const mpgLine = hasMPG && car.mpg_city && car.mpg_highway ? `${car.mpg_city} City / ${car.mpg_highway} Highway` : null
  const mpgeLine = hasMPGe && car.mpge_city && car.mpge_highway ? `${car.mpge_city} City / ${car.mpge_highway} Highway` : null
  const rangeLine = hasRange && car.range_miles ? `${car.range_miles} miles${isPHEV ? ' (EV-only)' : ''}` : null
  const engineStr = fuelType === 'Hydrogen'
    ? car.engine_type
    : hasGasEngine && car.engine_displacement && car.engine_type
      ? `${car.engine_displacement}L ${car.engine_aspiration ?? ''} ${car.engine_type}`.trim()
      : null

  const SellerActions = () => (
    car && user ? (
      String(user.id).trim() === String(car.user_id).trim() ? (
        car.status === 'sold' ? (
          <div style={{ backgroundColor: '#0a1a0a', border: '1px solid #01a3fc', color: '#01a3fc', padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: 12, letterSpacing: '1px' }}>SOLD</div>
        ) : (
          car.status !== 'pending' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  const { error } = await supabase.from('listings').update({ status: 'sold', sold_at: new Date().toISOString(), sold_price: car.price }).eq('id', car.id).eq('user_id', user.id)
                  if (error) alert('Failed to mark as sold. Please try again.')
                  else window.location.reload()
                }}
                style={{ backgroundColor: 'transparent', border: '1.5px solid #01a3fc', color: '#01a3fc', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase', minHeight: 44 }}
              >MARK AS SOLD</button>
              <button
                onClick={async () => {
                  const confirmed = window.confirm('Are you sure you want to delete this listing? This cannot be undone.')
                  if (!confirmed) return
                  for (const photoUrl of car.photos) {
                    const filePath = decodeURIComponent(photoUrl.split('/car-photos/')[1])
                    await supabase.storage.from('car-photos').remove([filePath])
                  }
                  if (car.carfax_url) await supabase.storage.from('carfax').remove([car.carfax_url])
                  const { error } = await supabase.from('listings').delete().eq('id', car.id).eq('user_id', user.id)
                  if (error) alert('Failed to delete listing. Please try again.')
                  else navigate('/buy')
                }}
                style={{ backgroundColor: 'transparent', border: '1.5px solid #ff4444', color: '#ff4444', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase', minHeight: 44 }}
              >DELETE</button>
            </div>
          ) : null
        )
      ) : (
        car.status === 'sold' ? (
          <div style={{ backgroundColor: 'rgba(255,68,68,0.08)', border: '1.5px solid #ff4444', color: '#ff4444', padding: '10px 22px', borderRadius: 8, fontWeight: 900, fontSize: 13, letterSpacing: '1px' }}>SOLD</div>
        ) : (
          <button
            onClick={async () => {
              try {
                const { data: existing } = await supabase.from('conversations').select('id')
                  .or(`and(buyer_id.eq.${user.id},seller_id.eq.${car.user_id}),and(buyer_id.eq.${car.user_id},seller_id.eq.${user.id})`)
                  .maybeSingle()
                if (existing) { navigate(`/messages?conversation=${existing.id}`); return }
                const { data: newConvo, error } = await supabase.from('conversations').insert({ buyer_id: user.id, seller_id: car.user_id }).select().single()
                if (error) throw error
                if (newConvo) navigate(`/messages?conversation=${newConvo.id}`)
              } catch (err) {}
            }}
            style={{ backgroundColor: '#01a3fc', color: '#000', padding: '10px 24px', borderRadius: 8, fontWeight: 900, fontSize: 13, border: 'none', letterSpacing: '1px', whiteSpace: 'nowrap', cursor: 'pointer', textTransform: 'uppercase', minHeight: 44 }}
          >INQUIRE MORE</button>
        )
      )
    ) : !user ? (
      <a href="/login" style={{ backgroundColor: '#01a3fc', color: '#000', padding: '10px 24px', borderRadius: 8, fontWeight: 900, fontSize: 13, textDecoration: 'none', letterSpacing: '1px', whiteSpace: 'nowrap', textTransform: 'uppercase', display: 'inline-block' }}>LOG IN TO INQUIRE</a>
    ) : null
  )

  // ─── GALLERY ───────────────────────────────────────────────────────────────
  const Gallery = (
    <div style={{ width: '100%' }}>
      {/* MAIN PHOTO */}
      <div style={{ position: 'relative', borderRadius: '14px 14px 0 0', overflow: 'hidden', backgroundColor: '#111' }}>
        <img
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          style={{ width: '100%', height: isMobile ? 240 : 460, objectFit: 'cover', display: 'block' }}
        />
        <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)',
          color: currentIndex === 0 ? '#333' : '#fff',
          fontSize: 18, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === photos.length - 1} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)',
          color: currentIndex === photos.length - 1 ? '#333' : '#fff',
          fontSize: 18, cursor: currentIndex === photos.length - 1 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
        <div style={{ position: 'absolute', bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#fff', letterSpacing: '0.5px' }}>
          {currentIndex + 1} / {photos.length}
        </div>
          {user && String(user.id) !== String(car?.user_id) && (car?.status === 'approved' || liked) && (
            <button onClick={handleLike} disabled={likeLoading} style={{
              position: 'absolute', top: 14, right: 14,
              width: 38, height: 38, borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.55)',
              border: liked ? '1px solid #01a3fc' : '1px solid rgba(255,255,255,0.15)',
              color: liked ? '#01a3fc' : '#fff',
              cursor: likeLoading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: likeLoading ? 0.6 : 1,
            }}>
              {liked
                ? <i className="ti ti-heart-filled" style={{ fontSize: 16 }} aria-hidden="true" />
                : <i className="ti ti-heart" style={{ fontSize: 16 }} aria-hidden="true" />}
            </button>
          )}
      </div>
      {/* THUMBNAIL STRIP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: isMobile ? '8px 10px' : '10px 14px' }}>
        <button onClick={() => shiftThumbs(-1)} disabled={thumbStart === 0} style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, backgroundColor: thumbStart === 0 ? '#111' : '#1a1a1a', border: '1px solid #2a2a2a', color: thumbStart === 0 ? '#333' : '#fff', cursor: thumbStart === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>‹</button>
        <div style={{ display: 'flex', gap: 5, flex: 1, overflow: 'hidden' }}>
          {photos.slice(thumbStart, thumbStart + THUMB_COUNT).map((photo, i) => {
            const actualIndex = thumbStart + i
            return (
              <img key={actualIndex} src={photo} alt={`Thumb ${actualIndex + 1}`}
                onClick={() => goTo(actualIndex)}
                style={{ flex: 1, minWidth: 0, height: isMobile ? 44 : 56, objectFit: 'cover', borderRadius: 7, cursor: 'pointer', border: actualIndex === currentIndex ? '2px solid #01a3fc' : '2px solid transparent', opacity: actualIndex === currentIndex ? 1 : 0.45, transition: 'border 0.2s, opacity 0.2s' }}
              />
            )
          })}
        </div>
        <button onClick={() => shiftThumbs(1)} disabled={thumbStart + THUMB_COUNT >= photos.length} style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, backgroundColor: thumbStart + THUMB_COUNT >= photos.length ? '#111' : '#1a1a1a', border: '1px solid #2a2a2a', color: thumbStart + THUMB_COUNT >= photos.length ? '#333' : '#fff', cursor: thumbStart + THUMB_COUNT >= photos.length ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>›</button>
      </div>
    </div>
  )

  // ─── DETAILS CARD ──────────────────────────────────────────────────────────
  const DetailsCard = (
    <div style={{ backgroundColor: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      {/* SELLER BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: isMobile ? '14px 16px' : '18px 22px', borderBottom: '1px solid #141414' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {seller?.avatar_url ? (
            <img src={seller.avatar_url} alt="Seller" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #01a3fc' }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#1a1a1a', border: '2px solid #01a3fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Seller</div>
            <a href={`/profile/${seller?.username}`} style={{ color: '#01a3fc', fontWeight: 900, textDecoration: 'none', fontSize: 15 }}>{seller?.username || 'Unknown'}</a>
          </div>
        </div>
        <SellerActions />
      </div>

      {/* QUICK PILLS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', borderBottom: '1px solid #141414' }}>
        {[
          { label: 'Title', value: car.title_status, highlight: car.title_status === 'Clean' ? '#4caf50' : '#ff6b6b' },
          { label: 'Owners', value: car.num_owners },
          { label: 'Accidents', value: car.num_accidents },
          { label: 'Location', value: car.city && car.state ? `${car.city}, ${car.state} ${car.zip}` : null, link: car.city ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${car.city}, ${car.state} ${car.zip}`)}` : undefined },
        ].filter(item => item.value !== null && item.value !== undefined).map((item, i, arr) => (
          <div key={item.label} style={{ padding: isMobile ? '12px 10px' : '14px 12px', textAlign: 'center', borderRight: isMobile ? (i % 2 === 0 ? '1px solid #141414' : 'none') : (i < arr.length - 1 ? '1px solid #141414' : 'none'), borderBottom: isMobile && i < arr.length - 2 ? '1px solid #141414' : 'none' }}>
            <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{item.label}</div>
            {item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: '#01a3fc', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{item.value}</a>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 700, color: (item as any).highlight ?? '#ddd' }}>{item.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <div style={{ padding: isMobile ? '16px' : '20px 22px', borderBottom: '1px solid #141414' }}>
        {sectionTitle('Features')}
        {car.features?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {car.features.map((f: string, i: number) => (
              <span key={i} style={{ background: '#111', border: '1px solid #01a3fc', color: '#01a3fc', padding: '5px 12px', borderRadius: 20, fontSize: 12 }}>{f}</span>
            ))}
          </div>
        ) : <p style={{ color: '#aaa', margin: 0, fontSize: 13, fontStyle: 'italic' }}>None reported by seller</p>}
      </div>

      {/* KNOWN DAMAGE */}
      <div style={{ padding: isMobile ? '16px' : '20px 22px', borderBottom: '1px solid #141414' }}>
        {sectionTitle('Known Damage')}
        {car.known_damage?.length > 0 ? (
          <ul style={{ color: '#ccc', paddingLeft: 20, lineHeight: 2, margin: 0, fontSize: 13 }}>
            {car.known_damage.map((d: string, i: number) => <li key={i}>{d}</li>)}
          </ul>
        ) : <p style={{ color: '#aaa', margin: 0, fontSize: 13, fontStyle: 'italic' }}>None reported by seller</p>}
      </div>

      {/* MODIFICATIONS */}
      <div style={{ padding: isMobile ? '16px' : '20px 22px', borderBottom: car.owners_note ? '1px solid #141414' : 'none' }}>
        {sectionTitle('Modifications')}
        {car.modifications?.length > 0 ? (
          <ul style={{ color: '#ccc', paddingLeft: 20, lineHeight: 2, margin: 0, fontSize: 13 }}>
            {car.modifications.map((m: string, i: number) => <li key={i}>{m}</li>)}
          </ul>
        ) : <p style={{ color: '#aaa', margin: 0, fontSize: 13, fontStyle: 'italic' }}>None reported by seller</p>}
      </div>

      {/* OWNER'S NOTE */}
      {car.owners_note && (
        <div style={{ padding: isMobile ? '16px' : '20px 22px', borderBottom: '1px solid #141414' }}>
          {sectionTitle("Owner's Note")}
          <div style={{ borderLeft: '2px solid #01a3fc', padding: '10px 16px', color: '#aaa', fontSize: 14, lineHeight: 1.8, backgroundColor: '#0a0a0a', borderRadius: '0 8px 8px 0' }}>
            {car.owners_note}
          </div>
        </div>
      )}

      {/* DISCLAIMER */}
      <div style={{ padding: isMobile ? '14px' : '18px 22px' }}>
        <div style={{ border: '1px solid #01a3fc', borderRadius: '10px', padding: '16px', backgroundColor: '#0a0a0a' }}>
          <div style={{ color: '#01a3fc', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>⚠ Zuro Disclaimer</div>
          <p style={{ color: '#aaa', lineHeight: 1.8, fontSize: 13, margin: 0 }}>
            While we strive to ensure the accuracy of our listings, all vehicle information is provided directly by the seller.
            If we believe a listing to be suspicious, we will take it down. However, buyers are independently responsible for verifying all details—including the vehicle's actual condition, history, and any known flaws—and ensuring the vehicle can be legally registered and driven in their location.
            All sales agreements and deposits are finalized directly with the seller and are subject to their respective terms. We are not responsible for any disputes, losses, or inaccuracies related to a listing or transaction.
          </p>
        </div>
      </div>
    </div>
  )

  // ─── SPECS CARD ────────────────────────────────────────────────────────────
  const SpecsCard = (
    <div style={{ flex: 1, width: isMobile ? '100%' : 'auto', marginTop: isMobile ? 0 : -60, backgroundColor: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ backgroundColor: '#01a3fc', padding: '14px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#000', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>Price</div>
        <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: '#000' }}>${car.price?.toLocaleString()}</div>
      </div>
      <div style={{ padding: '4px 18px 8px', color: '#01a3fc' }}>
        {specRow('car-suv', 'Body', car.body_style)}
        {specRow('road', 'Mileage', car.mileage ? `${car.mileage.toLocaleString()} mi` : null)}
        {specRow('gas-station', 'Fuel', car.fuel_type)}
        {specRow('gauge', 'MPG', mpgLine)}
        {specRow('plug', 'MPGe', mpgeLine)}
        {specRow('map-route', isPHEV ? 'EV Range' : 'Range', rangeLine)}
        {specRow('', 'Drivetrain', car.drivetrain, <CustomIcon type="drivetrain" size={16} color="#01a3fc" />)}
        {specRow('', 'Transmission',
          car.transmission
            ? car.transmission_speeds
              ? `${car.transmission} (${car.transmission_speeds === 'CVT' ? 'CVT' : `${car.transmission_speeds}-Speed`})`
              : car.transmission
            : null,
          <CustomIcon type="transmission" size={16} color="#01a3fc" />
        )}
        {engineStr && specRow('engine', 'Engine', engineStr)}
        {specRow('bolt', 'Motor', car.electric_motor_type)}
        {specRow('palette', 'Exterior Color', car.exterior_color)}
        {specRow('sofa', 'Interior Color', car.interior_color)}
        {specRow('horse', 'Horsepower', car.horsepower)}
        {specRow('barcode', 'VIN', car.vin)}
      </div>
      {car.carfax_url && (
        <div style={{ padding: '0 16px 9px' }}>
          {user ? (
            <button onClick={handleViewCarfax} disabled={carfaxLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: 'transparent', border: '1.5px solid #01a3fc', color: '#01a3fc', padding: '12px', borderRadius: 9, fontWeight: 700, fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase', cursor: carfaxLoading ? 'wait' : 'pointer', opacity: carfaxLoading ? 0.6 : 1, fontFamily: 'inherit', minHeight: 44 }}>
              <TI name="file-description" size={16} color="#01a3fc" />
              {carfaxLoading ? 'LOADING...' : 'CARFAX® REPORT'}
            </button>
          ) : (
            <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'transparent', border: '1.5px solid #01a3fc', color: '#01a3fc', padding: '12px', borderRadius: 9, fontWeight: 700, fontSize: 13, textDecoration: 'none', letterSpacing: '1px', textTransform: 'uppercase', minHeight: 44 }}>
              <TI name="file-description" size={16} color="#01a3fc" />
              LOG IN TO VIEW CARFAX
            </a>
          )}
            <p
              style={{
                fontSize: '10px',
                color: '#777',
                lineHeight: 1.2,
                marginTop: '10px'
              }}
            >
              Disclaimer: Vehicle history information is subject to the accuracy and completeness of data reported to CARFAX®. Please review the full report for complete details.
            </p>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ backgroundColor: '#060606', minHeight: '100vh', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px 12px' : '32px 24px' }}>

        {/* TITLE */}
       <h1
          style={{
            fontSize: 'clamp(14px, 2.5vw, 34px)',
            fontWeight: 900,
            marginBottom: isMobile ? 14 : 20,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: 1.1,
            whiteSpace: 'nowrap'
          }}
        >
          {car.year} {car.make}{' '}
          <span style={{ color: '#ffffff' }}>{car.model}</span>
          {car.trim && car.trim !== 'Base' ? ` ${car.trim}` : ''}
        </h1>


        {isMobile ? (
          // ── MOBILE: everything stacked ──────────────────────────────────────
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Gallery}
            {SpecsCard}
            {DetailsCard}
          </div>
        ) : (
          // ── DESKTOP: left column (gallery + details) | right column (specs) ─
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* LEFT COLUMN — gallery + details card, width naturally set by gallery */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0, maxWidth: 748 }}>
              {Gallery}
              {DetailsCard}
            </div>
            {/* RIGHT COLUMN — specs card */}
            <div style={{ width: 400, flexShrink: 0, marginTop: -10 }}>
              {SpecsCard}
            </div>
          </div>
        )}

      </div>
      <BottomBar />
    </div>
  )
}