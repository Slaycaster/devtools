import type { ReactNode } from 'react'

export interface Tab {
  id: string
  label: string
  icon: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
              border-b-2 transition-all duration-150
              ${active === tab.id
                ? 'border-violet-500 text-violet-400 bg-zinc-900/50'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
              }
            `}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
