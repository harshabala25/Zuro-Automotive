import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import carModelsRaw from '../data/carData.json';
import Navbar from '../pages/Navbar';
import BottomBar from '../pages/BottomBar';
import { MapPin, Gauge } from 'lucide-react';

const carModels = carModelsRaw as unknown as Record<string, Record<string, string[]>>;

/* ----------------------------- DualRangeSlider ----------------------------- */

interface DualRangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
  format?: (value: number) => string;
  minGap?: number;
  showInputs?: boolean;
  inputStyle?: React.CSSProperties;
}

const sliderStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: 28,
  margin: 0,
  background: 'transparent',
  pointerEvents: 'none',
};

function DualRangeSlider({
  label, min, max, step = 1, minValue, maxValue, onChange,
  format = (v) => String(v), minGap = step, showInputs = false, inputStyle
}: DualRangeSliderProps) {
  // local mirrors so dragging feels instant; synced back up via onChange
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // keep local state in sync if parent value changes externally (e.g. Clear All)
  useEffect(() => { setLocalMin(minValue) }, [minValue]);
  useEffect(() => { setLocalMax(maxValue) }, [maxValue]);

  const range = max - min;
  const loPct = ((localMin - min) / range) * 100;
  const hiPct = ((localMax - min) / range) * 100;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), localMax - minGap);
    setLocalMin(val);
    onChange(val, localMax);
  };
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), localMin + minGap);
    setLocalMax(val);
    onChange(localMin, val);
  };
  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value.replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(raw)) return;
    const val = Math.min(Math.max(raw, min), localMax - minGap);
    setLocalMin(val);
    onChange(val, localMax);
  };
  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value.replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(raw)) return;
    const val = Math.max(Math.min(raw, max), localMin + minGap);
    setLocalMax(val);
    onChange(localMin, val);
  };

  // Decide which thumb should be "on top" (and therefore receive the touch/click)
  // based on which one is physically closer to where the user pressed down.
  const pickNearestThumb = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const distToMin = Math.abs(pct - loPct);
    const distToMax = Math.abs(pct - hiPct);
    setActiveThumb(distToMin <= distToMax ? 'min' : 'max');
  };

  return (
    <div style={{ marginTop: 20 }}>
      <style>{`
        .drs-range {
          -webkit-appearance: none;
          appearance: none;
          touch-action: none;
        }
        .drs-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: auto;
          touch-action: none;
          width: 13px; height: 13px; border-radius: 50%;
          background: #1a1a1a; border: 2px solid #e8e8e8; cursor: pointer;
          box-shadow: 0 0 0 14px transparent;
        }
        .drs-range::-moz-range-thumb {
          pointer-events: auto;
          touch-action: none;
          width: 8px; height: 8px; border-radius: 50%;
          background: #1a1a1a; border: 2px solid #e8e8e8; cursor: pointer;
        }
        .drs-range::-webkit-slider-runnable-track { background: transparent; }
        .drs-range::-moz-range-track { background: transparent; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#aaa' }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#e8e8e8' }}>{format(localMin)} – {format(localMax)}</span>
      </div>

      <div
        ref={trackRef}
        style={{ position: 'relative', height: 28 }}
        onPointerDown={(e) => pickNearestThumb(e.clientX)}
        onTouchStart={(e) => pickNearestThumb(e.touches[0].clientX)}
      >
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, background: '#3a3a3a', borderRadius: 2, transform: 'translateY(-50%)' }} />
        <div style={{ position: 'absolute', top: '50%', height: 4, background: '#e8e8e8', borderRadius: 2, transform: 'translateY(-50%)', left: `${loPct}%`, width: `${hiPct - loPct}%` }} />

        <input
          type="range"
          className="drs-range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          style={{ ...sliderStyle, zIndex: activeThumb === 'max' ? 3 : 4 }}
        />
        <input
          type="range"
          className="drs-range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          style={{ ...sliderStyle, zIndex: activeThumb === 'max' ? 4 : 3 }}
        />
      </div>

      {showInputs && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <input type="text" inputMode="numeric" value={localMin} onChange={handleMinInput} style={{ width: 90, ...(inputStyle ?? {}), marginTop: 0, textAlign: 'center' }} />
          <span style={{ color: '#555', alignSelf: 'center', fontSize: 13 }}>to</span>
          <input type="text" inputMode="numeric" value={localMax} onChange={handleMaxInput} style={{ width: 90, ...(inputStyle ?? {}), marginTop: 0, textAlign: 'center' }} />
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Constants -------------------------------- */

const BODY_STYLES = ['Any', 'Sedan', 'Coupe', 'SUV', 'Truck', 'Hatchback', 'Convertible', 'Van']
const FUEL_TYPES = ['Any', 'Gasoline', 'Hybrid', 'Electric', 'Hydrogen', 'Phev', 'Diesel']
const TRANSMISSIONS = ['Any', 'Automatic', 'Manual']
const TITLE_STATUSES = ['Any', 'Clean', 'Salvage', 'Rebuilt']
const EXTERIOR_COLORS = ['Any', 'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Orange', 'Yellow', 'Purple', 'Brown', 'Gold', 'Pink']
const INTERIOR_COLORS = ['Any', 'Black', 'Gray', 'Beige', 'Brown', 'White', 'Red', 'Blue', 'Green']
const NUM_OWNERS = ['Any', '1', '2', '3+']
const CARS_PER_PAGE = 15
const mpgFuelTypes = ['gasoline', 'hybrid', 'diesel', 'phev']
const rangeFuelTypes = ['electric', 'hydrogen']
const DRIVETRAIN = ['Any', 'FWD', 'RWD', 'AWD/4WD']
const ENGINE_TYPES = ['Any', 'Inline-2', 'Inline-3', 'Inline-4', 'Inline-5', 'Inline-6', 'V6', 'VR6', 'V8', 'V10', 'V12', 'W12', 'W16', 'Flat-4', 'Flat-6', 'Rotary']
const PRICE_MIN = 0
const PRICE_MAX = 200000
const MILEAGE_MIN = 0
const MILEAGE_MAX = 250000

const DRIVETRAIN_DEFAULT_FILTERS = {
  make: 'Any', model: 'Any', trim: 'Any',
  minPrice: String(PRICE_MIN), maxPrice: String(PRICE_MAX),
  minYear: 2000, maxYear: new Date().getFullYear() + 1,
  minMileage: String(MILEAGE_MIN), maxMileage: String(MILEAGE_MAX),
  transmission: 'Any', title: 'Any', bodyStyle: 'Any',
  accidents: 'Any', fuelType: 'Any', extColor: 'Any', intColor: 'Any',
  numOwners: 'Any', drivetrain: 'Any', engineType: 'Any',
  minMpg: '', maxMpg: '', minRange: '', maxRange: '',
}

/* -------------------------------- FiltersContent ----------------------------- */

interface FiltersContentProps {
  filters: typeof DRIVETRAIN_DEFAULT_FILTERS;
  setFilter: (key: string, value: string) => void;
  clearAll: () => void;
  userZip: string;
  setUserZip: (v: string) => void;
  zipError: string;
  setZipError: (v: string) => void;
  selectedMiles: number | null;
  filterByMiles: (miles: number | null) => void;
  milesOptions: { label: string; value: number | null }[];
  filtered: any[];
  isMobile: boolean;
  setFiltersOpen: (v: boolean) => void;
  maxYearNum: number;
  inputStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}

function FiltersContent({
  filters, setFilter, clearAll, userZip, setUserZip, zipError, setZipError,
  selectedMiles, filterByMiles, milesOptions, filtered, isMobile,
  setFiltersOpen, maxYearNum, inputStyle, selectStyle, labelStyle,
}: FiltersContentProps) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 1 }}>FILTERS</span>
        <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#01a3fc', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
          Clear All
        </button>
      </div>

      <label style={labelStyle}>Zip Code</label>
      <input placeholder="Enter zip code" maxLength={5} inputMode="numeric" value={userZip}
        onChange={(e) => { setUserZip(e.target.value.replace(/\D/g, '')); setZipError('') }}
        style={selectStyle} />
      {zipError && <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0 0' }}>{zipError}</p>}

      <label style={labelStyle}>Distance</label>
      <select value={selectedMiles ?? ''} onChange={(e) => filterByMiles(e.target.value ? Number(e.target.value) : null)}
        disabled={userZip.length !== 5}
        style={{ ...selectStyle, opacity: userZip.length !== 5 ? 0.4 : 1, cursor: userZip.length !== 5 ? 'not-allowed' : 'pointer' }}>
        {milesOptions.map(option => <option key={option.label} value={option.value ?? ''}>{option.label}</option>)}
      </select>

      <label style={labelStyle}>Make</label>
      <select value={filters.make} onChange={e => { setFilter('make', e.target.value); setFilter('model', 'Any'); setFilter('trim', 'Any') }} style={selectStyle}>
        {['Any', ...Object.keys(carModels)].map(make => <option key={make}>{make}</option>)}
      </select>

      <label style={labelStyle}>Model</label>
      <select value={filters.model} onChange={e => setFilter('model', e.target.value)}
        disabled={!filters.make || filters.make === 'Any'}
        style={{ ...selectStyle, opacity: !filters.make || filters.make === 'Any' ? 0.4 : 1 }}>
        <option value='Any'>Any</option>
        {(filters.make !== 'Any' ? Object.keys(carModels[filters.make] || {}) : []).map(model => <option key={model}>{model}</option>)}
      </select>

      {(() => {
        const availableTrims = (filters.make !== 'Any' && filters.model !== 'Any')
          ? (carModels[filters.make]?.[filters.model] ?? []).filter(t => t && t !== 'Base') : []
        return availableTrims.length > 0 ? (
          <>
            <label style={labelStyle}>Trim</label>
            <select value={filters.trim} onChange={e => setFilter('trim', e.target.value)} style={selectStyle}>
              <option value="Any">Any</option>
              {availableTrims.map(trim => <option key={trim}>{trim}</option>)}
            </select>
          </>
        ) : null
      })()}

      <DualRangeSlider label="Price" min={PRICE_MIN} max={PRICE_MAX} step={500} minGap={1}
        minValue={Number(filters.minPrice)} maxValue={Number(filters.maxPrice)}
        onChange={(min, max) => { setFilter('minPrice', String(min)); setFilter('maxPrice', String(max)) }}
        format={(v) => v >= PRICE_MAX ? `$${v.toLocaleString()}+` : `$${v.toLocaleString()}`} showInputs inputStyle={inputStyle} />

      <DualRangeSlider label="Mileage" min={MILEAGE_MIN} max={MILEAGE_MAX} step={5000} minGap={1}
        minValue={Number(filters.minMileage)} maxValue={Number(filters.maxMileage)}
        onChange={(min, max) => { setFilter('minMileage', String(min)); setFilter('maxMileage', String(max)) }}
        format={(v) => v >= MILEAGE_MAX ? `${v.toLocaleString()} mi` : `${v.toLocaleString()}`} showInputs inputStyle={inputStyle} />

      <DualRangeSlider label="Years" min={2000} max={maxYearNum} step={1}
        minValue={Number(filters.minYear)} maxValue={Number(filters.maxYear)}
        onChange={(min, max) => { setFilter('minYear', String(min)); setFilter('maxYear', String(max)) }} />

      <label style={labelStyle}>Body Style</label>
      <select value={filters.bodyStyle} onChange={e => setFilter('bodyStyle', e.target.value)} style={selectStyle}>
        {BODY_STYLES.map(b => <option key={b}>{b}</option>)}
      </select>

      <label style={labelStyle}>Fuel Type</label>
      <select value={filters.fuelType} onChange={e => setFilter('fuelType', e.target.value)} style={selectStyle}>
        {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
      </select>

      {['gasoline', 'diesel', 'phev'].includes(filters.fuelType.toLowerCase()) && (
        <>
          <label style={labelStyle}>MPG</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="Min" value={filters.minMpg} onChange={e => setFilter('minMpg', e.target.value)} style={{ ...inputStyle, width: '50%' }} />
            <input placeholder="Max" value={filters.maxMpg} onChange={e => setFilter('maxMpg', e.target.value)} style={{ ...inputStyle, width: '50%' }} />
          </div>
        </>
      )}

      {['electric', 'hydrogen'].includes(filters.fuelType.toLowerCase()) && (
        <>
          <label style={labelStyle}>Range (mi)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="Min" value={filters.minRange} onChange={e => setFilter('minRange', e.target.value)} style={{ ...inputStyle, width: '50%' }} />
            <input placeholder="Max" value={filters.maxRange} onChange={e => setFilter('maxRange', e.target.value)} style={{ ...inputStyle, width: '50%' }} />
          </div>
        </>
      )}

      <label style={labelStyle}>Drivetrain</label>
      <select value={filters.drivetrain} onChange={e => setFilter('drivetrain', e.target.value)} style={selectStyle}>
        {DRIVETRAIN.map(d => <option key={d}>{d}</option>)}
      </select>

      <label style={labelStyle}>Engine Type</label>
      <select value={filters.engineType} onChange={e => setFilter('engineType', e.target.value)} style={selectStyle}>
        {ENGINE_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>

      <label style={labelStyle}>Transmission</label>
      <select value={filters.transmission} onChange={e => setFilter('transmission', e.target.value)} style={selectStyle}>
        {TRANSMISSIONS.map(t => <option key={t}>{t}</option>)}
      </select>

      <label style={labelStyle}>Title Status</label>
      <select value={filters.title} onChange={e => setFilter('title', e.target.value)} style={selectStyle}>
        {TITLE_STATUSES.map(t => <option key={t}>{t}</option>)}
      </select>

      <label style={labelStyle}>Accidents</label>
      <select value={filters.accidents} onChange={e => setFilter('accidents', e.target.value)} style={selectStyle}>
        {['Any', 'No accidents'].map(a => <option key={a}>{a}</option>)}
      </select>

      <label style={labelStyle}>Exterior Color</label>
      <select value={filters.extColor} onChange={e => setFilter('extColor', e.target.value)} style={selectStyle}>
        {EXTERIOR_COLORS.map(c => <option key={c}>{c}</option>)}
      </select>

      <label style={labelStyle}>Interior Color</label>
      <select value={filters.intColor} onChange={e => setFilter('intColor', e.target.value)} style={selectStyle}>
        {INTERIOR_COLORS.map(c => <option key={c}>{c}</option>)}
      </select>

      <label style={labelStyle}>Number of Owners</label>
      <select value={filters.numOwners} onChange={e => setFilter('numOwners', e.target.value)} style={selectStyle}>
        {NUM_OWNERS.map(o => <option key={o}>{o}</option>)}
      </select>

      {isMobile && (
        <button onClick={() => setFiltersOpen(false)} style={{
          marginTop: 24, width: '100%', padding: '14px', backgroundColor: '#01a3fc',
          color: '#000', border: 'none', borderRadius: 8, fontWeight: 900,
          fontSize: 15, cursor: 'pointer', letterSpacing: 1,
        }}>
          SHOW {filtered.length} RESULTS
        </button>
      )}
    </>
  )
}

/* ----------------------------------- CarBuy ---------------------------------- */

export default function CarBuy() {
  const [userZip, setUserZip] = useState('')
  const [selectedMiles, setSelectedMiles] = useState<number | null>(null)
  const [zipError, setZipError] = useState('')
  const [allCars, setAllCars] = useState<any[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const milesOptions = [
    { label: 'Select distance', value: null as number | null },
    { label: '10 miles', value: 10 },
    { label: '25 miles', value: 25 },
    { label: '50 miles', value: 50 },
    { label: '100 miles', value: 100 },
    { label: 'Nationwide', value: -1 },
  ]

  const maxYearNum = new Date().getFullYear() + 1;
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(DRIVETRAIN_DEFAULT_FILTERS)
  const [debouncedFilters, setDebouncedFilters] = useState(filters)

  const [search] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('search') || ''
    } catch { return '' }
  })

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from('listings').select('*').eq('status', 'approved')
        .order('created_at', { ascending: false })
      if (!error && data) { setCars(data); setAllCars(data) }
      setLoading(false)
    }
    fetchListings()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 120)
    return () => clearTimeout(timeout)
  }, [filters])

  function setFilter(key: string, value: string) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  const clearAll = () => {  
    setUserZip(''); setSelectedMiles(null); setZipError(''); setCars(allCars)
    setFilters(DRIVETRAIN_DEFAULT_FILTERS); setPage(1)
  }

  const filterByMiles = async (miles: number | null) => {
    if (!userZip || userZip.length !== 5) { setZipError('Please enter a valid 5 digit zip code first!'); return }
    setZipError(''); setSelectedMiles(miles)
    if (!miles || miles === -1) { setCars(allCars); return }
    const { data: userCoords } = await supabase.from('zipcodes_temp').select('lat, lng').eq('zip', userZip).single()
    if (!userCoords) { setZipError('Zip code not found!'); return }
    const uniqueZips = [...new Set(allCars.map(car => car.zip))]
    const { data: zipCoords } = await supabase.from('zipcodes_temp').select('zip, lat, lng').in('zip', uniqueZips)
    const filtered = allCars.filter(car => {
      const coords = zipCoords?.find(z => z.zip === car.zip)
      if (!coords) return false
      const distance = 3958.8 * Math.acos(
        Math.cos(Math.PI / 180 * userCoords.lat) * Math.cos(Math.PI / 180 * coords.lat) *
        Math.cos(Math.PI / 180 * coords.lng - Math.PI / 180 * userCoords.lng) +
        Math.sin(Math.PI / 180 * userCoords.lat) * Math.sin(Math.PI / 180 * coords.lat)
      )
      return distance <= miles
    })
    setCars(filtered)
  }

  const filtered = cars.filter(car => {
    const f = debouncedFilters;
    if (search) {
      const s = search.toLowerCase()
      const trimPart = car.trim && car.trim !== 'Base' ? car.trim : ''
      if (!`${car.year} ${car.make} ${car.model} ${trimPart}`.toLowerCase().includes(s)) return false
    }
    if (f.make !== 'Any' && car.make.toLowerCase() !== f.make.toLowerCase()) return false
    if (f.model !== 'Any' && car.model.toLowerCase() !== f.model.toLowerCase()) return false
    if (f.trim !== 'Any' && car.trim?.toLowerCase() !== f.trim.toLowerCase()) return false
    if (f.title !== 'Any' && car.title_status?.toLowerCase() !== f.title.toLowerCase()) return false
    if (f.bodyStyle !== 'Any' && car.body_style?.toLowerCase() !== f.bodyStyle.toLowerCase()) return false
    if (f.fuelType !== 'Any' && car.fuel_type?.toLowerCase() !== f.fuelType.toLowerCase()) return false
    if (f.extColor !== 'Any' && car.exterior_color?.toLowerCase() !== f.extColor.toLowerCase()) return false
    if (f.intColor !== 'Any' && car.interior_color?.toLowerCase() !== f.intColor.toLowerCase()) return false
    if (f.drivetrain !== 'Any' && car.drivetrain?.toLowerCase() !== f.drivetrain.toLowerCase()) return false
    if (f.engineType !== 'Any' && car.engine_type?.toLowerCase() !== f.engineType.toLowerCase()) return false
    if (f.transmission !== 'Any' && car.transmission?.toLowerCase() !== f.transmission.toLowerCase()) return false
    if (f.accidents !== 'Any' && car.accidents?.toLowerCase() !== f.accidents.toLowerCase()) return false
    if (f.minPrice && Number(f.minPrice) > PRICE_MIN && car.price < Number(f.minPrice)) return false
    if (f.maxPrice && Number(f.maxPrice) < PRICE_MAX && car.price > Number(f.maxPrice)) return false
    if (f.minYear && car.year < Number(f.minYear)) return false
    if (f.maxYear && car.year > Number(f.maxYear)) return false
    const fuelLower = car.fuel_type?.toLowerCase() ?? ''
    if (mpgFuelTypes.includes(fuelLower)) {
      const combined = 1 / (0.55 / car.mpg_highway + 0.45 / car.mpg_city)
      if (f.minMpg && combined < Number(f.minMpg)) return false
      if (f.maxMpg && combined > Number(f.maxMpg)) return false
    } else if (rangeFuelTypes.includes(fuelLower)) {
      if (f.minRange && car.range < Number(f.minRange)) return false
      if (f.maxRange && car.range > Number(f.maxRange)) return false
    }
    if (f.minMileage && Number(f.minMileage) > MILEAGE_MIN && car.mileage < Number(f.minMileage)) return false
    if (f.maxMileage && Number(f.maxMileage) < MILEAGE_MAX && car.mileage > Number(f.maxMileage)) return false
    if (f.numOwners !== 'Any') {
      if (f.numOwners === '3+') { if (car.num_owners < 3) return false }
      else { if (car.num_owners !== Number(f.numOwners)) return false }
    }
    return true
  })

  // Count active filters for badge
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'minPrice') return Number(v) > PRICE_MIN
    if (k === 'maxPrice') return Number(v) < PRICE_MAX
    if (k === 'minMileage') return Number(v) > MILEAGE_MIN
    if (k === 'maxMileage') return Number(v) < MILEAGE_MAX
    if (k === 'minYear') return Number(v) > 2000
    if (k === 'maxYear') return Number(v) < maxYearNum
    if (typeof v === 'string') return v !== 'Any' && v !== ''
    return false
  }).length

  const totalPages = Math.ceil(filtered.length / CARS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * CARS_PER_PAGE, page * CARS_PER_PAGE)

  const selectStyle = {
    width: '100%', padding: '8px 10px', backgroundColor: '#111',
    border: '1px solid #333', borderRadius: 6, color: '#fff',
    fontSize: 13, marginTop: 4,
  }
  const labelStyle = {
    color: '#aaa', fontSize: 12, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase' as const, display: 'block', marginTop: 16,
  }
  const inputStyle = {
    width: '100%', padding: '8px 10px', backgroundColor: '#111',
    border: '1px solid #333', borderRadius: 6, color: '#fff',
    fontSize: 13, marginTop: 4, boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh' }}>
      <Navbar defaultSearch={search} />

      {/* MOBILE: Filter toggle button */}
      {isMobile && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a' }}>
          <button onClick={() => setFiltersOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', backgroundColor: '#0a0a0a',
            border: '1px solid #333', borderRadius: 8, color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 18, color: '#01a3fc' }} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{
                backgroundColor: '#01a3fc', color: '#000', borderRadius: '50%',
                width: 20, height: 20, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 900,
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* MOBILE: Filter drawer */}
      {isMobile && filtersOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0a0a0a', zIndex: 999, overflowY: 'auto',
          padding: '20px 18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>FILTERS</span>
            <button onClick={() => setFiltersOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>
              ✕
            </button>
          </div>
          <FiltersContent
            filters={filters}
            setFilter={setFilter}
            clearAll={clearAll}
            userZip={userZip}
            setUserZip={setUserZip}
            zipError={zipError}
            setZipError={setZipError}
            selectedMiles={selectedMiles}
            filterByMiles={filterByMiles}
            milesOptions={milesOptions}
            filtered={filtered}
            isMobile={isMobile}
            setFiltersOpen={setFiltersOpen}
            maxYearNum={maxYearNum}
            inputStyle={inputStyle}
            selectStyle={selectStyle}
            labelStyle={labelStyle}
          />
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        padding: isMobile ? '16px' : '24px 32px',
        gap: 28,
      }}>

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div style={{
            width: 260, flexShrink: 0, backgroundColor: '#0a0a0a',
            border: '1px solid #1e1e1e', borderRadius: 10, padding: '20px 18px',
            position: 'sticky', top: 80,
          }}>
            <FiltersContent
              filters={filters}
              setFilter={setFilter}
              clearAll={clearAll}
              userZip={userZip}
              setUserZip={setUserZip}
              zipError={zipError}
              setZipError={setZipError}
              selectedMiles={selectedMiles}
              filterByMiles={filterByMiles}
              milesOptions={milesOptions}
              filtered={filtered}
              isMobile={isMobile}
              setFiltersOpen={setFiltersOpen}
              maxYearNum={maxYearNum}
              inputStyle={inputStyle}
              selectStyle={selectStyle}
              labelStyle={labelStyle}
            />
          </div>
        )}

        {/* LISTINGS + PAGINATION */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ marginBottom: 16, color: '#fff', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
            {loading ? 'Loading listings...' : (
              <>Showing <strong style={{ color: '#fff' }}>{filtered.length === 0 ? 0 : (page - 1) * CARS_PER_PAGE + 1}–{Math.min(page * CARS_PER_PAGE, filtered.length)}</strong> of <strong style={{ color: '#fff' }}>{filtered.length}</strong> listings</>
            )}
          </div>

          <div style={{ paddingBottom: 36 }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#fff', padding: '80px 0', fontFamily: 'system-ui, sans-serif' }}>Loading listings...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#fff', padding: '80px 0', fontFamily: 'system-ui, sans-serif' }}>No listings match your filters.</div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: isMobile ? 12 : 16,
              }}>
                {paginated.map(car => (
                  <a key={car.id} href={`/listing/${car.id}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        backgroundColor: '#0a0a0a', border: '1px solid #1e1e1e',
                        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                        transition: 'border-color 0.2s, transform 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#00aaff'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e1e'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={car.photos?.[0] || `https://via.placeholder.com/400x260/111111/00aaff?text=${encodeURIComponent(car.make || 'Car')}`}
                          alt={`${car.year} ${car.make} ${car.model}`}
                          style={{ width: '100%', height: isMobile ? 200 : 180, objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#00aaff', padding: '2px 10px' }}>
                          <span style={{ color: '#000', fontWeight: 900, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            {car.year} {car.make} {car.model} {car.trim}
                          </span>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>${car.price?.toLocaleString()}</span>
                        <span style={{ color: '#1aabf0', fontSize: 12, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {car.city}, {car.state}
                        </span>
                        <span style={{ color: '#1aabf0', fontSize: 12, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Gauge size={12} /> {car.mileage?.toLocaleString()} mi
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: isMobile ? 6 : 12, marginTop: 36, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{
                  padding: isMobile ? '8px 14px' : '10px 24px',
                  backgroundColor: page === 1 ? '#1a1a1a' : '#00aaff',
                  color: page === 1 ? '#555' : '#000', border: 'none', borderRadius: 6,
                  fontWeight: 900, fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', letterSpacing: 1,
                }}>← PREV</button>

              {(() => {
                const pages: (number | string)[] = []
                const delta = 2
                const left = Math.max(1, page - delta)
                const right = Math.min(totalPages, page + delta)
                if (left > 1) { pages.push(1); if (left > 2) pages.push('...') }
                for (let i = left; i <= right; i++) pages.push(i)
                if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages) }
                return pages.map((p, i) =>
                  p === '...'
                    ? <span key={`ellipsis-${i}`} style={{ color: '#aaa', padding: '0 4px', fontWeight: 900 }}>...</span>
                    : <button key={p} onClick={() => typeof p === 'number' && setPage(p)}
                        style={{
                          width: 36, height: 36, borderRadius: 6, border: 'none',
                          backgroundColor: page === p ? '#00aaff' : '#1a1a1a',
                          color: page === p ? '#000' : '#aaa',
                          fontWeight: 900, fontSize: 13, cursor: 'pointer',
                        }}>{p}</button>
                )
              })()}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{
                  padding: isMobile ? '8px 14px' : '10px 24px',
                  backgroundColor: page === totalPages ? '#1a1a1a' : '#00aaff',
                  color: page === totalPages ? '#555' : '#000', border: 'none', borderRadius: 6,
                  fontWeight: 900, fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', letterSpacing: 1,
                }}>NEXT →</button>
            </div>
          )}
        </div>
      </div>
      <BottomBar />
    </div>
  )
}