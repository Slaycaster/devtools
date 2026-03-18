import { useState, useCallback, useRef, useEffect } from 'react'
import { encode, decode } from '@toon-format/toon'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

const SAMPLE_JSON = `{
  "name": "devtools",
  "version": "1.0.0",
  "features": ["jwt", "json", "toon"],
  "server": {
    "host": "localhost",
    "port": 3000
  },
  "users": [
    { "name": "Alice", "age": 30 },
    { "name": "Bob", "age": 25 }
  ]
}`

function Editor({
  label,
  value,
  onChange,
  error,
  onCopy,
  copied,
  placeholder,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  error?: string
  onCopy: () => void
  copied: boolean
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
        <button
          onClick={onCopy}
          className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        readOnly={!onChange}
        placeholder={placeholder}
        rows={20}
        className={`
          w-full font-mono text-sm bg-zinc-900 rounded-lg p-3 resize-none focus:outline-none transition-colors
          ${error
            ? 'border border-red-700 focus:border-red-500'
            : 'border border-zinc-700 focus:border-violet-500'
          }
          ${!onChange ? 'text-zinc-300 cursor-default' : 'text-zinc-100'}
        `}
      />
      {error && (
        <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded px-2 py-1.5">
          {error}
        </div>
      )}
    </div>
  )
}

export function JsonTomlConverter() {
  const [jsonText, setJsonText] = useState(SAMPLE_JSON)
  const [toonText, setToonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [toonError, setToonError] = useState('')
  const [direction, setDirection] = useState<'json→toon' | 'toon→json'>('json→toon')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { copied: copiedJson, copy: copyJson } = useCopyToClipboard()
  const { copied: copiedToon, copy: copyToon } = useCopyToClipboard()

  const convertJsonToToon = useCallback((json: string) => {
    setJsonText(json)
    setDirection('json→toon')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!json.trim()) { setToonText(''); setJsonError(''); return }
      try {
        const parsed = JSON.parse(json)
        const toon = encode(parsed)
        setToonText(toon)
        setJsonError('')
        setToonError('')
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
        setToonText('')
      }
    }, 300)
  }, [])

  const convertToonToJson = useCallback((toon: string) => {
    setToonText(toon)
    setDirection('toon→json')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!toon.trim()) { setJsonText(''); setToonError(''); return }
      try {
        const parsed = decode(toon)
        setJsonText(JSON.stringify(parsed, null, 2))
        setToonError('')
        setJsonError('')
      } catch (e) {
        setToonError(e instanceof Error ? e.message : 'Invalid TOON')
        setJsonText('')
      }
    }, 300)
  }, [])

  // Initialize on mount
  useEffect(() => { convertJsonToToon(SAMPLE_JSON) }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">JSON ↔ TOON Converter</h2>
        <p className="text-sm text-zinc-500">
          Token-Oriented Object Notation — compact, human-readable JSON for LLM prompts.
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
            direction === 'json→toon' ? 'bg-violet-900/60 text-violet-400' : 'bg-amber-900/60 text-amber-400'
          }`}>
            {direction}
          </span>
        </p>
      </div>

      <div className="flex gap-4">
        <Editor
          label="JSON"
          value={jsonText}
          onChange={convertJsonToToon}
          error={jsonError}
          onCopy={() => copyJson(jsonText)}
          copied={copiedJson}
          placeholder={'{\n  "key": "value"\n}'}
        />

        <div className="flex items-center justify-center shrink-0">
          <div className="text-2xl text-zinc-600">⇄</div>
        </div>

        <Editor
          label="TOON"
          value={toonText}
          onChange={convertToonToJson}
          error={toonError}
          onCopy={() => copyToon(toonText)}
          copied={copiedToon}
          placeholder={'name: Alice\nage: 30'}
        />
      </div>
    </div>
  )
}
