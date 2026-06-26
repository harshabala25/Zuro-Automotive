import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import Navbar from '../pages/Navbar'
import BottomBar from '../pages/BottomBar'
import { MapPin, Gauge } from 'lucide-react';
import { Camera } from "lucide-react";

const ADMIN_UID = 'f82273a7-2fd5-4619-84df-a9bad044654a'

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Profile() {
  const { username } = useParams()
  const isMobile = useIsMobile()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [pendingListings, setPendingListings] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [soldListings, setSoldListings] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')
  const [followersList, setFollowersList] = useState<any[]>([])
  const [followingList, setFollowingList] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFollowModalOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      let profileData: any = null
      if (username) {
        const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
        profileData = data
      } else if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        profileData = data
      }

      if (!profileData) { setLoading(false); return }

      setProfile(profileData)
      setNewUsername(profileData.username || '')
      setIsOwnProfile(user?.id === profileData.id)

      const { data: listingsData } = await supabase
        .from('listings').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false })
      const all = listingsData || []
      setListings(all.filter((c: any) => c.status === 'approved'))
      setPendingListings(all.filter((c: any) => c.status === 'pending'))
      setSoldListings(all.filter((c: any) => c.status === 'sold'))

      if (user?.id === profileData.id) {
        const { data: favData } = await supabase
          .from('favorites').select('listing_id, listings(*)').eq('user_id', profileData.id).order('created_at', { ascending: false })
        setFavorites(favData?.map((f: any) => f.listings).filter(Boolean) || [])
      }

      const { count: fCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id)
      setFollowerCount(fCount || 0)

      const { count: ingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id)
      setFollowingCount(ingCount || 0)

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows').select('id').eq('follower_id', user.id).eq('following_id', profileData.id).single()
        setIsFollowing(!!followData)
      }

      setLoading(false)
    }
    load()
  }, [username])

  async function openFollowModal(tab: 'followers' | 'following') {
    if (!profile) return
    setFollowModalTab(tab)
    setFollowModalOpen(true)
    setModalLoading(true)

    const { data: followersData } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id)
    const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)

    const followerIds = followersData?.map((r: any) => r.follower_id).filter(Boolean) || []
    const followingIds = followingData?.map((r: any) => r.following_id).filter(Boolean) || []

    const { data: followerProfiles } = followerIds.length > 0
      ? await supabase.from('profiles').select('id, username, avatar_url').in('id', followerIds)
      : { data: [] }
    const { data: followingProfiles } = followingIds.length > 0
      ? await supabase.from('profiles').select('id, username, avatar_url').in('id', followingIds)
      : { data: [] }

    setFollowersList(followerProfiles || [])
    setFollowingList(followingProfiles || [])
    setModalLoading(false)
  }

  async function handleFollow() {
    if (!currentUser || !profile) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id)
      setFollowerCount(c => c - 1)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
      setFollowerCount(c => c + 1)
      setIsFollowing(true)
    }
  }

  async function handleSave() {
    if (!currentUser || !profile) return
    setSaving(true)
    setSaveMsg('')
    let avatarUrl = profile.avatar_url

    if (avatarFile) {
      const filePath = `${currentUser.id}/avatar_${Date.now()}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatarUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('profiles').update({ username: newUsername, avatar_url: avatarUrl }).eq('id', currentUser.id)
    if (error) {
      setSaveMsg('Error saving: ' + error.message)
    } else {
      setProfile((p: any) => ({ ...p, username: newUsername, avatar_url: avatarUrl }))
      setSaveMsg('Profile updated!')
      setEditing(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    }
    setSaving(false)
  }

  async function handleUnfavorite(listingId: string) {
    if (!currentUser) return
    await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('listing_id', listingId)
    setFavorites(prev => prev.filter((car: any) => car.id !== listingId))
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', backgroundColor: '#111',
    border: '1px solid #333', borderRadius: 8, color: '#fff',
    fontSize: 15, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' as const,
  }

  function CarCard({ car, onUnfavorite }: { car: any, onUnfavorite?: () => void }) {
    return (
      <div style={{ position: 'relative' }}>
        <a href={`/listing/${car.id}`} style={{ textDecoration: 'none' }}>
          <div
            style={{ backgroundColor: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
            onMouseEnter={e => {
              if (!isMobile) {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#01a3fc'
                ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e1e'
              ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={car.photos?.[0] || `https://via.placeholder.com/400x220/111/01a3fc?text=${encodeURIComponent(car.make || 'Car')}`}
                alt={`${car.year} ${car.make} ${car.model}`}
                style={{ width: '100%', height: isMobile ? 160 : 180, objectFit: 'cover', display: 'block' }}
              />
              {car.status === 'pending' && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  backgroundColor: 'rgba(0,0,0,0.75)', border: '1px solid #01a3fc',
                  borderRadius: 4, padding: '3px 5px',
                  color: '#01a3fc', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase'
                }}>
                  Pending
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#01a3fc', padding: '4px 10px' }}>
                <span style={{ color: '#000', fontWeight: 900, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {car.year} {car.make} {car.model} {car.trim}
                </span>
              </div>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>${car.price?.toLocaleString()}</span>
              <span style={{ color: '#1aabf0', fontSize: 11, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} /> {car.city}, {car.state}
              </span>
              <span style={{ color: '#1aabf0', fontSize: 11, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Gauge size={11} /> {car.mileage?.toLocaleString()} mi
              </span>
            </div>
          </div>
        </a>

        {onUnfavorite && (
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            <button
              onClick={e => { e.preventDefault(); onUnfavorite() }}
              title="Remove from favorites"
              style={{
                width: 38, height: 38, borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: '1px solid #01a3fc',
                color: '#01a3fc',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background-color 0.2s',
              }}
            >
              <i className="ti ti-heart-filled" style={{ fontSize: 17 }} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    )
  }

  function UserRow({ user }: { user: any }) {
    return (
      <a href={`/profile/${user.username}`} style={{ textDecoration: 'none' }} onClick={() => setFollowModalOpen(false)}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', transition: 'background-color 0.15s', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, border: '2px solid #01a3fc', overflow: 'hidden', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#01a3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{user.username || 'Unknown User'}</span>
        </div>
      </a>
    )
  }

  if (loading) return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555', fontFamily: 'system-ui, sans-serif' }}>Loading profile...</p>
    </div>
  )

  if (!profile) return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#fff', fontSize: 24 }}>Profile not found</p>
      <a href="/buy" style={{ color: '#01a3fc', fontFamily: 'system-ui, sans-serif' }}>← Back to listings</a>
    </div>
  )

  const activeList = followModalTab === 'followers' ? followersList : followingList

  // Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: isMobile ? 12 : 16,
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff' }}>

      {/* FOLLOWERS/FOLLOWING MODAL */}
      {followModalOpen && (
        <div
          onClick={() => setFollowModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1000, display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: isMobile ? '14px 14px 0 0' : 14,
              width: isMobile ? '100%' : '100%',
              maxWidth: isMobile ? '100%' : 480,
              maxHeight: isMobile ? '80vh' : '70vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#444' }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #2a2a2a', padding: '0 24px', flexShrink: 0 }}>
              {(['followers', 'following'] as const).map(tab => (
                <button key={tab} onClick={() => setFollowModalTab(tab)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '18px 16px', fontSize: 15, fontWeight: 700, color: followModalTab === tab ? '#01a3fc' : '#555', marginBottom: -1, transition: 'color 0.15s', textTransform: 'capitalize' }}>
                  {tab}
                </button>
              ))}
              <button onClick={() => setFollowModalOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {modalLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: '#555' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#01a3fc" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2a10 10 0 0 1 10 10" style={{ animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                  </svg>
                </div>
              ) : activeList.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#444', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
                  No {followModalTab} yet
                </div>
              ) : (
                activeList.map((user: any) => <UserRow key={user.id} user={user} />)
              )}
            </div>
          </div>
        </div>
      )}

      <Navbar />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>

        {/* PROFILE HEADER */}
        <div style={{
          backgroundColor: '#000', border: '1px solid #000', borderRadius: 14,
          padding: isMobile ? '20px 16px' : '32px',
          marginBottom: 28,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: isMobile ? 16 : 28,
          textAlign: isMobile ? 'center' : 'left',
        }}>

          {/* AVATAR */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: isMobile ? 80 : 96, height: isMobile ? 80 : 96, borderRadius: '50%', border: '2px solid #01a3fc', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(avatarPreview || profile.avatar_url) ? (
                <img src={avatarPreview || profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#01a3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            {isOwnProfile && editing && (
              <>
                <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', backgroundColor: '#01a3fc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={14} color="black" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)) }
                  }}
                />
              </>
            )}
          </div>

          {/* INFO */}
          <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
            {editing ? (
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)} style={{ ...inputStyle, fontSize: isMobile ? 18 : 22, fontWeight: 900, marginBottom: 16, width: '100%', maxWidth: 280, textAlign: 'left' }} />
            ) : (
              <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, marginBottom: 4, color: '#fff' }}>{profile.username || 'Unknown User'}</h1>
            )}
            <p style={{ color: '#555', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 16 }}>
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            {/* Stats row — evenly spaced on mobile */}
            <div style={{
              display: 'flex',
              gap: isMobile ? 0 : 28,
              marginBottom: 20,
              justifyContent: isMobile ? 'space-around' : 'flex-start',
            }}>
              <button onClick={() => openFollowModal('followers')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: isMobile ? '8px 12px' : 0, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{followerCount}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Followers</div>
              </button>
              <button onClick={() => openFollowModal('following')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: isMobile ? '8px 12px' : 0, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{followingCount}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Following</div>
              </button>
              <div style={{ padding: isMobile ? '8px 12px' : 0, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{listings.length}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Listings</div>
              </div>
            </div>

            {/* BUTTONS */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {isOwnProfile ? (
                editing ? (
                  <>
                    <button onClick={handleSave} disabled={saving} style={{ padding: isMobile ? '11px 28px' : '9px 22px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 7, fontWeight: 900, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: 1, minHeight: 44 }}>
                      {saving ? 'SAVING...' : 'SAVE'}
                    </button>
                    <button onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(null) }} style={{ padding: isMobile ? '11px 28px' : '9px 22px', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #333', borderRadius: 7, fontWeight: 900, fontSize: 13, cursor: 'pointer', minHeight: 44 }}>
                      CANCEL
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} style={{ padding: isMobile ? '11px 28px' : '9px 22px', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #333', borderRadius: 7, fontWeight: 900, fontSize: 13, cursor: 'pointer', minHeight: 44 }}>
                      EDIT PROFILE
                    </button>
                    {currentUser?.id === ADMIN_UID && (
                      <a href="/admin" style={{ padding: isMobile ? '11px 28px' : '9px 22px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 7, fontWeight: 900, fontSize: 13, cursor: 'pointer', letterSpacing: 1, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
                        ADMIN PANEL
                      </a>
                    )}
                  </>
                )
              ) : (
                <button onClick={handleFollow} style={{ padding: isMobile ? '11px 28px' : '9px 22px', backgroundColor: isFollowing ? 'transparent' : '#01a3fc', color: isFollowing ? '#aaa' : '#000', border: isFollowing ? '1px solid #333' : 'none', borderRadius: 7, fontWeight: 900, fontSize: 13, cursor: 'pointer', letterSpacing: 1, minHeight: 44 }}>
                  {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                </button>
              )}
            </div>

            {saveMsg && <p style={{ color: '#01a3fc', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginTop: 12 }}>{saveMsg}</p>}
          </div>
        </div>

        {/* CURRENT LISTINGS */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: '#fff' }}>Active Listings</h2>
          <p style={{ color: 'rgba(255,255,255,0.67)', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 20 }}>
            {listings.length === 0 ? 'No active listings' : `Listed ${listings.length} car${listings.length > 1 ? 's' : ''}`}
          </p>
          {listings.length === 0 ? (
            <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 12, padding: '30px', textAlign: 'center', color: '#333', fontFamily: 'system-ui, sans-serif' }}>
              No active listings
            </div>
          ) : (
            <div style={gridStyle}>
              {listings.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          )}
        </div>

        {/* PENDING LISTINGS — only the owner can see these, kept fully separate from Active so nobody mistakes a car still under review for one that's actually for sale */}
        {isOwnProfile && pendingListings.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: '#01a3fc' }}>Pending Review</h2>
            <p style={{ color: 'rgba(255,255,255,0.67)', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 20 }}>
              {`${pendingListings.length} listing${pendingListings.length > 1 ? 's' : ''} awaiting admin approval — not visible to buyers yet`}
            </p>
            <div style={gridStyle}>
              {pendingListings.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        )}

        {/* SOLD LISTINGS */}
        {(isOwnProfile || soldListings.length > 0) && soldListings.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: '#fff' }}>Sold</h2>
            <p style={{ color: 'rgba(255,255,255,0.67)', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 20 }}>
              {`${soldListings.length} car${soldListings.length > 1 ? 's' : ''} sold`}
            </p>
            <div style={gridStyle}>
              {soldListings.map(car => (
                <div key={car.id} style={{ position: 'relative' }}>
                  <CarCard car={car} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAVORITES */}
        {isOwnProfile && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: '#fff' }}>Favorites</h2>
            <p style={{ color: 'rgba(255,255,255,0.67)', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 20 }}>
              {favorites.length === 0 ? 'No favorited cars yet' : `${favorites.length} favorited car${favorites.length > 1 ? 's' : ''}`}
            </p>
            {favorites.length === 0 ? (
              <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 12, padding: '48px', textAlign: 'center', color: '#333', fontFamily: 'system-ui, sans-serif' }}>
                Heart a car on its listing page to save it here
              </div>
            ) : (
              <div style={gridStyle}>
                {favorites.map(car => <CarCard key={car.id} car={car} onUnfavorite={() => handleUnfavorite(car.id)} />)}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomBar />
    </div>
  )
}