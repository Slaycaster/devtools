import { useState, useMemo } from 'react'
import { encode } from 'gpt-tokenizer'
import { MODEL_PRICES, estimateCost } from '../../utils/tokens'

// Alternating highlight colors for token visualization
const TOKEN_COLORS = [
  'bg-violet-900/50 text-violet-200',
  'bg-blue-900/50 text-blue-200',
  'bg-emerald-900/50 text-emerald-200',
  'bg-amber-900/50 text-amber-200',
  'bg-rose-900/50 text-rose-200',
  'bg-cyan-900/50 text-cyan-200',
]

export function TokenCounter() {
  const [text, setText] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [showHighlight, setShowHighlight] = useState(false)

  const { tokens, tokenCount, wordCount, charCount } = useMemo(() => {
    if (!text) return { tokens: [], tokenCount: 0, wordCount: 0, charCount: 0 }
    const encoded = encode(text)
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
    return {
      tokens: encoded,
      tokenCount: encoded.length,
      wordCount,
      charCount: text.length,
    }
  }, [text])

  // Decode tokens back to strings for highlighting
  const tokenStrings = useMemo(() => {
    if (!tokens.length) return []
    // Decode each token individually using TextDecoder
    const decoder = new TextDecoder('utf-8', { fatal: false })
    return tokens.map(id => {
      // gpt-tokenizer stores token bytes; reconstruct from id
      // We'll use a different approach: encode the full text and split by token boundaries
      // Actually we'll use the encode result and reconstruct character segments
      const bytes = new Uint8Array([id > 255 ? 63 : id]) // fallback
      return decoder.decode(bytes)
    })
  }, [tokens])

  // Better approach: rebuild highlighted text by tracking byte offsets
  const highlightedSegments = useMemo(() => {
    if (!text || !tokens.length) return []
    // Use a simple approach: re-tokenize progressively
    const segments: { text: string; colorIdx: number }[] = []
    let pos = 0
    const encoder = new TextEncoder()
    const textBytes = encoder.encode(text)
    let colorIdx = 0

    // Decode each token to get its byte length
    for (const tokenId of tokens) {
      // encode single token back — use a lookup via re-encoding substrings
      // Simple heuristic: find the shortest prefix whose encoding starts with this token
      let segEnd = pos + 1
      while (segEnd <= text.length) {
        const sub = textBytes.slice(pos, segEnd)
        const subStr = new TextDecoder().decode(sub)
        const encoded = encode(subStr)
        if (encoded[0] === tokenId) {
          segments.push({ text: subStr, colorIdx: colorIdx % TOKEN_COLORS.length })
          colorIdx++
          pos = segEnd
          break
        }
        segEnd++
        if (segEnd > pos + 20) {
          // give up for this token, advance 1 char
          segments.push({ text: text[pos] ?? '', colorIdx: colorIdx % TOKEN_COLORS.length })
          colorIdx++
          pos++
          break
        }
      }
      if (pos >= text.length) break
    }
    // any remaining text
    if (pos < text.length) {
      segments.push({ text: text.slice(pos), colorIdx: colorIdx % TOKEN_COLORS.length })
    }
    return segments
  }, [text, tokens])

  const cost = estimateCost(tokenCount, selectedModel)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">AI Token Counter</h2>
        <p className="text-sm text-zinc-500">Count tokens using cl100k_base encoding (GPT-4 compatible)</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tokens', value: tokenCount.toLocaleString(), accent: 'text-violet-400' },
          { label: 'Words', value: wordCount.toLocaleString(), accent: 'text-blue-400' },
          { label: 'Characters', value: charCount.toLocaleString(), accent: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${stat.accent}`}>{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Model selector + cost */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-zinc-400 font-medium">Estimated Cost</label>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          >
            {Object.entries(MODEL_PRICES).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Input cost: </span>
            <span className="font-mono text-amber-400 font-semibold">{cost.input}</span>
          </div>
          <div>
            <span className="text-zinc-500">Output cost: </span>
            <span className="font-mono text-amber-400 font-semibold">{cost.output}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Input Text</label>
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
          <div
            onClick={() => setShowHighlight(h => !h)}
            className={`relative w-8 h-4 rounded-full transition-colors ${showHighlight ? 'bg-violet-600' : 'bg-zinc-700'}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showHighlight ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </div>
          Highlight tokens
        </label>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste your text here to count tokens..."
        rows={8}
        className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
      />

      {showHighlight && text && (
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Token Visualization</label>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 font-mono text-sm leading-8 break-all">
            {highlightedSegments.map((seg, i) => (
              <span
                key={i}
                className={`${TOKEN_COLORS[seg.colorIdx]} px-0.5 rounded`}
              >
                {seg.text}
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-600">Each color block = one token</p>
        </div>
      )}

      {tokenStrings.length === 0 && (
        <div className="text-center py-4 text-zinc-700 text-sm">
          Start typing to see token analysis
        </div>
      )}
    </div>
  )
}
