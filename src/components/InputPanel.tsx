import { useStore } from '../store/useStore'
import { Terminal } from 'lucide-react'

export default function InputPanel() {
  const { stdin, setStdin } = useStore()

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-panel)' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] flex-shrink-0">
        <Terminal size={13} className="text-text-muted" />
        <span className="text-xs font-medium text-text-muted">stdin</span>
        <span className="text-[10px] text-text-muted/60 ml-auto">Custom input</span>
      </div>
      <textarea
        className="flex-1 w-full resize-none outline-none p-3 text-xs font-mono text-text-primary placeholder-text-muted/50"
        style={{ background: 'transparent', lineHeight: 1.6 }}
        value={stdin}
        onChange={e => setStdin(e.target.value)}
        placeholder="Enter program input here…"
        spellCheck={false}
        aria-label="Standard input"
      />
    </div>
  )
}
