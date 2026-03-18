export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }

export function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = ln - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

export function parseColor(input: string): RGB | null {
  const trimmed = input.trim()
  // hex
  if (trimmed.startsWith('#')) return hexToRgb(trimmed)
  // rgb(r,g,b)
  const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1]!), g: parseInt(rgbMatch[2]!), b: parseInt(rgbMatch[3]!) }
  }
  // hsl(h,s%,l%)
  const hslMatch = trimmed.match(/^hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)$/i)
  if (hslMatch) {
    return hslToRgb({ h: parseInt(hslMatch[1]!), s: parseInt(hslMatch[2]!), l: parseInt(hslMatch[3]!) })
  }
  // plain hex without #
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return hexToRgb('#' + trimmed)
  // try CSS named color via canvas
  try {
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.fillStyle = trimmed
    const computed = ctx.fillStyle
    if (computed.startsWith('#')) return hexToRgb(computed)
  } catch {}
  return null
}

export function getHarmonies(hsl: HSL) {
  const complement = { ...hsl, h: (hsl.h + 180) % 360 }
  const analogous1 = { ...hsl, h: (hsl.h + 30) % 360 }
  const analogous2 = { ...hsl, h: (hsl.h - 30 + 360) % 360 }
  const triadic1 = { ...hsl, h: (hsl.h + 120) % 360 }
  const triadic2 = { ...hsl, h: (hsl.h + 240) % 360 }
  return {
    complement: hslToRgb(complement),
    analogous: [hslToRgb(analogous1), hslToRgb(analogous2)] as [RGB, RGB],
    triadic: [hslToRgb(triadic1), hslToRgb(triadic2)] as [RGB, RGB],
  }
}
