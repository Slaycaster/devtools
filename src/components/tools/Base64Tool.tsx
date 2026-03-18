import { useState, useCallback, useRef } from 'react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n === 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

/** Detect image MIME from raw Uint8Array magic bytes */
function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  // WebP: RIFF????WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return null
}

/** Attempt to decode base64 → { text?, imageSrc?, mime, byteLength } */
function decodeBase64(b64: string): { text?: string; imageSrc?: string; mime: string; byteLength: number } {
  const raw = atob(b64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  const imageMime = detectImageMime(bytes)
  if (imageMime) {
    return { imageSrc: `data:${imageMime};base64,${b64}`, mime: imageMime, byteLength: bytes.length }
  }

  // Try UTF-8
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { text, mime: 'text/plain; charset=utf-8', byteLength: bytes.length }
  } catch {
    // Binary blob — just report size
    return { mime: 'application/octet-stream', byteLength: bytes.length }
  }
}

/** Strip optional data URI prefix, return { mime, b64 } */
function stripDataUri(raw: string): { mime: string | null; b64: string } {
  const match = raw.match(/^data:([^;]+);base64,(.+)$/s)
  if (match) return { mime: match[1], b64: match[2].trim() }
  return { mime: null, b64: raw.trim() }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const { copied, copy } = useCopyToClipboard()
  return (
    <button
      onClick={() => copy(text)}
      disabled={!text}
      className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 transition-colors"
    >
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

interface StatsBarProps {
  inputBytes: number
  outputBytes: number
  mode: 'encode' | 'decode'
}
function StatsBar({ inputBytes, outputBytes, mode }: StatsBarProps) {
  if (inputBytes === 0) return null
  const ratio = outputBytes > 0 ? (outputBytes / inputBytes).toFixed(2) : '—'
  return (
    <div className="flex flex-wrap gap-4 text-xs text-zinc-500 border-t border-zinc-800 pt-3">
      <span>Input: <span className="text-zinc-400">{formatBytes(inputBytes)}</span></span>
      <span>Output: <span className="text-zinc-400">{outputBytes > 0 ? formatBytes(outputBytes) : '—'}</span></span>
      {mode === 'encode' && (
        <span>Ratio: <span className="text-zinc-400">{ratio}×</span></span>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

type Mode = 'encode' | 'decode'

interface DecodeResult {
  text?: string
  imageSrc?: string
  mime: string
  byteLength: number
}

export function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode')

  // Encode state
  const [encodeInput, setEncodeInput] = useState('')
  const [encodeOutput, setEncodeOutput] = useState('')
  const [encodeInputBytes, setEncodeInputBytes] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileMime, setFileMime] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Decode state
  const [decodeInput, setDecodeInput] = useState('')
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null)
  const [decodeError, setDecodeError] = useState('')
  const [detectedMime, setDetectedMime] = useState<string | null>(null)
  const [wrapLines, setWrapLines] = useState(false)

  // ── Encode handlers ──────────────────────────────────────────────────────────

  const encodeText = useCallback((text: string) => {
    setFileName(null)
    setFileMime(null)
    setEncodeInput(text)
    if (!text) { setEncodeOutput(''); setEncodeInputBytes(0); return }
    const bytes = new TextEncoder().encode(text)
    setEncodeInputBytes(bytes.length)
    // btoa requires binary string
    let binary = ''
    bytes.forEach(b => { binary += String.fromCharCode(b) })
    setEncodeOutput(btoa(binary))
  }, [])

  const encodeFile = useCallback((file: File) => {
    setFileName(file.name)
    setFileMime(file.type || null)
    setEncodeInput('')
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result is a data URI: data:<mime>;base64,<b64>
      const b64 = result.split(',')[1]
      setEncodeOutput(b64)
      setEncodeInputBytes(file.size)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) encodeFile(file)
  }, [encodeFile])

  // ── Decode handlers ──────────────────────────────────────────────────────────

  const runDecode = useCallback((raw: string) => {
    setDecodeInput(raw)
    if (!raw.trim()) { setDecodeResult(null); setDecodeError(''); setDetectedMime(null); return }

    const { mime: uriMime, b64 } = stripDataUri(raw)
    if (uriMime) setDetectedMime(uriMime)

    try {
      const result = decodeBase64(b64)
      setDecodeResult(result)
      setDetectedMime(uriMime ?? result.mime)
      setDecodeError('')
    } catch {
      setDecodeResult(null)
      setDecodeError('Invalid Base64 — make sure the input is properly encoded')
    }
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────

  const encodeOutputBytes = encodeOutput ? Math.ceil(encodeOutput.length * 3 / 4) : 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header + mode toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">Base64</h2>
          <p className="text-sm text-zinc-500">Encode text or files to Base64, or decode Base64 back to content</p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700 shrink-0">
          {(['encode', 'decode'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                mode === m
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── ENCODE ── */}
      {mode === 'encode' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Input</span>
              {(encodeInput || fileName) && (
                <button
                  onClick={() => { setEncodeInput(''); setEncodeOutput(''); setFileName(null); setFileMime(null); setEncodeInputBytes(0) }}
                  className="text-xs text-zinc-600 hover:text-zinc-400"
                >✕ Clear</button>
              )}
            </div>

            <textarea
              value={encodeInput}
              onChange={e => encodeText(e.target.value)}
              placeholder="Type or paste text to encode…"
              rows={8}
              className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
            />

            {/* Drop zone */}
            <div
              onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-5 cursor-pointer transition-colors text-sm
                ${isDragging
                  ? 'border-violet-500 bg-violet-950/20 text-violet-300'
                  : 'border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-400'}
              `}
            >
              <span className="text-2xl">📂</span>
              {fileName
                ? <span className="text-zinc-300 font-medium">{fileName}{fileMime ? ` · ${fileMime}` : ''}</span>
                : <span>Drop a file here or <span className="text-violet-400 underline">browse</span></span>
              }
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) encodeFile(f) }} />
            </div>
          </div>

          {/* Right: output */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Base64 Output</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wrapLines}
                    onChange={e => setWrapLines(e.target.checked)}
                    className="accent-violet-500"
                  />
                  Wrap
                </label>
                <CopyBtn text={encodeOutput} />
              </div>
            </div>

            <div className="h-[calc(8rem+2px+5rem+2px+2px)] min-h-[200px] bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-auto">
              {encodeOutput ? (
                <pre className={`font-mono text-xs text-zinc-300 ${wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                  {encodeOutput}
                </pre>
              ) : (
                <span className="text-zinc-600 text-sm">Base64 output will appear here…</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DECODE ── */}
      {mode === 'decode' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Base64 Input</span>
              {decodeInput && (
                <button
                  onClick={() => { setDecodeInput(''); setDecodeResult(null); setDecodeError(''); setDetectedMime(null) }}
                  className="text-xs text-zinc-600 hover:text-zinc-400"
                >✕ Clear</button>
              )}
            </div>

            <textarea
              value={decodeInput}
              onChange={e => runDecode(e.target.value)}
              placeholder={'Paste Base64 string here…\ndata:image/png;base64,... also works'}
              rows={12}
              className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Right: output */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Decoded Output</span>
              <div className="flex items-center gap-2">
                {decodeResult?.text && (
                  <>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={wrapLines}
                        onChange={e => setWrapLines(e.target.checked)}
                        className="accent-violet-500"
                      />
                      Wrap
                    </label>
                    <CopyBtn text={decodeResult.text} />
                  </>
                )}
              </div>
            </div>

            {/* MIME badge */}
            {detectedMime && !decodeError && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">
                  {detectedMime}
                </span>
              </div>
            )}

            <div className="min-h-[200px] bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-auto flex flex-col gap-3">
              {decodeError && (
                <div className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  {decodeError}
                </div>
              )}

              {!decodeResult && !decodeError && (
                <span className="text-zinc-600 text-sm">Decoded content will appear here…</span>
              )}

              {decodeResult?.imageSrc && (
                <div className="space-y-2">
                  <img
                    src={decodeResult.imageSrc}
                    alt="Decoded"
                    className="max-w-full rounded border border-zinc-700"
                  />
                  <CopyBtn text={decodeResult.imageSrc} label="Copy data URI" />
                </div>
              )}

              {decodeResult?.text && (
                <pre className={`font-mono text-xs text-zinc-300 ${wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                  {decodeResult.text}
                </pre>
              )}

              {decodeResult && !decodeResult.text && !decodeResult.imageSrc && (
                <div className="text-zinc-500 text-sm">
                  Binary content ({formatBytes(decodeResult.byteLength)}) — not displayable as text or image.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {mode === 'encode' && (
        <StatsBar
          inputBytes={encodeInputBytes}
          outputBytes={encodeOutput.length}
          mode="encode"
        />
      )}
      {mode === 'decode' && decodeResult && (
        <StatsBar
          inputBytes={decodeInput.replace(/^data:[^;]+;base64,/, '').trim().length}
          outputBytes={decodeResult.byteLength}
          mode="decode"
        />
      )}
    </div>
  )
}
