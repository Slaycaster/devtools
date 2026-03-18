import { useState, useCallback } from 'react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'

type Indent = 2 | 4 | 'tab'

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      match => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) return `<span style="color:#7dd3fc">${match}</span>` // key - light blue
          return `<span style="color:#86efac">${match}</span>` // string - green
        }
        if (/true|false/.test(match)) return `<span style="color:#fbbf24">${match}</span>` // bool - amber
        if (/null/.test(match)) return `<span style="color:#f87171">${match}</span>` // null - red
        return `<span style="color:#c4b5fd">${match}</span>` // number - violet
      }
    )
}

export function JsonFormatter() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<Indent>(2)
  const [error, setError] = useState<{ message: string; line?: number } | null>(null)
  const [formatted, setFormatted] = useState('')
  const { copied, copy } = useCopyToClipboard()

  const process = useCallback((raw: string, ind: Indent) => {
    setInput(raw)
    if (!raw.trim()) { setFormatted(''); setError(null); return }
    try {
      const parsed = JSON.parse(raw)
      const spaces = ind === 'tab' ? '\t' : ind
      const out = JSON.stringify(parsed, null, spaces)
      setFormatted(out)
      setError(null)
    } catch (e) {
      setFormatted('')
      const msg = e instanceof Error ? e.message : 'Invalid JSON'
      // extract line info
      const lineMatch = msg.match(/line (\d+)/)
      setError({ message: msg, line: lineMatch ? parseInt(lineMatch[1]!) : undefined })
    }
  }, [])

  const minify = () => {
    if (!input.trim()) return
    try {
      const out = JSON.stringify(JSON.parse(input))
      setFormatted(out)
      setError(null)
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : 'Invalid JSON' })
    }
  }

  const changeIndent = (ind: Indent) => {
    setIndent(ind)
    process(input, ind)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">JSON Formatter</h2>
        <p className="text-sm text-zinc-500">Format, validate, and syntax-highlight JSON</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => process(input, indent)}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors font-medium"
        >
          Format
        </button>
        <button
          onClick={minify}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
        >
          Minify
        </button>
        <div className="flex items-center gap-1 ml-2 bg-zinc-800 rounded-lg p-0.5">
          {([2, 4, 'tab'] as Indent[]).map(ind => (
            <button
              key={String(ind)}
              onClick={() => changeIndent(ind)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                indent === ind ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {ind === 'tab' ? '⇥ tab' : `${ind}sp`}
            </button>
          ))}
        </div>
        {formatted && (
          <button
            onClick={() => copy(formatted)}
            className="ml-auto px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy Output'}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Input</label>
          <textarea
            value={input}
            onChange={e => process(e.target.value, indent)}
            placeholder={'{\n  "hello": "world"\n}'}
            rows={20}
            className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Output</label>
          {error ? (
            <div className="bg-zinc-900 border border-red-900/50 rounded-lg p-3 h-[calc(100%-1.5rem)]">
              <div className="text-red-400 text-sm font-medium mb-1">Parse Error</div>
              <div className="text-red-300/80 text-xs font-mono">{error.message}</div>
              {error.line && (
                <div className="text-zinc-500 text-xs mt-2">Line {error.line}</div>
              )}
            </div>
          ) : formatted ? (
            <div
              className="font-mono text-xs bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-auto max-h-[480px] leading-relaxed whitespace-pre"
              dangerouslySetInnerHTML={{ __html: syntaxHighlight(formatted) }}
            />
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 h-[calc(100%-1.5rem)] flex items-center justify-center text-zinc-700 text-sm">
              Output appears here
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
