import { useState } from 'react'
import { TabBar } from './components/TabBar'
import { JwtDecoder } from './components/tools/JwtDecoder'
import { JsonFormatter } from './components/tools/JsonFormatter'
import { TokenCounter } from './components/tools/TokenCounter'
import { ColorPicker } from './components/tools/ColorPicker'
import { JsonTomlConverter } from './components/tools/JsonTomlConverter'
import type { Tab } from './components/TabBar'

const TABS: Tab[] = [
  { id: 'jwt', label: 'JWT Decoder', icon: '🔐' },
  { id: 'json', label: 'JSON Formatter', icon: '📋' },
  { id: 'tokens', label: 'Token Counter', icon: '🪙' },
  { id: 'color', label: 'Color Picker', icon: '🎨' },
  { id: 'toml', label: 'JSON ↔ TOON', icon: '🔄' },
]

function App() {
  const [activeTab, setActiveTab] = useState('jwt')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🛠️</span>
          <h1 className="text-sm font-semibold text-zinc-300 tracking-tight">DevTools</h1>
          <span className="text-zinc-700 text-xs ml-auto">v0.1.0</span>
        </div>
      </header>

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <main className="min-h-[calc(100vh-8rem)]">
        <div style={{ display: activeTab === 'jwt' ? 'block' : 'none' }}>
          <JwtDecoder />
        </div>
        <div style={{ display: activeTab === 'json' ? 'block' : 'none' }}>
          <JsonFormatter />
        </div>
        <div style={{ display: activeTab === 'tokens' ? 'block' : 'none' }}>
          <TokenCounter />
        </div>
        <div style={{ display: activeTab === 'color' ? 'block' : 'none' }}>
          <ColorPicker />
        </div>
        <div style={{ display: activeTab === 'toml' ? 'block' : 'none' }}>
          <JsonTomlConverter />
        </div>
      </main>
    </div>
  )
}

export default App
