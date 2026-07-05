import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'


type Listing = {
  id: string
  make: string
  model: string
  trim: string
  year: number
  vin: string
  price: number
  mileage: number
  mpg_city: number
  mpg_highway: number
  mpge_city: number
  mpge_highway: number
  range_miles: number
  city: string
  state: string
  zip: string
  exterior_color: string
  interior_color: string
  fuel_type: string
  drivetrain: string
  transmission: string
  transmission_speeds: string
  engine_type: string
  engine_aspiration: string
  engine_displacement: number
  horsepower: number
  body_style: string
  title_status: string
  num_owners: number
  num_accidents: number
  known_damage: string[]
  modifications: string[]
  features: string[]
  owners_note: string
  photos: string[]
  carfax_url: string
  status: string
  user_id: string
  created_at: string
  sold_at: string | null
  sold_price: number | null
}

const REJECTION_REASONS = [
  'Inappropriate or offensive photos',
  'Photos do not match the listed vehicle',
  'Inaccurate vehicle information',
  'Duplicate listing',
  'Missing or invalid Carfax report',
  'Suspected fraudulent listing',
  'Price is unrealistic',
  'Custom reason...',
]

type NotificationType = 'listing_approved' | 'listing_rejected'

async function createNotification(params: {
  userId: string
  type: NotificationType
  carName: string
  listingId?: string | null
  reason?: string | null
}) {
  const { userId, type, carName, listingId = null, reason = null } = params

  const { data: { user: actor } } = await supabase.auth.getUser()
  if (!actor) {
    console.error('Failed to create notification: no authenticated admin user found')
    return
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    actor_id: actor.id,
    type,
    listing_id: listingId,
    car_name: carName,
    reason,
    is_read: false,
  })
  if (error) console.error('Failed to create notification:', error)
}

const EDITABLE_TEXT_FIELDS: { key: keyof Listing; label: string }[] = [
  { key: 'body_style', label: 'Body Style' },
  { key: 'fuel_type', label: 'Fuel Type' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'exterior_color', label: 'Exterior' },
  { key: 'interior_color', label: 'Interior' },
  { key: 'engine_type', label: 'Engine Type' },
  { key: 'engine_aspiration', label: 'Engine Aspiration' },
]

const EDITABLE_NUMBER_FIELDS: { key: keyof Listing; label: string; suffix: string }[] = [
  { key: 'horsepower', label: 'Horsepower', suffix: ' hp' },
  { key: 'engine_displacement', label: 'Engine Displacement', suffix: 'L' },
]

function getEconomyFields(fuelType: string): { key: keyof Listing; label: string; suffix: string }[] {
  switch (fuelType) {
    case 'Electric':
    case 'Hydrogen':
      return [{ key: 'range_miles', label: 'Range', suffix: ' mi' }]
    case 'PHEV':
      return [
        { key: 'mpge_city', label: 'MPGe City', suffix: ' MPGe' },
        { key: 'mpge_highway', label: 'MPGe Highway', suffix: ' MPGe' },
      ]
    case 'Gasoline':
    case 'Diesel':
    case 'Hybrid':
    default:
      return [
        { key: 'mpg_city', label: 'MPG City', suffix: ' mpg' },
        { key: 'mpg_highway', label: 'MPG Highway', suffix: ' mpg' },
      ]
  }
}

function ListSection({
  label,
  color,
  items,
  editing,
  onChange,
}: {
  label: string
  color: string
  items: string[]
  editing: boolean
  onChange: (next: string[]) => void
}) {
  const list = items ?? []

  function updateAt(i: number, val: string) {
    const next = [...list]
    next[i] = val
    onChange(next)
  }

  function removeAt(i: number) {
    onChange(list.filter((_, idx) => idx !== i))
  }

  function addBlank() {
    onChange([...list, ''])
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', border: `1px solid ${editing ? color : '#1a1a1a'}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
      <p style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 12px' }}>
        {label}
      </p>

      {list.length === 0 && !editing && (
        <p style={{ color: '#444', fontSize: 13, fontStyle: 'italic', margin: 0 }}>None</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((item, i) =>
          editing ? (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={item}
                onChange={e => updateAt(i, e.target.value)}
                style={{
                  flex: 1, padding: '10px 14px', backgroundColor: '#111',
                  border: '1px solid #333', borderRadius: 8, color: '#fff',
                  fontSize: 14, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => removeAt(i)}
                title="Remove"
                style={{ background: 'none', border: '1px solid #333', borderRadius: 8, color: '#888', fontSize: 14, padding: '9px 12px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <p key={i} style={{ color: '#fff', fontSize: 14, margin: 0 }}>• {item}</p>
          )
        )}
      </div>

      {editing && (
        <button
          onClick={addBlank}
          style={{ marginTop: 10, background: 'none', border: `1px dashed ${color}88`, borderRadius: 8, color, fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}
        >
          + Add
        </button>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const [editing, setEditing] = useState(false)
  const [sellerAvatar, setSellerAvatar] = useState<string>('')
  const [editData, setEditData] = useState<Listing | null>(null)
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sellerUsername, setSellerUsername] = useState<string>('')
  const [listings, setListings] = useState<Listing[]>([])
  const [selected, setSelected] = useState<Listing | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'sold'>('pending')

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (error || !profile?.is_admin) { window.location.href = '/'; return }

      setAuthed(true)
      fetchListings('pending')

      const channel = supabase
        .channel('listings-changes')
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'listings' }, (payload) => {
          setListings(l => l.filter(x => x.id !== payload.old.id))
          setSelected(s => s?.id === payload.old.id ? null : s)
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, (payload) => {
          if (payload.new.status === 'sold') {
            setListings(l => l.filter(x => x.id !== payload.new.id))
            setSelected(s => s?.id === payload.new.id ? null : s)
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!selected) return
    getSellerProfile(selected.user_id).then(({ username, avatar_url }) => {
      setSellerUsername(username)
      setSellerAvatar(avatar_url)
    })
  }, [selected])

  async function fetchListings(status: 'pending' | 'approved' | 'sold') {
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    setListings(data || [])
    setSelected(null)
    setLoading(false)
  }

  async function getSellerProfile(userId: string): Promise<{ username: string; avatar_url: string }> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single()
    return { username: profile?.username || '', avatar_url: profile?.avatar_url || '' }
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove() {
    if (!selected) return
    setActionLoading(true)
    const { error } = await supabase.from('listings').update({ status: 'approved' }).eq('id', selected.id)

    if (error) { showToast('Failed to approve listing.', 'error'); setActionLoading(false); return }

    const carName = [selected.year, selected.make, selected.model, selected.trim].filter(Boolean).join(' ')
    await createNotification({ userId: selected.user_id, type: 'listing_approved', carName, listingId: selected.id })

    showToast('Listing approved and seller notified.', 'success')
    setListings(l => l.filter(x => x.id !== selected.id))
    setSelected(null)
    setActionLoading(false)
  }

  async function handleReject() {
    if (!selected) return
    const reason = rejectionReason === 'Custom reason...' ? customReason : rejectionReason
    if (!reason.trim()) { showToast('Please select or enter a rejection reason.', 'error'); return }
    setActionLoading(true)

    const carName = `${selected.year} ${selected.make} ${selected.model} ${selected.trim}`

    for (const photoUrl of selected.photos || []) {
      const filePath = decodeURIComponent(photoUrl.split('/car-photos/')[1])
      const { error: photoError } = await supabase.storage.from('car-photos').remove([filePath])
      if (photoError) console.error('Failed to delete photo:', filePath, photoError)
    }

    const { error } = await supabase.from('listings').delete().eq('id', selected.id)

    if (error) { showToast('Failed to reject listing.', 'error'); setActionLoading(false); return }

    await createNotification({ userId: selected.user_id, type: 'listing_rejected', carName, reason })

    showToast('Listing rejected and seller notified.', 'success')
    setListings(l => l.filter(x => x.id !== selected.id))
    setSelected(null)
    setRejecting(false)
    setRejectionReason('')
    setCustomReason('')
    setActionLoading(false)
  }

  async function handleSaveEdit() {
    if (!selected || !editData) return
    setActionLoading(true)
    const { error } = await supabase.from('listings').update(editData).eq('id', selected.id)

    if (error) { showToast('Failed to save changes.', 'error'); setActionLoading(false); return }

    setListings(l => l.map(x => x.id === editData.id ? editData : x))
    setSelected(editData)
    setEditing(false)
    setEditData(null)
    showToast('Listing updated successfully.', 'success')
    setActionLoading(false)
  }

  async function handleDelete() {
    if (!selected) return
    const confirmed = window.confirm(
      `Are you sure you want to delete "${selected.year} ${selected.make} ${selected.model} ${selected.trim}"? This cannot be undone.`
    )
    if (!confirmed) return

    setActionLoading(true)

    for (const photoUrl of selected.photos || []) {
      const filePath = decodeURIComponent(photoUrl.split('/car-photos/')[1])
      const { error: photoError } = await supabase.storage.from('car-photos').remove([filePath])
      if (photoError) console.error('Failed to delete photo:', filePath, photoError)
    }

    const { error } = await supabase.from('listings').delete().eq('id', selected.id)

    if (error) { showToast('Failed to delete listing.', 'error'); setActionLoading(false); return }

    showToast('Listing deleted.', 'success')
    setListings(l => l.filter(x => x.id !== selected.id))
    setSelected(null)
    setActionLoading(false)
  }

  if (!authed) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', backgroundColor: '#111',
    border: '1px solid #333', borderRadius: 8, color: '#fff',
    fontSize: 14, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#0a1a0a' : '#1a0505',
          border: `1px solid ${toast.type === 'success' ? '#00cc66' : '#ff4444'}`,
          borderRadius: 10, padding: '14px 20px',
          color: toast.type === 'success' ? '#00cc66' : '#ff8080',
          fontSize: 14, fontWeight: 700,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ backgroundColor: '#01a3fc', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/ZuroLogBlue.png" alt="Zuro" style={{ height: 24 }} />
        </div>
        <button
          onClick={() => { window.location.href = '/profile' }}
          style={{ background: '#01a3fc', border: '2px solid #000', borderRadius: 6, padding: '8px 16px', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          Profile
        </button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>

        {/* LEFT */}
        <div style={{ width: 340, borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
            {(['pending', 'approved', 'sold'] as const).map(tab => (
              <button key={tab} onClick={() => { setFilter(tab); fetchListings(tab) }} style={{
                flex: 1, padding: '14px 0', border: 'none', cursor: 'pointer',
                backgroundColor: filter === tab ? '#0a0a0a' : '#000',
                color: filter === tab ? '#01a3fc' : '#555',
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
              }}>
                {tab}
              </button>
            ))}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 32, color: '#555', fontSize: 13, textAlign: 'center' }}>Loading...</div>
            ) : listings.length === 0 ? (
              <div style={{ padding: 32, color: '#555', fontSize: 13, textAlign: 'center' }}>No {filter} listings</div>
            ) : listings.map(l => (
              <div
                key={l.id}
                onClick={() => {
                  setSelected(l); setPhotoIndex(0); setRejecting(false)
                  setRejectionReason(''); setCustomReason('')
                  setEditing(false); setEditData(null)
                }}
                style={{
                  padding: '16px 20px', borderBottom: '1px solid #111', cursor: 'pointer',
                  backgroundColor: selected?.id === l.id ? '#0a0a0a' : 'transparent',
                  borderLeft: selected?.id === l.id ? '3px solid #01a3fc' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{l.year} {l.make} {l.model} {l.trim}</p>
                    <p style={{ color: '#b6b5b5', fontSize: 12, margin: '0 0 6px' }}>{l.city}, {l.state}</p>
                    <p style={{ color: '#01a3fc', fontSize: 13, fontWeight: 700, margin: 0 }}>${l.price?.toLocaleString()}</p>
                  </div>
                  {l.photos?.[0] && (
                    <img src={l.photos[0]} alt="" style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #222' }} />
                  )}
                </div>
                <p style={{ color: '#b6b5b5', fontSize: 11, margin: '8px 0 0' }}>
                  {new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 40 }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ color: '#333', fontSize: 14 }}>Select a listing to review</p>
            </div>
          ) : (
            <div style={{ maxWidth: 760 }}>

              {/* Title + Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div style={{ flex: 1, marginRight: 20 }}>
                  {editing && editData ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <input type="number" value={editData.year} onChange={e => setEditData({ ...editData, year: Number(e.target.value) })} placeholder="Year" style={{ ...inputStyle, padding: '6px 10px', fontSize: 15, fontWeight: 900 }} />
                      <input type="text" value={editData.make} onChange={e => setEditData({ ...editData, make: e.target.value })} placeholder="Make" style={{ ...inputStyle, padding: '6px 10px', fontSize: 15, fontWeight: 900 }} />
                      <input type="text" value={editData.model} onChange={e => setEditData({ ...editData, model: e.target.value })} placeholder="Model" style={{ ...inputStyle, padding: '6px 10px', fontSize: 15, fontWeight: 900 }} />
                      <input type="text" value={editData.trim} onChange={e => setEditData({ ...editData, trim: e.target.value })} placeholder="Trim" style={{ ...inputStyle, padding: '6px 10px', fontSize: 15, fontWeight: 900 }} />
                    </div>
                  ) : (
                    <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>
                      {selected.year} {selected.make} {selected.model} {selected.trim}
                    </h1>
                  )}
                  <p style={{ color: '#b6b5b5', fontSize: 13, margin: '0 0 10px' }}>VIN: {selected.vin}</p>
                  <a
                    href={`/profile/${sellerUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: '#01a3fc', borderRadius: 50, padding: '6px 16px 6px 6px' }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#000', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sellerAvatar ? (
                        <img src={sellerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#01a3fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ color: '#000', fontWeight: 700, fontSize: 13 }}>{sellerUsername || 'Unknown'}</span>
                  </a>
                </div>

                {filter === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!editing ? (
                      <>
                        <button onClick={() => { setEditing(true); setEditData(selected) }} style={{ padding: '10px 20px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          EDIT
                        </button>
                        <button onClick={() => setRejecting(r => !r)} disabled={actionLoading} style={{ padding: '10px 20px', backgroundColor: '#1a0505', color: '#ff4444', border: '1px solid #ff4444', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: 1 }}>
                          REJECT
                        </button>
                        <button onClick={handleApprove} disabled={actionLoading} style={{ padding: '10px 20px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: 'pointer', letterSpacing: 1 }}>
                          {actionLoading ? 'SAVING...' : 'APPROVE'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleSaveEdit} disabled={actionLoading} style={{ padding: '10px 20px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
                          {actionLoading ? 'SAVING...' : 'SAVE'}
                        </button>
                        <button onClick={() => { setEditing(false); setEditData(null) }} style={{ padding: '10px 20px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          CANCEL
                        </button>
                      </>
                    )}
                  </div>
                )}

                {filter === 'approved' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleDelete} disabled={actionLoading} style={{ padding: '10px 20px', backgroundColor: '#1a0505', color: '#ff4444', border: '1px solid #ff4444', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: 1 }}>
                      {actionLoading ? 'DELETING...' : 'DELETE'}
                    </button>
                  </div>
                )}

                {filter === 'sold' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ backgroundColor: '#0a1a0a', border: '1px solid #00cc66', borderRadius: 20, padding: '6px 16px', color: '#00cc66', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>SOLD</span>
                    {selected.sold_at && <span style={{ color: '#555', fontSize: 12 }}>{new Date(selected.sold_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                    {selected.sold_price && <span style={{ color: '#00cc66', fontSize: 14, fontWeight: 700 }}>Sold for ${selected.sold_price.toLocaleString()}</span>}
                  </div>
                )}
              </div>

              {/* Rejection Panel */}
              {rejecting && filter === 'pending' && (
                <div style={{ backgroundColor: '#1a0505', border: '1px solid #ff4444', borderRadius: 10, padding: '20px', marginBottom: 24 }}>
                  <p style={{ color: '#ff4444', fontWeight: 900, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>Select Rejection Reason</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {REJECTION_REASONS.map(r => (
                      <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <input type="radio" name="reason" value={r} checked={rejectionReason === r} onChange={() => setRejectionReason(r)} style={{ accentColor: '#ff4444' }} />
                        <span style={{ color: rejectionReason === r ? '#ff8080' : '#888', fontSize: 13 }}>{r}</span>
                      </label>
                    ))}
                  </div>
                  {rejectionReason === 'Custom reason...' && (
                    <textarea placeholder="Type your custom reason here..." value={customReason} onChange={e => setCustomReason(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', marginBottom: 14 }} />
                  )}
                  <button onClick={handleReject} disabled={actionLoading} style={{ width: '100%', padding: '12px', backgroundColor: '#ff4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 14, cursor: 'pointer', letterSpacing: 1 }}>
                    {actionLoading ? 'REJECTING...' : 'CONFIRM REJECTION & NOTIFY SELLER'}
                  </button>
                </div>
              )}

              {/* Photos */}
              {selected.photos?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <img src={selected.photos[photoIndex]} alt="Car" style={{ width: '100%', maxWidth: 760, height: 500, objectFit: 'cover', borderRadius: 10, border: '1px solid #222', marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selected.photos.map((p, i) => (
                      <img key={i} src={p} alt="" onClick={() => setPhotoIndex(i)}
                        style={{ width: 72, height: 50, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === photoIndex ? '2px solid #01a3fc' : '2px solid #222' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>Price</p>
                  <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>${selected.price?.toLocaleString()}</p>
                </div>

                <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>Mileage</p>
                  <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{selected.mileage?.toLocaleString()} mi</p>
                </div>

                <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>Location</p>
                  <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{`${selected.city}, ${selected.state} ${selected.zip}`}</p>
                </div>

                {EDITABLE_TEXT_FIELDS.map(({ key, label }) => (
                  <div key={key} style={{ backgroundColor: '#0a0a0a', border: `1px solid ${editing ? '#01a3fc' : '#1a1a1a'}`, borderRadius: 8, padding: '12px 16px' }}>
                    <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
                    {editing && editData ? (
                      <input type="text" value={(editData[key] as string) || ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })} style={{ ...inputStyle, padding: '4px 8px', fontSize: 14, fontWeight: 600 }} />
                    ) : (
                      <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{(selected[key] as string) || '—'}</p>
                    )}
                  </div>
                ))}

                {EDITABLE_NUMBER_FIELDS.map(({ key, label, suffix }) => (
                  <div key={key} style={{ backgroundColor: '#0a0a0a', border: `1px solid ${editing ? '#01a3fc' : '#1a1a1a'}`, borderRadius: 8, padding: '12px 16px' }}>
                    <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
                    {editing && editData ? (
                      <input type="number" value={(editData[key] as number) ?? ''} onChange={e => setEditData({ ...editData, [key]: Number(e.target.value) })} style={{ ...inputStyle, padding: '4px 8px', fontSize: 14, fontWeight: 600 }} />
                    ) : (
                      <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{selected[key] ? `${selected[key]}${suffix}` : '—'}</p>
                    )}
                  </div>
                ))}

                {getEconomyFields((editing && editData ? editData.fuel_type : selected.fuel_type) || '').map(({ key, label, suffix }) => (
                  <div key={key} style={{ backgroundColor: '#0a0a0a', border: `1px solid ${editing ? '#01a3fc' : '#1a1a1a'}`, borderRadius: 8, padding: '12px 16px' }}>
                    <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
                    {editing && editData ? (
                      <input type="number" value={(editData[key] as number) ?? ''} onChange={e => setEditData({ ...editData, [key]: Number(e.target.value) })} style={{ ...inputStyle, padding: '4px 8px', fontSize: 14, fontWeight: 600 }} />
                    ) : (
                      <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{selected[key] ? `${selected[key]}${suffix}` : '—'}</p>
                    )}
                  </div>
                ))}

                {[
                  ['Title Status', selected.title_status],
                  ['Owners', String(selected.num_owners)],
                  ['Accidents', String(selected.num_accidents)],
                ].map(([label, value]) => (
                  <div key={label} style={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '12px 16px' }}>
                    <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
                    <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Known Damage */}
              <ListSection
                label="Known Damage"
                color="#ff8080"
                items={editing ? (editData?.known_damage ?? []) : (selected.known_damage ?? [])}
                editing={editing}
                onChange={next => editData && setEditData({ ...editData, known_damage: next })}
              />

              {/* Modifications */}
              <ListSection
                label="Modifications"
                color="#01a3fc"
                items={editing ? (editData?.modifications ?? []) : (selected.modifications ?? [])}
                editing={editing}
                onChange={next => editData && setEditData({ ...editData, modifications: next })}
              />

              {/* Features */}
              <ListSection
                label="Features"
                color="#aaa"
                items={editing ? (editData?.features ?? []) : (selected.features ?? [])}
                editing={editing}
                onChange={next => editData && setEditData({ ...editData, features: next })}
              />

              {/* Owner's Note */}
              {(selected.owners_note || editing) && (
                <div style={{ backgroundColor: '#0a0a0a', border: `1px solid ${editing ? '#01a3fc' : '#1a1a1a'}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                  <p style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 8px' }}>Owner's Note</p>
                  {editing && editData ? (
                    <textarea value={editData.owners_note || ''} onChange={e => setEditData({ ...editData, owners_note: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
                  ) : (
                    <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{selected.owners_note}</p>
                  )}
                </div>
              )}

              {/* Carfax */}
              {selected.carfax_url && (
                <a
                  href={selected.carfax_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, padding: '12px 20px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}
                >
                  View Carfax Report
                </a>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}