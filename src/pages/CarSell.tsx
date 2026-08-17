import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import Navbar from '../pages/Navbar'
import carModelsRaw from '../data/carData.json'
import BottomBar from '../pages/BottomBar'
import { Camera, FileText, Check, X, AlertTriangle, Loader2, ArrowLeft, ArrowRight } from "lucide-react"

const carData = carModelsRaw as unknown as Record<string, Record<string, string[]>>
const STEPS = ['Location & Basic Info', 'Vehicle Details', 'Condition & Extras', 'Photos & Documents']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const BODY_STYLES = ['Sedan','Coupe','SUV','Truck','Hatchback','Convertible','Van','Wagon']
const FUEL_TYPES = ['Gasoline','Diesel','Hybrid','PHEV','Electric','Hydrogen']
const DRIVETRAINS = ['FWD','RWD','AWD/4WD']
const TITLE_STATUSES = ['Clean','Salvage','Rebuilt','Lien']
const EXTERIOR_COLORS = ['White','Black','Silver','Gray','Red','Blue','Green','Orange','Yellow','Purple','Brown','Gold','Pink']
const INTERIOR_COLORS = ['White','Black','Beige','Tan','Gray','Red','Blue','Green','Orange','Yellow','Purple','Brown','Pink']
const ENGINE_ASPIRATIONS = ['Naturally Aspirated','Turbocharged','Supercharged']
const ENGINE_TYPES = ['Inline-2','Inline-3','Inline-4','Inline-5','Inline-6','V6','VR6','V8','V10','V12','W12','W16','Flat-4','Flat-6','Rotary']
const ELECTRIC_MOTOR_TYPES = ['Single Motor','Dual Motor','Tri Motor']

const currentYear = new Date().getFullYear()
const startYear = 2000
const maxSelectableYear = currentYear + 1
const YEARS_DESCENDING = Array.from({ length: maxSelectableYear - startYear + 1 }, (_, index) => maxSelectableYear - index)

const HAS_GAS_ENGINE = ['Gasoline', 'Diesel', 'Hybrid', 'PHEV']
const HAS_ELECTRIC_MOTOR = ['Electric']
const HAS_MPG = ['Gasoline', 'Hybrid', 'Diesel']
const HAS_MPGE = ['PHEV']
const HAS_RANGE = ['PHEV', 'Electric', 'Hydrogen']
const HAS_TRANSMISSION = ['Diesel','Gasoline', 'Hybrid', 'PHEV', 'Hydrogen']

const MAKES = Object.keys(carData).sort()

function getModels(make: string): string[] {
  if (!make || !carData[make]) return []
  return Object.keys(carData[make] ?? {}).sort()
}

function getTrims(make: string, model: string): string[] {
  if (!make || !model || !carData[make]?.[model]) return []
  return (carData[make]?.[model] ?? []).filter(t => t !== 'Base')
}

function isBaseOnly(make: string, model: string): boolean {
  const trims = carData[make]?.[model] ?? []
  return trims.length === 0 || trims.every(t => t === 'Base')
}

const cleanText = (val: string): string => val.replace(/[^\p{L}\p{N} .,+\-/#()]/gu, '')

function parseFormattedNumber(value: string): number {
  return parseInt(value.replace(/,/g, '')) || 0
}

function mapBodyStyle(nhtsa: string): string {
  const s = nhtsa.toLowerCase()
  if (s.includes('sedan')) return 'Sedan'
  if (s.includes('coupe') || s.includes('2-door')) return 'Coupe'
  if (s.includes('suv') || s.includes('sport utility') || s.includes('multipurpose')) return 'SUV'
  if (s.includes('truck') || s.includes('pickup')) return 'Truck'
  if (s.includes('hatchback') || s.includes('hatch')) return 'Hatchback'
  if (s.includes('convertible') || s.includes('cabriolet')) return 'Convertible'
  if (s.includes('van') || s.includes('minivan')) return 'Van'
  if (s.includes('wagon')) return 'Wagon'
  return ''
}

function mapFuelType(nhtsa: string): string {
  const s = nhtsa.toLowerCase()
  if (s.includes('electric') && s.includes('gasoline')) return 'PHEV'
  if (s.includes('hybrid') && !s.includes('plug')) return 'Hybrid'
  if (s.includes('plug-in') || s.includes('plug in')) return 'PHEV'
  if (s.includes('electric')) return 'Electric'
  if (s.includes('hydrogen') || s.includes('fuel cell')) return 'Hydrogen'
  if (s.includes('gasoline') || s.includes('gas')) return 'Gasoline'
  if (s.includes('diesel')) return 'Diesel'
  return ''
}

function mapDrivetrain(nhtsa: string): string {
  const s = nhtsa.toLowerCase()
  if (s.includes('fwd') || s.includes('front-wheel') || s.includes('front wheel')) return 'FWD'
  if (s.includes('rwd') || s.includes('rear-wheel') || s.includes('rear wheel')) return 'RWD'
  if (s.includes('awd') || s.includes('all-wheel') || s.includes('all wheel')) return 'AWD/4WD'
  if (s.includes('4wd') || s.includes('four-wheel') || s.includes('4x4')) return 'AWD/4WD'
  return ''
}

function mapTransmission(nhtsa: string): string {
  const s = nhtsa.toLowerCase()
  if (s.includes('manual') || s.includes('standard')) return 'Manual'
  if (s.includes('automatic') || s.includes('auto') || s.includes('cvt') || s.includes('dct') || s.includes('dual')) return 'Automatic'
  return ''
}

function mapEngineType(cylinders: string): string {
  const cyl = parseInt(cylinders)
  if (!cyl) return ''
  if (cyl === 3) return 'Inline-3'
  if (cyl === 4) return 'Inline-4'
  if (cyl === 5) return 'Inline-5'
  if (cyl === 6) return 'V6'
  if (cyl === 8) return 'V8'
  if (cyl === 10) return 'V10'
  if (cyl === 12) return 'V12'
  return ''
}

function compressImage(file: File, maxWidth = 1024, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Could not process image.')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        if (!blob) { reject(new Error('Could not process image.')); return }
        resolve(new File([blob], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`"${file.name}" is not a valid image and was skipped.`)) }
    img.src = url
  })
}

function SellGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 14, maxWidth: 580, width: '100%', overflow: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', margin: 'auto 0' }}>
        <div style={{ background: '#01a3fc', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#000', fontSize: 18, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>How to sell on Zuro</h2>
          <span style={{ color: '#000', fontSize: 13, fontWeight: 700, opacity: 0.6, letterSpacing: 1, textTransform: 'uppercase' }}>EST ~5 min Read</span>
        </div>
        <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
          <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6, marginBottom: 8, borderLeft: '3px solid #01a3fc', paddingLeft: 14 }}>
            Before you start, here's what the listing process looks like.
          </p>
          <p style={{ color: '#666', fontSize: 13, lineHeight: 1.5, marginBottom: 24, paddingLeft: 14 }}>
            
          </p>
          <p style={{ color: '#01a3fc', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>The 4 steps</p>
          {[
            { n: 1, title: 'Location & basic info', desc: 'State, City, ZIP, and your VIN — Auto-Fill pre-populates make, model, year, engine, and drivetrain. Worth double-checking' },
            { n: 2, title: 'Vehicle details', desc: 'Colors, Mileage, Asking price, Horsepower, and Fuel Efficiency.' },
            { n: 3, title: 'Condition & extras', desc: "Title Status, Owners, Accidents, Known Damage and Modifications if there, Features, and a short Owner's note." },
            { n: 4, title: 'Photos & documents', desc: '10 photos (5 exterior, 5 interior) plus a Google Drive link to your Vehicle History Report — both required.' },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ display: 'flex', gap: 14, background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#01a3fc', color: '#000', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
              <div>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title}</p>
                <p style={{ color: '#666', fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
          <div style={{ height: 1, background: '#1e1e1e', margin: '20px 0' }} />
          <p style={{ color: '#01a3fc', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Have these ready</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {['Your 17-character VIN', 'Vehicle History Report (Google Drive link)', 'Current mileage', 'Your asking price', '10 photos (5 exterior, 5 interior)', 'Title status'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: 13 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#01a3fc', flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
          <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ color: '#888', fontSize: 13, lineHeight: 1.5 }}>
              <strong style={{ color: '#aaa' }}>Photo Policy:</strong>
              <p>5 exterior, 5 interior — no professional photography needed, just good lighting. Listings missing either won't be approved.             
                Listings are reviewed before going live — we'll let you know once yours is approved.</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 28px 28px' }}>
          <button onClick={onClose} style={{ width: '100%', padding: 14, background: '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
            Sell Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CarSell() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showGuide, setShowGuide] = useState(true)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [vinDecoding, setVinDecoding] = useState(false)
  const [vinDecoded, setVinDecoded] = useState(false)
  const [vinError, setVinError] = useState('')
  const [damageInput, setDamageInput] = useState('')
  const [modInput, setModInput] = useState('')
  const [hasKnownDamage, setHasKnownDamage] = useState(false)
  const [hasModifications, setHasModifications] = useState(false)
  const [featureInput, setFeatureInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [isPhotoDragging, setIsPhotoDragging] = useState(false)
  const [form, setForm] = useState({
    state: '', city: '', zip: '',
    make: '', model: '', trim: '', year: '', vin: '',
    body_style: '', fuel_type: '',
    engine_aspiration: '', engine_type: '', engine_displacement: '', electric_motor_type: '',
    drivetrain: '', transmission: '', transmission_speeds: '',
    exterior_color: '', interior_color: '',
    mileage: '', price: '', horsepower: '',
    mpg_city: '', mpg_highway: '',
    mpge_city: '', mpge_highway: '',
    range_miles: '',
    title_status: '', num_owners: '', num_accidents: '',
    known_damage: [] as string[],
    modifications: [] as string[],
    features: [] as string[],
    owners_note: '',
    photos: [] as File[],
    carfax_url: '',
  })

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) window.location.href = '/login'
    }
    checkAuth()
  }, [])

  function set(key: string, value: any) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addToArray(key: 'known_damage' | 'modifications' | 'features', value: string) {
    if (!value.trim()) return
    setForm(f => ({ ...f, [key]: [...f[key], value.trim()] }))
  }

  function removeFromArray(key: 'known_damage' | 'modifications' | 'features', index: number) {
    setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }))
  }

  function handleMakeChange(make: string) {
    set('make', make)
    set('model', '')
    set('trim', '')
  }

  function handleModelChange(model: string) {
    set('model', model)
    if (form.make && model && isBaseOnly(form.make, model)) {
      set('trim', 'Base')
    } else {
      set('trim', '')
    }
  }

  async function decodeVin(vin: string) {
    if (vin.length !== 17) return
    setVinDecoding(true); setVinError(''); setVinDecoded(false)
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`)
      const data = await res.json()
      const results: { Variable: string; Value: string }[] = data.Results
      function get(variable: string): string {
        return results.find(r => r.Variable === variable)?.Value?.trim() || ''
      }
      const make = get('Make')
      const model = get('Model')
      const year = get('Model Year')
      const bodyStyle = mapBodyStyle(get('Body Class'))
      const fuelType = mapFuelType(get('Fuel Type - Primary'))
      const drivetrain = mapDrivetrain(get('Drive Type'))
      const transmission = mapTransmission(get('Transmission Style'))
      const transmissionSpeeds = get('Transmission Speeds')
      const engineType = mapEngineType(get('Engine Number of Cylinders'))
      const displacementL = get('Displacement (L)')

      if (!make || make === 'null' || !model || model === 'null') {
        setVinError('Could not decode this VIN. Please fill in details manually.')
        setVinDecoding(false)
        return
      }

      const normalizedMake = MAKES.find(m => m.toLowerCase() === make.toLowerCase()) || make
      const models = getModels(normalizedMake)
      const normalizedModel = models.find(m => m.toLowerCase() === model.toLowerCase()) || model

      setForm(f => ({
        ...f,
        make: normalizedMake || f.make,
        model: normalizedModel || f.model,
        year: year || f.year,
        body_style: bodyStyle || f.body_style,
        fuel_type: fuelType || f.fuel_type,
        drivetrain: drivetrain || f.drivetrain,
        transmission: transmission || f.transmission,
        transmission_speeds: transmissionSpeeds || f.transmission_speeds,
        engine_type: engineType || f.engine_type,
        engine_displacement: displacementL ? parseFloat(displacementL).toFixed(1) : f.engine_displacement,
        trim: isBaseOnly(normalizedMake, normalizedModel) ? 'Base' : f.trim,
      }))

      const resolvedFuelType = fuelType || form.fuel_type
      if (resolvedFuelType && make && model && year) {
        await fetchFuelEconomy(make, model, year, resolvedFuelType)
      }
      setVinDecoded(true)
    } catch (e) {
      setVinError('VIN decode failed. Please fill in details manually.')
    }
    setVinDecoding(false)
  }

  async function fetchFuelEconomy(make: string, model: string, year: string, fuelType: string) {
    try {
      const menuRes = await fetch(
        `https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
        { headers: { Accept: 'application/json' } }
      )
      const menuData = await menuRes.json()
      const options = Array.isArray(menuData.menuItem) ? menuData.menuItem : menuData.menuItem ? [menuData.menuItem] : []
      if (!options.length) return
      const vehicleId = options[0].value
      const res = await fetch(`https://www.fueleconomy.gov/ws/rest/vehicle/${vehicleId}`, { headers: { Accept: 'application/json' } })
      const d = await res.json()
      setForm(f => ({
        ...f,
        ...(fuelType === 'Gasoline' || fuelType === 'Diesel' || fuelType === 'Hybrid' ? {
          mpg_city: d.city08 ? String(d.city08) : f.mpg_city,
          mpg_highway: d.highway08 ? String(d.highway08) : f.mpg_highway,
        } : {}),
        ...(fuelType === 'PHEV' ? {
          mpge_city: d.phevCity ? String(d.phevCity) : f.mpge_city,
          mpge_highway: d.phevHwy ? String(d.phevHwy) : f.mpge_highway,
          range_miles: d.rangeA ? String(d.rangeA) : f.range_miles,
        } : {}),
        ...(fuelType === 'Electric' ? { range_miles: d.range ? String(d.range) : f.range_miles } : {}),
        ...(fuelType === 'Hydrogen' ? { range_miles: d.range ? String(d.range) : f.range_miles } : {}),
      }))
    } catch (e) { /* silently fail */ }
  }

  function validateStep(s: number): string[] {
    const errs: string[] = []
    const currentYear = new Date().getFullYear()
    if (s === 0) {
      if (!form.state) errs.push('State is required.')
      if (!form.city.trim()) errs.push('City is required.')
      if (!form.zip.trim()) { errs.push('ZIP code is required.') } else if (form.zip.trim().length !== 5) { errs.push('ZIP code must be 5 digits.') }
      if (!form.make) errs.push('Make is required.')
      if (!form.model) errs.push('Model is required.')
      if (!form.year) { errs.push('Year is required.') } else { const yr = parseInt(form.year); if (yr < 2000 || yr > currentYear + 1) errs.push(`Year must be between 2000 and ${currentYear + 1}.`) }
      if (!form.vin.trim()) { errs.push('VIN is required.') } else if (form.vin.trim().length !== 17) { errs.push('VIN must be exactly 17 characters.') }
      if (!form.body_style) errs.push('Body style is required.')
      if (!form.fuel_type) errs.push('Fuel type is required.')
      if (!form.drivetrain) errs.push('Drivetrain is required.')
      if (HAS_GAS_ENGINE.includes(form.fuel_type)) {
        if (form.fuel_type !== 'Hydrogen') {
          if (!form.engine_type) errs.push('Engine type is required.')
          if (!form.engine_aspiration) errs.push('Engine aspiration is required.')
          if (!form.engine_displacement) errs.push('Engine displacement is required.')
        }
        if (!form.engine_displacement) errs.push('Engine displacement is required.')
        if (!form.transmission) errs.push('Transmission type is required.')
        if (!form.transmission_speeds) errs.push('Number of transmission speeds is required.')
      }
      if (HAS_ELECTRIC_MOTOR.includes(form.fuel_type)) {
        if (!form.electric_motor_type) errs.push('Motor type is required.')
      }
    }
    if (s === 1) {
      if (!form.exterior_color.trim()) errs.push('Exterior color is required.')
      if (!form.interior_color.trim()) errs.push('Interior color is required.')
      if (!form.horsepower) { errs.push('Horsepower is required.') } else if (parseFormattedNumber(form.horsepower) <= 0) { errs.push('Horsepower must be greater than 0.') }
      if (!form.mileage) { errs.push('Mileage is required.') } else if (parseFormattedNumber(form.mileage) < 0) { errs.push('Mileage cannot be negative.') }
      if (!form.price) { errs.push('Price is required.') } else if (parseFormattedNumber(form.price) <= 0) { errs.push('Price must be greater than 0.') }
      if (HAS_MPG.includes(form.fuel_type)) {
        if (!form.mpg_city) errs.push('City MPG is required.')
        if (!form.mpg_highway) errs.push('Highway MPG is required.')
      }
      if (HAS_MPGE.includes(form.fuel_type)) {
        if (!form.mpge_city) errs.push('City MPGe is required.')
        if (!form.mpge_highway) errs.push('Highway MPGe is required.')
      }
      if (HAS_RANGE.includes(form.fuel_type) && !form.range_miles) errs.push('Electric range is required.')
    }
    if (s === 2) {
      if (!form.title_status) errs.push('Title status is required.')
      if (!form.num_owners) { errs.push('Number of owners is required.') } else if (parseInt(form.num_owners) < 1) { errs.push('Number of owners must be at least 1.') }
      if (form.num_accidents === '') errs.push('Number of accidents is required.')
      if (!form.owners_note.trim()) errs.push("Owner's note is required.")
    }
    if (s === 3) {
      if (form.photos.length !== 10) errs.push('Exactly 10 photos are required.')
      if (!form.carfax_url.trim()) {
        errs.push('A Link to the Vehicle History Report is Required.')
      } else if (!/^https:\/\/(drive\.google\.com|docs\.google\.com)\//.test(form.carfax_url.trim())) {
        errs.push('Please enter a valid Google Drive link (must start with https://drive.google.com or https://docs.google.com).')
      }
    }
    return errs
  }

  function getErrorFieldIds(errs: string[]): Set<string> {
    const map: Record<string, string> = {
      'State is required.': 'field-state',
      'City is required.': 'field-city',
      'ZIP code is required.': 'field-zip',
      'ZIP code must be 5 digits.': 'field-zip',
      'Make is required.': 'field-make',
      'Model is required.': 'field-model',
      'Year is required.': 'field-year',
      'VIN is required.': 'field-vin',
      'VIN must be exactly 17 characters.': 'field-vin',
      'Body style is required.': 'field-body_style',
      'Fuel type is required.': 'field-fuel_type',
      'Drivetrain is required.': 'field-drivetrain',
      'Engine type is required.': 'field-engine_type',
      'Engine aspiration is required.': 'field-engine_aspiration',
      'Engine displacement is required.': 'field-engine_displacement',
      'Motor type is required.': 'field-electric_motor_type',
      'Transmission type is required.': 'field-transmission',
      'Number of transmission speeds is required.': 'field-transmission_speeds',
      'Exterior color is required.': 'field-exterior_color',
      'Interior color is required.': 'field-interior_color',
      'Horsepower is required.': 'field-horsepower',
      'Horsepower must be greater than 0.': 'field-horsepower',
      'Mileage is required.': 'field-mileage',
      'Mileage cannot be negative.': 'field-mileage',
      'Price is required.': 'field-price',
      'Price must be greater than 0.': 'field-price',
      'City MPG is required.': 'field-mpg_city',
      'Highway MPG is required.': 'field-mpg_highway',
      'City MPGe is required.': 'field-mpge_city',
      'Highway MPGe is required.': 'field-mpge_highway',
      'Electric range is required.': 'field-range_miles',
      'Title status is required.': 'field-title_status',
      'Number of owners is required.': 'field-num_owners',
      'Number of owners must be at least 1.': 'field-num_owners',
      'Number of accidents is required.': 'field-num_accidents',
      "Owner's note is required.": 'field-owners_note',
      'Exactly 10 photos are required.': 'field-photos',
      'A Vehicle History Report link is required.': 'field-carfax_url',
      'Please enter a valid Google Drive link (must start with https://drive.google.com or https://docs.google.com).': 'field-carfax_url',
    }
    return new Set(errs.map(e => map[e]).filter(Boolean))
  }

  function handleNext() {
    const errs = validateStep(step)
    if (errs.length > 0) { setErrors(errs); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setErrors([])
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    const errs = validateStep(step)
    if (errs.length > 0) { setErrors(errs); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setErrors([])
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('You need to be logged in to post a listing.'); setSubmitting(false); return }

    const { data: listing, error: insertError } = await supabase.from('listings').insert({
      user_id: user.id,
      state: form.state, city: form.city, zip: form.zip,
      make: form.make, model: form.model, trim: form.trim || null,
      year: parseInt(form.year), vin: form.vin,
      mileage: parseFormattedNumber(form.mileage),
      price: parseFormattedNumber(form.price),
      horsepower: parseFormattedNumber(form.horsepower),
      body_style: form.body_style, fuel_type: form.fuel_type,
      engine_type: form.fuel_type === 'Hydrogen' ? 'Hydrogen Fuel Cell' : (form.engine_type || null),
      engine_aspiration: form.engine_aspiration || null,
      engine_displacement: form.engine_displacement ? parseFloat(form.engine_displacement) : null,
      electric_motor_type: form.electric_motor_type || null,
      drivetrain: form.drivetrain,
      transmission: form.transmission || null,
      transmission_speeds: form.transmission_speeds || null,
      exterior_color: form.exterior_color, interior_color: form.interior_color,
      mpg_city: form.mpg_city ? parseInt(form.mpg_city) : null,
      mpg_highway: form.mpg_highway ? parseInt(form.mpg_highway) : null,
      mpge_city: form.mpge_city ? parseInt(form.mpge_city) : null,
      mpge_highway: form.mpge_highway ? parseInt(form.mpge_highway) : null,
      range_miles: form.range_miles ? parseInt(form.range_miles) : null,
      title_status: form.title_status,
      num_owners: parseInt(form.num_owners),
      num_accidents: parseInt(form.num_accidents),
      known_damage: hasKnownDamage ? form.known_damage : [],
      modifications: hasModifications ? form.modifications : [],
      features: form.features,
      owners_note: form.owners_note,
      photos: [], carfax_url: form.carfax_url.trim(),
    }).select().single()

    if (insertError) {
      if (insertError.message.includes('Rate limit exceeded')) {
        if (insertError.message.toLowerCase().includes('too many listings created')) {
          alert("You're submitting listings too quickly. Please wait a moment and try again.")
        } else {
          alert("You've reached your daily limit of 5 listing submissions. Please try again tomorrow.")
        }
      } else {
        alert('Something went wrong: ' + insertError.message)
      }
      setSubmitting(false)
      return
    }

    const photoUrls: string[] = []
    for (const photo of form.photos) {
      const filePath = `${user.id}/${Date.now()}_${photo.name}`
      const { error: uploadError } = await supabase.storage.from('car-photos').upload(filePath, photo)
      if (!uploadError) {
        const { data } = supabase.storage.from('car-photos').getPublicUrl(filePath)
        photoUrls.push(data.publicUrl)
      }
    }

    if (photoUrls.length !== form.photos.length) {
      alert('Some photos failed to upload. Please try submitting again.')
      setSubmitting(false)
      return
    }

    const { error: updateError } = await supabase.from('listings').update({ photos: photoUrls, carfax_url: form.carfax_url.trim() }).eq('id', listing.id)
    if (updateError) { alert('Something went wrong saving your photos: ' + updateError.message); setSubmitting(false); return }

    setSubmitting(false)
    setSubmitted(true)
  }

  const handlePhotoFiles = async (fileList: FileList | File[]) => {
    setPhotoError('')
    const selected = Array.from(fileList).slice(0, 10 - form.photos.length)
    const results = await Promise.allSettled(selected.map(f => compressImage(f)))
    const compressed = results.filter((r): r is PromiseFulfilledResult<File> => r.status === 'fulfilled').map(r => r.value)
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) setPhotoError(`${failed} photo${failed > 1 ? 's' : ''} could not be processed and ${failed > 1 ? 'were' : 'was'} skipped.`)
    set('photos', [...form.photos, ...compressed].slice(0, 10))
  }

  const errorFieldIds = getErrorFieldIds(errors)
  const err = (id: string) => errorFieldIds.has(id)

  const inputStyle = {
    width: '100%', padding: '11px 14px', backgroundColor: '#111',
    border: '1px solid #333', borderRadius: 8, color: '#fff',
    fontSize: 15, boxSizing: 'border-box' as const, fontFamily: 'system-ui, sans-serif',
  }
  const selectStyle = { ...inputStyle }
  const labelStyle = {
    display: 'block', color: '#aaa', fontSize: 12, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 6, marginTop: 20,
  }
  const tagStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    backgroundColor: '#1a1a1a', border: '1px solid #333',
    borderRadius: 20, padding: '5px 12px', fontSize: 13,
    color: '#fff', fontFamily: 'system-ui, sans-serif',
  }
  const tagRemoveButtonStyle = {
    background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer',
    padding: 0, display: 'flex', alignItems: 'center',
  }
  const toggleButtonStyle = (active: boolean) => ({
    padding: '8px 22px',
    backgroundColor: active ? '#01a3fc' : '#111',
    color: active ? '#000' : '#aaa',
    border: active ? '1px solid #01a3fc' : '1px solid #333',
    borderRadius: 8,
    fontWeight: 900 as const,
    fontSize: 13,
    letterSpacing: 1,
    cursor: 'pointer' as const,
    fontFamily: 'system-ui, sans-serif',
  })
  const sectionDivider = (label: string) => (
    <>
      <div style={{ height: 1, backgroundColor: '#1e1e1e', margin: '24px 0' }} />
      <p style={{ color: '#01a3fc', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 0 }}>{label}</p>
    </>
  )

  const availableModels = form.make ? getModels(form.make) : []
  const availableTrims = form.make && form.model ? getTrims(form.make, form.model) : []
  const trimIsBaseOnly = form.make && form.model ? isBaseOnly(form.make, form.model) : false

  const col2 = isMobile ? '1fr' : '1fr 1fr'
  const col3 = isMobile ? '1fr' : '1fr 1fr 1fr'

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh' }}>
      <style>{`
        @keyframes zuro-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .zuro-field-error { border: 2px solid #ff4444 !important; border-radius: 8px !important; }
        .zuro-wrapper-error { border: 2px solid #ff4444 !important; }
      `}</style>

      {showGuide && <SellGuideModal onClose={() => setShowGuide(false)} />}

      <Navbar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
        <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 28, fontWeight: 900, marginBottom: 8 }}>SELL YOUR CAR</h1>
        <p style={{ color: '#aaa', fontSize: 14, fontFamily: 'system-ui, sans-serif', marginBottom: 40 }}>
          Fill out the details below to list your car on Zuro.
        </p>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <h2 style={{ color: '#fff', fontWeight: 900, marginBottom: 12 }}>Congrats, your car has been submitted!</h2>
            <p style={{ color: '#aaa', fontFamily: 'system-ui, sans-serif', marginBottom: 32 }}>
              Our team will review your car and notify you of the decision within 3-5 business days. In the meantime, you can check your profile page for a preview of how your listing will look like.
            </p>
            <a href="/buy" style={{ backgroundColor: '#01a3fc', color: '#000', padding: '14px 32px', borderRadius: 8, fontWeight: 900, textDecoration: 'none', fontSize: 15 }}>VIEW LISTINGS</a>
          </div>
        ) : (
          <>
            {/* PROGRESS BAR */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 18, left: '10%', right: '10%', height: 2, backgroundColor: '#222', zIndex: 0 }} />
                <div style={{ position: 'absolute', top: 18, left: '10%', height: 2, backgroundColor: '#01a3fc', zIndex: 0, width: `${(step / (STEPS.length - 1)) * 80}%`, transition: 'width 0.4s ease' }} />
                {STEPS.map((s, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: i <= step ? '#01a3fc' : '#000',
                      border: i <= step ? '3px solid #01a3fc' : '3px solid #444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: 14, color: i <= step ? '#000' : '#555',
                      transition: 'all 0.3s ease',
                    }}>
                      {i < step ? <Check size={16} strokeWidth={3} /> : i + 1}
                    </div>
                    {!isMobile && (
                      <span style={{ marginTop: 8, fontSize: 11, color: i <= step ? '#01a3fc' : '#555', fontFamily: 'system-ui, sans-serif', fontWeight: 700, textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {s}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {isMobile && (
                <p style={{ textAlign: 'center', color: '#01a3fc', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12 }}>
                  Step {step + 1}: {STEPS[step]}
                </p>
              )}
            </div>

            {/* VALIDATION ERROR BOX */}
            {errors.length > 0 && (
              <div style={{ backgroundColor: '#1a0505', border: '1px solid #ff4444', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
                <p style={{ color: '#ff4444', fontWeight: 900, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={14} /> Please fix the following before continuing:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((e, i) => <li key={i} style={{ color: '#ff8080', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 4 }}>{e}</li>)}
                </ul>
              </div>
            )}

            {/* FORM CARD */}
            <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 14, padding: isMobile ? '20px 16px' : '32px 28px' }}>

              {/* ── STEP 0 ── */}
              {step === 0 && (
                <>
                  <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 4, marginTop: 0 }}>Location & Basic Info</h2>
                  <p style={{ color: '#aaa', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 8 }}>Where is the car located and what is it?</p>

                  <div style={{ display: 'grid', gridTemplateColumns: col3, gap: 14 }}>
                    <div>
                      <label htmlFor="field-state" style={labelStyle}>State</label>
                      <select id="field-state" value={form.state} onChange={e => set('state', e.target.value)} style={selectStyle} className={err('field-state') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {US_STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-city" style={labelStyle}>City</label>
                      <input id="field-city" placeholder="e.g. Dallas" value={form.city}
                        onChange={e => { if (/^[a-zA-Z\s\-'.]*$/.test(e.target.value)) set('city', e.target.value) }}
                        style={inputStyle} className={err('field-city') ? 'zuro-field-error' : ''} />
                    </div>
                    <div>
                      <label htmlFor="field-zip" style={labelStyle}>ZIP Code</label>
                      <input id="field-zip" placeholder="e.g. 75001" value={form.zip}
                        onChange={e => { const d = e.target.value.replace(/\D/g, ''); if (d.length <= 5) set('zip', d) }}
                        style={inputStyle} className={err('field-zip') ? 'zuro-field-error' : ''} inputMode="numeric" />
                    </div>
                  </div>

                  <label htmlFor="field-vin" style={labelStyle}>VIN</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input id="field-vin" placeholder="Enter your 17-character VIN to auto-fill details"
                        value={form.vin} maxLength={17}
                        onChange={e => { const cleaned = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17); set('vin', cleaned); setVinDecoded(false); setVinError('') }}
                        style={{ ...inputStyle, borderColor: vinDecoded ? '#00cc66' : vinError ? '#ff4444' : '#333', paddingRight: vinDecoding ? 40 : 14 }}
                        className={err('field-vin') ? 'zuro-field-error' : ''} />
                      {vinDecoding && (
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#01a3fc', display: 'flex' }}>
                          <Loader2 size={16} style={{ animation: 'zuro-spin 0.8s linear infinite' }} />
                        </span>
                      )}
                    </div>
                    <button onClick={() => decodeVin(form.vin)} disabled={form.vin.length !== 17 || vinDecoding}
                      style={{ padding: '0 18px', backgroundColor: form.vin.length === 17 && !vinDecoding ? '#01a3fc' : '#1a1a1a', color: form.vin.length === 17 && !vinDecoding ? '#000' : '#555', border: '1px solid #333', borderRadius: 8, fontWeight: 900, fontSize: 13, cursor: form.vin.length === 17 && !vinDecoding ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' as const, letterSpacing: 1 }}>
                      {vinDecoding ? 'DECODING...' : 'AUTO-FILL'}
                    </button>
                  </div>
                  {vinDecoded && <p style={{ color: '#00cc66', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginTop: 6 }}>VIN decoded! Some details have been auto-filled below. Please correct anything that looks off.</p>}
                  {vinError && <p style={{ color: '#ff8080', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} />{vinError}</p>}

                  <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 14 }}>
                    <div>
                      <label htmlFor="field-make" style={labelStyle}>Make</label>
                      <select id="field-make" value={form.make} onChange={e => handleMakeChange(e.target.value)} style={selectStyle} className={err('field-make') ? 'zuro-field-error' : ''}>
                        <option value="">Select Make</option>
                        {MAKES.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-model" style={labelStyle}>Model</label>
                      <select id="field-model" value={form.model} onChange={e => handleModelChange(e.target.value)} disabled={!form.make} style={{ ...selectStyle, opacity: !form.make ? 0.4 : 1 }} className={err('field-model') ? 'zuro-field-error' : ''}>
                        <option value="">Select Model</option>
                        {availableModels.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-year" style={labelStyle}>Year</label>
                      <select id="field-year" value={form.year} onChange={e => set('year', e.target.value)} style={selectStyle} className={err('field-year') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {YEARS_DESCENDING.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    {!trimIsBaseOnly && (
                      <div>
                        <label htmlFor="field-trim" style={labelStyle}>Trim {!form.model && <span style={{ color: '#555', fontWeight: 400 }}>(select model first)</span>}</label>
                        {availableTrims.length > 0 ? (
                          <select id="field-trim" value={form.trim} onChange={e => set('trim', e.target.value)} disabled={!form.model} style={{ ...selectStyle, opacity: !form.model ? 0.4 : 1 }}>
                            <option value="">Select Trim</option>
                            {availableTrims.map(t => <option key={t}>{t}</option>)}
                          </select>
                        ) : (
                          <input id="field-trim" placeholder="e.g. Sport, Premium (optional)" value={form.trim}
                            onChange={e => { const clean = e.target.value.replace(/[^\p{L}\p{N} .+\-/]/gu, ''); set('trim', clean) }}
                            style={inputStyle} />
                        )}
                      </div>
                    )}
                  </div>

                  {sectionDivider('Vehicle Configuration')}

                  <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 14 }}>
                    <div>
                      <label htmlFor="field-body_style" style={labelStyle}>Body Style</label>
                      <select id="field-body_style" value={form.body_style} onChange={e => set('body_style', e.target.value)} style={selectStyle} className={err('field-body_style') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {BODY_STYLES.map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-fuel_type" style={labelStyle}>Fuel Type</label>
                      <select id="field-fuel_type" value={form.fuel_type}
                        onChange={e => { set('fuel_type', e.target.value); set('transmission', ''); set('transmission_speeds', ''); set('engine_type', ''); set('engine_aspiration', ''); set('engine_displacement', ''); set('electric_motor_type', '') }}
                        style={selectStyle} className={err('field-fuel_type') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-drivetrain" style={labelStyle}>Drivetrain</label>
                      <select id="field-drivetrain" value={form.drivetrain} onChange={e => set('drivetrain', e.target.value)} style={selectStyle} className={err('field-drivetrain') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {DRIVETRAINS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    {HAS_TRANSMISSION.includes(form.fuel_type) && (
                      <div>
                        <label htmlFor="field-transmission" style={labelStyle}>Transmission Type</label>
                        <select id="field-transmission" value={form.transmission} onChange={e => { set('transmission', e.target.value); set('transmission_speeds', '') }} style={selectStyle} className={err('field-transmission') ? 'zuro-field-error' : ''}>
                          <option value="">Select</option>
                          <option value="Automatic">Automatic</option>
                          <option value="Manual">Manual</option>
                        </select>
                      </div>
                    )}
                    {form.transmission && HAS_TRANSMISSION.includes(form.fuel_type) && (
                      <div>
                        <label htmlFor="field-transmission_speeds" style={labelStyle}>Number of Speeds</label>
                        <select id="field-transmission_speeds" value={form.transmission_speeds} onChange={e => set('transmission_speeds', e.target.value)} style={selectStyle} className={err('field-transmission_speeds') ? 'zuro-field-error' : ''}>
                          <option value="">Select</option>
                          {form.transmission === 'Automatic' && <option value="CVT">CVT</option>}
                          {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={`${n}`}>{n}-Speed</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {HAS_GAS_ENGINE.includes(form.fuel_type) && form.fuel_type !== 'Hydrogen' && (
                    <>
                      {sectionDivider('Engine Details')}
                      <div style={{ display: 'grid', gridTemplateColumns: col3, gap: 14 }}>
                        <div>
                          <label htmlFor="field-engine_type" style={labelStyle}>Engine Type</label>
                          <select id="field-engine_type" value={form.engine_type} onChange={e => set('engine_type', e.target.value)} style={selectStyle} className={err('field-engine_type') ? 'zuro-field-error' : ''}>
                            <option value="">Select</option>
                            {ENGINE_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="field-engine_aspiration" style={labelStyle}>Aspiration</label>
                          <select id="field-engine_aspiration" value={form.engine_aspiration} onChange={e => set('engine_aspiration', e.target.value)} style={selectStyle} className={err('field-engine_aspiration') ? 'zuro-field-error' : ''}>
                            <option value="">Select</option>
                            {ENGINE_ASPIRATIONS.map(a => <option key={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="field-engine_displacement" style={labelStyle}>Displacement (L)</label>
                          <input id="field-engine_displacement" type="number" step="0.1" placeholder="e.g. 3.0" value={form.engine_displacement}
                            onChange={e => set('engine_displacement', e.target.value)}
                            onBlur={e => { const val = e.target.value; if (val === '') return; const num = parseFloat(val); if (isNaN(num)) return; const rounded = Math.round(num * 10) / 10; set('engine_displacement', Number.isInteger(rounded) ? `${rounded}.0` : String(rounded)) }}
                            style={inputStyle} className={err('field-engine_displacement') ? 'zuro-field-error' : ''} />
                        </div>
                      </div>
                    </>
                  )}

                  {HAS_ELECTRIC_MOTOR.includes(form.fuel_type) && (
                    <>
                      {sectionDivider('Motor Details')}
                      <div>
                        <label htmlFor="field-electric_motor_type" style={labelStyle}>Motor Type</label>
                        <select id="field-electric_motor_type" value={form.electric_motor_type} onChange={e => set('electric_motor_type', e.target.value)} style={selectStyle} className={err('field-electric_motor_type') ? 'zuro-field-error' : ''}>
                          <option value="">Select</option>
                          {ELECTRIC_MOTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <>
                  <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 4, marginTop: 0 }}>Vehicle Details</h2>
                  <p style={{ color: '#aaa', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 8 }}>
                    Give more details to buyers about the car.{vinDecoded ? ' MPG/MPGe/Range is SOMETIMES auto-filled from your VIN — double-check them just in case.' : ''}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 14 }}>
                    <div>
                      <label htmlFor="field-exterior_color" style={labelStyle}>Exterior Color</label>
                      <select id="field-exterior_color" value={form.exterior_color} onChange={e => set('exterior_color', e.target.value)} style={selectStyle} className={err('field-exterior_color') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {EXTERIOR_COLORS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-interior_color" style={labelStyle}>Interior Color</label>
                      <select id="field-interior_color" value={form.interior_color} onChange={e => set('interior_color', e.target.value)} style={selectStyle} className={err('field-interior_color') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {INTERIOR_COLORS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: col3, gap: 14 }}>
                    <div>
                      <label htmlFor="field-horsepower" style={labelStyle}>Horsepower</label>
                      <input id="field-horsepower" type="text" placeholder="e.g. 200" value={form.horsepower}
                        onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (!/^\d*$/.test(raw)) return; const num = parseInt(raw); if (num > 3000) return; set('horsepower', raw ? num.toLocaleString() : '') }}
                        style={inputStyle} className={err('field-horsepower') ? 'zuro-field-error' : ''} />
                    </div>
                    <div>
                      <label htmlFor="field-mileage" style={labelStyle}>Mileage</label>
                      <input id="field-mileage" type="text" placeholder="e.g. 32,000" value={form.mileage}
                        onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (!/^\d*$/.test(raw)) return; const num = parseInt(raw); if (num > 2_000_000) return; set('mileage', raw ? parseInt(raw).toLocaleString() : '') }}
                        style={inputStyle} className={err('field-mileage') ? 'zuro-field-error' : ''} />
                    </div>
                    <div>
                      <label htmlFor="field-price" style={labelStyle}>Price</label>
                      <input id="field-price" type="text" placeholder="e.g. 43,000" value={form.price}
                        onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (!/^\d*$/.test(raw)) return; const num = parseInt(raw); if (num > 999_999) return; set('price', raw ? num.toLocaleString() : '') }}
                        style={inputStyle} className={err('field-price') ? 'zuro-field-error' : ''} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 14 }}>
                    {HAS_MPG.includes(form.fuel_type) && (
                      <>
                        <div>
                          <label htmlFor="field-mpg_city" style={labelStyle}>City MPG</label>
                          <input id="field-mpg_city" type="number" placeholder="e.g. 22" value={form.mpg_city} onChange={e => set('mpg_city', e.target.value === '' ? '' : String(Math.min(Math.max(Number(e.target.value), 0), 70)))} style={inputStyle} className={err('field-mpg_city') ? 'zuro-field-error' : ''} min={0} max={70} />
                        </div>
                        <div>
                          <label htmlFor="field-mpg_highway" style={labelStyle}>Highway MPG</label>
                          <input id="field-mpg_highway" type="number" placeholder="e.g. 30" value={form.mpg_highway} onChange={e => set('mpg_highway', e.target.value === '' ? '' : String(Math.min(Math.max(Number(e.target.value), 0), 70)))} style={inputStyle} className={err('field-mpg_highway') ? 'zuro-field-error' : ''} min={0} max={70} />
                        </div>
                      </>
                    )}
                    {HAS_MPGE.includes(form.fuel_type) && (
                      <>
                        <div>
                          <label htmlFor="field-mpge_city" style={labelStyle}>City MPGe</label>
                          <input id="field-mpge_city" type="number" placeholder="e.g. 84" value={form.mpge_city} onChange={e => set('mpge_city', e.target.value === '' ? '' : String(Math.min(Math.max(Number(e.target.value), 0), 150)))} style={inputStyle} className={err('field-mpge_city') ? 'zuro-field-error' : ''} min={0} max={150} />
                        </div>
                        <div>
                          <label htmlFor="field-mpge_highway" style={labelStyle}>Highway MPGe</label>
                          <input id="field-mpge_highway" type="number" placeholder="e.g. 78" value={form.mpge_highway} onChange={e => set('mpge_highway', e.target.value === '' ? '' : String(Math.min(Math.max(Number(e.target.value), 0), 150)))} style={inputStyle} className={err('field-mpge_highway') ? 'zuro-field-error' : ''} min={0} max={150} />
                        </div>
                      </>
                    )}
                    {HAS_RANGE.includes(form.fuel_type) && (
                      <div style={{ gridColumn: HAS_MPG.includes(form.fuel_type) ? 'span 2' : 'span 1' }}>
                        <label htmlFor="field-range_miles" style={labelStyle}>{form.fuel_type === 'PHEV' ? 'Electric Range (miles)' : 'Range (miles)'}</label>
                        <input id="field-range_miles" type="number" placeholder={form.fuel_type === 'PHEV' ? 'e.g. 42 (EV-only range)' : 'e.g. 358'} value={form.range_miles}
                          onChange={e => set('range_miles', e.target.value === '' ? '' : String(Math.min(Math.max(Number(e.target.value), 0), 600)))}
                          style={inputStyle} className={err('field-range_miles') ? 'zuro-field-error' : ''} min={0} max={600} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <>
                  <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 4, marginTop: 0 }}>Condition & Extras</h2>
                  <p style={{ color: '#aaa', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 8 }}>Be honest — buyers appreciate transparency.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: col3, gap: 14 }}>
                    <div>
                      <label htmlFor="field-title_status" style={labelStyle}>Title Status</label>
                      <select id="field-title_status" value={form.title_status} onChange={e => set('title_status', e.target.value)} style={selectStyle} className={err('field-title_status') ? 'zuro-field-error' : ''}>
                        <option value="">Select</option>
                        {TITLE_STATUSES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-num_owners" style={labelStyle}>Number of Owners</label>
                      <input id="field-num_owners" type="number" min="0" placeholder="e.g. 1" value={form.num_owners === '0' ? '' : form.num_owners}
                        onChange={e => { const val = e.target.value; if (val === '') return set('num_owners', ''); if (Number(val) < 0) return; set('num_owners', val) }}
                        onBlur={e => set('num_owners', String(Math.max(0, Number(e.target.value) || 0)))}
                        style={inputStyle} className={err('field-num_owners') ? 'zuro-field-error' : ''} />
                    </div>
                    <div>
                      <label htmlFor="field-num_accidents" style={labelStyle}>Number of Accidents</label>
                      <input id="field-num_accidents" type="number" min="0" placeholder="e.g. 0" value={form.num_accidents}
                        onChange={e => { const val = e.target.value; if (val === '') return set('num_accidents', ''); if (Number(val) < 0) return; set('num_accidents', val) }}
                        onBlur={e => set('num_accidents', String(Math.max(0, Number(e.target.value) || 0)))}
                        style={inputStyle} className={err('field-num_accidents') ? 'zuro-field-error' : ''} />
                    </div>
                  </div>

                  <label style={labelStyle}>Known Damage</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setHasKnownDamage(false)} style={toggleButtonStyle(!hasKnownDamage)}>No</button>
                    <button type="button" onClick={() => setHasKnownDamage(true)} style={toggleButtonStyle(hasKnownDamage)}>Yes</button>
                  </div>
                  {hasKnownDamage && (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <input id="field-known_damage" placeholder="e.g. Scratch on rear bumper — press + or Enter to add." value={damageInput}
                          onChange={e => setDamageInput(cleanText(e.target.value))}
                          onKeyDown={e => { if (e.key === 'Enter') { addToArray('known_damage', damageInput); setDamageInput('') } }}
                          style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => { addToArray('known_damage', damageInput); setDamageInput('') }}
                          style={{ padding: '0 18px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, cursor: 'pointer', fontSize: 20 }}>+</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {form.known_damage.map((d, i) => (
                          <span key={i} style={tagStyle}>{d}
                            <button onClick={() => removeFromArray('known_damage', i)} style={tagRemoveButtonStyle}><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <label style={labelStyle}>Modifications</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setHasModifications(false)} style={toggleButtonStyle(!hasModifications)}>No</button>
                    <button type="button" onClick={() => setHasModifications(true)} style={toggleButtonStyle(hasModifications)}>Yes</button>
                  </div>
                  {hasModifications && (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <input id="field-modifications" placeholder="e.g. Aftermarket exhaust — press + or Enter to add." value={modInput}
                          onChange={e => setModInput(cleanText(e.target.value))}
                          onKeyDown={e => { if (e.key === 'Enter') { addToArray('modifications', modInput); setModInput('') } }}
                          style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => { addToArray('modifications', modInput); setModInput('') }}
                          style={{ padding: '0 18px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, cursor: 'pointer', fontSize: 20 }}>+</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {form.modifications.map((m, i) => (
                          <span key={i} style={tagStyle}>{m}
                            <button onClick={() => removeFromArray('modifications', i)} style={tagRemoveButtonStyle}><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <label htmlFor="field-features" style={labelStyle}>Features</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="field-features" placeholder="e.g. Heated Seats — press + or Enter to add." value={featureInput}
                      onChange={e => { if (/^[a-zA-Z0-9\s\-'.,&]*$/.test(e.target.value)) setFeatureInput(e.target.value) }}
                      onKeyDown={e => { if (e.key === 'Enter' && featureInput.trim()) { addToArray('features', featureInput.trim()); setFeatureInput('') } }}
                      style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => { if (featureInput.trim()) { addToArray('features', featureInput.trim()); setFeatureInput('') } }}
                      style={{ padding: '0 18px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, cursor: 'pointer', fontSize: 20 }}>+</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {form.features.map((f, i) => (
                      <span key={i} style={tagStyle}>{f}
                        <button onClick={() => removeFromArray('features', i)} style={tagRemoveButtonStyle}><X size={12} /></button>
                      </span>
                    ))}
                  </div>

                  <label htmlFor="field-owners_note" style={labelStyle}>Owner's Note *</label>
                  <textarea id="field-owners_note"
                    placeholder="Tell buyers about the car — your experience owning it, why you're selling, anything they should know..."
                    value={form.owners_note}
                    maxLength={800}
                    onChange={e => set('owners_note', e.target.value.replace(/[^\p{L}\p{N} .,!?'"\-()\n]/gu, '').slice(0, 800))}
                    rows={6} style={{ ...inputStyle, resize: 'vertical' as const }} className={err('field-owners_note') ? 'zuro-field-error' : ''} />
                  <div style={{ fontSize: '0.8rem', color: form.owners_note.length >= 800 ? '#d32f2f' : '#888', textAlign: 'right' as const }}>
                    {form.owners_note.length}/800
                  </div>
                </>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <>
                  <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 4, marginTop: 0 }}>Photos & Documents</h2>
                  <p style={{ color: '#aaa', fontSize: 13, fontFamily: 'system-ui, sans-serif', marginBottom: 8 }}>Great photos = more inquiries. Add as many HIGH QUALITY photos as you can.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <label htmlFor="field-photos"
                      onDragOver={e => { e.preventDefault(); setIsPhotoDragging(true) }}
                      onDragLeave={e => { e.preventDefault(); setIsPhotoDragging(false) }}
                      onDrop={e => { e.preventDefault(); setIsPhotoDragging(false); if (e.dataTransfer.files?.length) handlePhotoFiles(e.dataTransfer.files) }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: isPhotoDragging ? '2px dashed #01a3fc' : err('field-photos') ? '2px solid #ff4444' : '2px dashed #333', borderRadius: 10, padding: '32px', cursor: 'pointer', backgroundColor: isPhotoDragging ? '#0a1a22' : '#111', gap: 20 }}>
                      <Camera size={32} color="#cccccc" />
                      <span style={{ color: '#aaa', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>{isPhotoDragging ? 'Drop photos here' : 'Click or drag photos to upload'}</span>
                      <span style={{ color: '#aaa', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>10 Photos - 5 exterior/interior required</span>
                      <input id="field-photos" type="file" accept="image/*" multiple style={{ display: 'none' }}
                        onChange={e => { if (e.target.files) { handlePhotoFiles(e.target.files); e.target.value = '' } }} />
                    </label>
                    {photoError && (
                      <p style={{ color: '#ff8080', fontSize: 13, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} />{photoError}
                      </p>
                    )}
                    {form.photos.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ color: '#555', fontSize: 12, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
                          {isMobile ? 'Tap arrows to reorder · First photo is the cover' : 'Drag to reorder · First photo is the cover'}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {form.photos.map((file, i) => (
                            <div key={i} draggable
                            onDragStart={e => e.dataTransfer.setData('text/plain', String(i))}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault()
                              const from = Number(e.dataTransfer.getData('text/plain'))
                              if (from === i) return
                              const updated = [...form.photos]
                              const [moved] = updated.splice(from, 1)
                              updated.splice(i, 0, moved)
                              set('photos', updated)
                            }}
                            style={{ position: 'relative', cursor: 'grab' }}>
                            <img src={URL.createObjectURL(file)} alt={`Photo ${i + 1}`}
                              style={{ width: isMobile ? 80 : 100, height: isMobile ? 56 : 70, objectFit: 'cover', borderRadius: 6, border: i === 0 ? '2px solid #01a3fc' : '1px solid #333', display: 'block', pointerEvents: 'none' }} />
                            {i === 0 && (
                              <span style={{ position: 'absolute', bottom: 4, left: 4, background: '#01a3fc', color: '#000', fontSize: 9, fontWeight: 900, borderRadius: 4, padding: '2px 5px' }}>COVER</span>
                            )}
                            {isMobile && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, gap: 2 }}>
                                <button onClick={e => { e.stopPropagation(); if (i === 0) return; const updated = [...form.photos]; [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]]; set('photos', updated) }} disabled={i === 0} style={{ flex: 1, fontSize: 14, background: '#1a1a1a', border: 'none', borderRadius: 4, color: i === 0 ? '#444' : '#fff', cursor: i === 0 ? 'not-allowed' : 'pointer', padding: '2px 0' }}>←</button>
                                <button onClick={e => { e.stopPropagation(); if (i === form.photos.length - 1) return; const updated = [...form.photos]; [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]]; set('photos', updated) }} disabled={i === form.photos.length - 1} style={{ flex: 1, fontSize: 14, background: '#1a1a1a', border: 'none', borderRadius: 4, color: i === form.photos.length - 1 ? '#444' : '#fff', cursor: i === form.photos.length - 1 ? 'not-allowed' : 'pointer', padding: '2px 0' }}>→</button>
                              </div>
                            )}
                            <button onClick={e => { e.stopPropagation(); set('photos', form.photos.filter((_, j) => j !== i)) }}
                              style={{ position: 'absolute', top: -6, right: -6, background: '#ff4444', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <X size={12} />
                            </button>
                          </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <label htmlFor="field-carfax_url" style={labelStyle}>Vehicle History Report Link</label>
                    <div className={err('field-carfax_url') ? 'zuro-wrapper-error' : ''} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#111', border: '1px solid #333', borderRadius: 10, padding: '14px 16px' }}>
                      <FileText size={20} color="#aaa" style={{ flexShrink: 0 }} />
                      <input
                        id="field-carfax_url"
                        type="url"
                        placeholder="Paste your Google Drive share link here"
                        value={form.carfax_url}
                        onChange={e => set('carfax_url', e.target.value)}
                        style={{ ...inputStyle, border: 'none', background: 'transparent', padding: 0, flex: 1 }}
                      />
                      {form.carfax_url && (
                        <button onClick={() => set('carfax_url', '')} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', display: 'flex', padding: 0 }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <p style={{ color: '#aaa', fontSize: 14, fontFamily: 'system-ui, sans-serif', marginTop: 8 }}>
                      Download your Vehicle History Report and upload it to Google Drive. In Google Drive, right-click your Vehicle History Report PDF → Share → "Anyone with the link" → Copy link and paste it here. MAKE SURE IT IS ON VIEW AND THAT OTHER PEOPLE CAN'T SHARE IT, EDIT IT, OR DOWNLOAD IT to ensure safety
                    </p>
                  </div>
                </>
              )}

              {/* NAV BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, gap: 12 }}>
                <button onClick={() => { setErrors([]); setStep(s => s - 1) }} disabled={step === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', backgroundColor: step === 0 ? '#111' : '#1a1a1a', color: step === 0 ? '#444' : '#fff', border: '1px solid #333', borderRadius: 8, fontWeight: 900, fontSize: 14, cursor: step === 0 ? 'not-allowed' : 'pointer' }}>
                  <ArrowLeft size={16} /> BACK
                </button>
                {step < STEPS.length - 1 ? (
                  <button onClick={handleNext}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', backgroundColor: '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                    NEXT <ArrowRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{ padding: '12px 28px', backgroundColor: submitting ? '#0077bb' : '#01a3fc', color: '#000', border: 'none', borderRadius: 8, fontWeight: 900, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                    {submitting ? 'SUBMITTING...' : 'SUBMIT LISTING'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <BottomBar />
    </div>
  )
}