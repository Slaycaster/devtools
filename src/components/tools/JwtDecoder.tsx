import { useState } from 'react'
import { decodeJwt } from '../../utils/jwt'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import type { JwtParts } from '../../utils/jwt'

function CopyBtn({ text }: { text: string }) {
  const { copied, copy } = useCopyToClipboard()
  return (
    <button
      onClick={() => copy(text)}
      className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  )
}

function JsonBlock({ data, colorClass }: { data: Record<string, unknown>; colorClass: string }) {
  const formatted = JSON.stringify(data, null, 2)
  return (
    <div className={`rounded-lg border ${colorClass} bg-zinc-900 p-4`}>
      <div className="flex justify-end mb-2">
        <CopyBtn text={formatted} />
      </div>
      <pre className="font-mono text-xs text-zinc-200 whitespace-pre-wrap break-all overflow-auto max-h-64 leading-relaxed">
        {formatted}
      </pre>
    </div>
  )
}

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

export function JwtDecoder() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<JwtParts | null>(null)
  const [error, setError] = useState('')

  const decode = (value: string) => {
    setInput(value)
    if (!value.trim()) { setResult(null); setError(''); return }
    try {
      setResult(decodeJwt(value))
      setError('')
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : 'Invalid JWT')
    }
  }

  const parts = input.trim().split('.')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">JWT Decoder</h2>
        <p className="text-sm text-zinc-500">Paste a JWT token to inspect its contents</p>
      </div>

      <div className="relative">
        <textarea
          value={input}
          onChange={e => decode(e.target.value)}
          placeholder={SAMPLE_JWT}
          rows={4}
          className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
        />
        {input && (
          <button
            onClick={() => decode('')}
            className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-400 text-xs"
          >✕</button>
        )}
      </div>

      {/* Color-coded token display */}
      {input.trim() && (
        <div className="font-mono text-sm bg-zinc-900 border border-zinc-800 rounded-lg p-3 break-all leading-relaxed">
          <span className="text-red-400">{parts[0]}</span>
          {parts.length > 1 && <span className="text-zinc-600">.</span>}
          <span className="text-violet-400">{parts[1]}</span>
          {parts.length > 2 && <span className="text-zinc-600">.</span>}
          <span className="text-cyan-400">{parts[2]}</span>
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="grid gap-4">
          {/* Exp status */}
          <div className="flex items-center gap-3">
            <span className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
              ${result.expStatus === 'valid' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' :
                result.expStatus === 'expired' ? 'bg-red-950/60 text-red-400 border border-red-800/60' :
                'bg-zinc-800 text-zinc-400 border border-zinc-700'}
            `}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                result.expStatus === 'valid' ? 'bg-emerald-400' :
                result.expStatus === 'expired' ? 'bg-red-400' : 'bg-zinc-500'
              }`} />
              {result.expStatus === 'valid' ? 'Valid' :
               result.expStatus === 'expired' ? 'Expired' : 'No Expiration'}
            </span>
            {result.expDate && (
              <span className="text-xs text-zinc-500">
                Expires: {result.expDate.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Header</span>
            </div>
            <JsonBlock data={result.decoded.header} colorClass="border-red-900/50" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Payload</span>
            </div>
            <JsonBlock data={result.decoded.payload} colorClass="border-violet-900/50" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Signature</span>
            </div>
            <div className="rounded-lg border border-cyan-900/50 bg-zinc-900 p-4">
              <div className="flex justify-end mb-2">
                <CopyBtn text={result.raw.signature} />
              </div>
              <p className="font-mono text-xs text-zinc-400 break-all">{result.raw.signature}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
