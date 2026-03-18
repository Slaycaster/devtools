import { useState, useCallback, useRef, useEffect } from 'react'
import {
  parseColor, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, getHarmonies
} from '../../utils/colors'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import type { RGB, HSL } from '../../utils/colors'

function Swatch({ rgb, label }: { rgb: RGB; label: string }) {
  const { copied, copy } = useCopyToClipboard()
  const hex = rgbToHex(rgb)
  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer group"
      onClick={() => copy(hex)}
      title={`Copy ${hex}`}
    >
      <div
        className="w-12 h-12 rounded-xl border-2 border-zinc-700 group-hover:border-zinc-500 transition-colors shadow-lg"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs font-mono text-zinc-400">{copied ? '✓' : hex}</span>
      <span className="text-xs text-zinc-600">{label}</span>
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopyToClipboard()
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 w-10 shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1.5">
        <span className="font-mono text-sm text-zinc-200 flex-1">{value}</span>
        <button
          onClick={() => copy(value)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </div>
  )
}

export function ColorPicker() {
  const [input, setInput] = useState('#7c3aed')
  const [rgb, setRgb] = useState<RGB>({ r: 124, g: 58, b: 237 })
  const [error, setError] = useState('')
  const wheelRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const hsl: HSL = rgbToHsl(rgb)
  const hex = rgbToHex(rgb)
  const harmonies = getHarmonies(hsl)

  const applyColor = useCallback((raw: string) => {
    setInput(raw)
    const parsed = parseColor(raw)
    if (parsed) {
      setRgb(parsed)
      setError('')
    } else if (raw.trim()) {
      setError('Cannot parse color')
    } else {
      setError('')
    }
  }, [])

  // Draw color wheel
  useEffect(() => {
    const canvas = wheelRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    const cx = size / 2, cy = size / 2, r = size / 2 - 2

    ctx.clearRect(0, 0, size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx, dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= r) {
          const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360
          const sat = dist / r * 100
          const { r: rr, g, b } = hslToRgb({ h: angle, s: sat, l: 50 })
          ctx.fillStyle = `rgb(${rr},${g},${b})`
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
    // Draw current color indicator
    const angle = hsl.h * Math.PI / 180
    const dist = (hsl.s / 100) * r
    const ix = cx + Math.cos(angle) * dist
    const iy = cy + Math.sin(angle) * dist
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(ix, iy, 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = hex
    ctx.fill()
  }, [hsl.h, hsl.s, hex])

  const handleWheelClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current!
    const rect = canvas.getBoundingClientRect()
    const size = canvas.width
    const cx = size / 2, cy = size / 2, r = size / 2 - 2
    const x = (e.clientX - rect.left) * (size / rect.width)
    const y = (e.clientY - rect.top) * (size / rect.height)
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > r) return
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360
    const sat = dist / r * 100
    const newRgb = hslToRgb({ h: angle, s: sat, l: hsl.l })
    setRgb(newRgb)
    setInput(rgbToHex(newRgb))
    setError('')
  }, [hsl.l])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Color Picker</h2>
        <p className="text-sm text-zinc-500">Parse, convert, and explore color harmonies</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Input */}
          <div className="flex gap-2 items-center">
            <div
              className="w-10 h-10 rounded-lg border border-zinc-600 shrink-0"
              style={{ backgroundColor: hex }}
            />
            <input
              type="text"
              value={input}
              onChange={e => applyColor(e.target.value)}
              placeholder="#7c3aed or rgb(124,58,237) or violet"
              className="flex-1 font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
            <input
              type="color"
              value={hex}
              onChange={e => { setRgb(hexToRgb(e.target.value) ?? rgb); setInput(e.target.value) }}
              className="w-10 h-10 rounded-lg border border-zinc-600 cursor-pointer bg-transparent"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}

          {/* Color formats */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Formats</h3>
            <CopyField label="HEX" value={hex} />
            <CopyField label="RGB" value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} />
            <CopyField label="HSL" value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} />
          </div>

          {/* Lightness slider */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Lightness: {hsl.l}%</label>
            <input
              type="range" min={0} max={100} value={hsl.l}
              onChange={e => {
                const newRgb = hslToRgb({ ...hsl, l: parseInt(e.target.value) })
                setRgb(newRgb)
                setInput(rgbToHex(newRgb))
              }}
              className="w-full accent-violet-500"
              style={{
                background: `linear-gradient(to right, #000, hsl(${hsl.h},${hsl.s}%,50%), #fff)`
              }}
            />
          </div>

          {/* Harmonies */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Harmonies</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-600 mb-2">Complementary</p>
                <div className="flex gap-3">
                  <Swatch rgb={rgb} label="Base" />
                  <Swatch rgb={harmonies.complement} label="Complement" />
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-600 mb-2">Analogous</p>
                <div className="flex gap-3">
                  <Swatch rgb={harmonies.analogous[0]} label="-30°" />
                  <Swatch rgb={rgb} label="Base" />
                  <Swatch rgb={harmonies.analogous[1]} label="+30°" />
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-600 mb-2">Triadic</p>
                <div className="flex gap-3">
                  <Swatch rgb={rgb} label="Base" />
                  <Swatch rgb={harmonies.triadic[0]} label="+120°" />
                  <Swatch rgb={harmonies.triadic[1]} label="+240°" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Color wheel */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <canvas
              ref={wheelRef}
              width={240}
              height={240}
              onClick={handleWheelClick}
              onMouseMove={e => { if (isDragging) handleWheelClick(e) }}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              className="rounded-full cursor-crosshair"
              style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}
            />
          </div>
          <div
            className="w-24 h-24 rounded-2xl border-2 border-zinc-700 shadow-2xl"
            style={{ backgroundColor: hex }}
          />
          <p className="font-mono text-lg text-zinc-300">{hex}</p>
          <p className="text-sm text-zinc-500">Click wheel to pick hue/saturation</p>
        </div>
      </div>
    </div>
  )
}
