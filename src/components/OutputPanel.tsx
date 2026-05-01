import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Trash2, Terminal, AlertCircle, Info, Loader2, CornerDownLeft } from 'lucide-react'

// ── ANSI colour map (basic 16-colour subset) ─────────────────────────────
function renderAnsi(raw: string): string {
  return raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\x1b\[31m/g, '<span class="ansi-red">')
    .replace(/\x1b\[32m/g, '<span class="ansi-green">')
    .replace(/\x1b\[33m/g, '<span class="ansi-yellow">')
    .replace(/\x1b\[34m/g, '<span class="ansi-blue">')
    .replace(/\x1b\[36m/g, '<span class="ansi-cyan">')
    .replace(/\x1b\[1m/g,  '<span class="ansi-bold">')
    .replace(/\x1b\[0m/g,  '</span>')
    .replace(/\x1b\[[0-9;]*m/g, '')
}

export default function OutputPanel() {
  const {
    terminalLines, isAwaitingInput, result, executionStatus,
    clearOutput, clearTerminal, submitInput, activeOutputTab, setActiveOutputTab,
  } = useStore()

  const [inputValue, setInputValue] = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const isRunning   = executionStatus === 'running' || executionStatus === 'loading-runtime'

  // Auto-scroll to bottom on new output or input request
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalLines, isAwaitingInput])

  // Focus the input box whenever a prompt appears
  useEffect(() => {
    if (isAwaitingInput) inputRef.current?.focus()
  }, [isAwaitingInput])

  const handleSubmit = () => {
    if (!isAwaitingInput) return
    submitInput(inputValue)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  const tabs = [
    { id: 'output' as const, label: 'Terminal', icon: <Terminal size={12} /> },
    { id: 'error'  as const, label: 'Errors',   icon: <AlertCircle size={12} /> },
    { id: 'info'   as const, label: 'Info',      icon: <Info size={12} /> },
  ]

  const hasErrors = terminalLines.some(l => l.type === 'stderr') || !!result?.stderr

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-panel)' }}>

      {/* ── Tab Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-[var(--border)] flex-shrink-0">
        <div className="tab-list flex-1">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab flex items-center gap-1.5 ${activeOutputTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveOutputTab(t.id)}
            >
              {t.icon}
              {t.label}
              {t.id === 'error' && hasErrors && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-error" />
              )}
            </button>
          ))}
        </div>
        {(terminalLines.length > 0 || result) && (
          <button
            onClick={() => { clearOutput(); clearTerminal(); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            title="Clear terminal"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* ── Terminal Tab (interactive) ────────────────────────────────── */}
      {activeOutputTab === 'output' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable output area */}
          <div className="flex-1 overflow-y-auto terminal-body p-3 font-mono text-[13px]">

            {/* Empty state */}
            {!isRunning && terminalLines.length === 0 && (
              <div className="terminal-hint">
                <Terminal size={28} className="terminal-hint-icon" />
                <span>Run your code — output appears here interactively.</span>
              </div>
            )}

            {/* Loading Pyodide */}
            {isRunning && terminalLines.length === 0 && executionStatus === 'loading-runtime' && (
              <div className="flex items-center gap-2 text-xs text-text-muted animate-pulse-slow">
                <Loader2 size={14} className="animate-spin text-primary" />
                Loading Python runtime (Pyodide)…
              </div>
            )}

            {/* Terminal lines */}
            {terminalLines.map(line => (
              <div key={line.id} className={`terminal-line terminal-${line.type}`}>
                {line.type === 'stdin' ? (
                  // Echo typed input with a chevron prefix
                  <span className="terminal-input-echo">
                    <span className="terminal-prompt-char">›</span>
                    <span dangerouslySetInnerHTML={{ __html: renderAnsi(line.text) }} />
                  </span>
                ) : line.type === 'system' ? (
                  <span className="terminal-system"
                    dangerouslySetInnerHTML={{ __html: renderAnsi(line.text) }} />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: renderAnsi(line.text) }} />
                )}
              </div>
            ))}

            {/* Interactive input row */}
            {isAwaitingInput && (
              <div className="terminal-input-row">
                <span className="terminal-prompt-char terminal-blink-caret">›</span>
                <input
                  ref={inputRef}
                  className="terminal-input-field"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="type input and press Enter…"
                />
                <button
                  onClick={handleSubmit}
                  className="terminal-submit-btn"
                  title="Submit (Enter)"
                >
                  <CornerDownLeft size={13} />
                </button>
              </div>
            )}

            {/* Running indicator */}
            {isRunning && terminalLines.length > 0 && !isAwaitingInput && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted animate-pulse-slow">
                <Loader2 size={11} className="animate-spin text-primary" />
                running…
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* ── Error Tab ────────────────────────────────────────────────── */}
      {activeOutputTab === 'error' && (
        <div className="flex-1 overflow-auto p-3 font-mono text-[13px]">
          {terminalLines.filter(l => l.type === 'stderr').length === 0 && !result?.stderr ? (
            <span className="text-text-muted italic text-xs">No errors.</span>
          ) : (
            terminalLines
              .filter(l => l.type === 'stderr')
              .map(l => (
                <div key={l.id} className="terminal-line terminal-stderr">
                  <span dangerouslySetInnerHTML={{ __html: renderAnsi(l.text) }} />
                </div>
              ))
          )}
        </div>
      )}

      {/* ── Info Tab ─────────────────────────────────────────────────── */}
      {activeOutputTab === 'info' && (
        <div className="flex-1 overflow-auto p-3 space-y-2 text-xs font-mono">
          <InfoRow label="Exit Code" value={String(result?.exitCode ?? '—')}
            color={result?.exitCode === 0 ? 'text-success' : 'text-error'} />
          <InfoRow label="CPU Time"
            value={result?.cpuTime !== undefined ? `${result.cpuTime.toFixed(3)}s` : '—'} />
          <InfoRow label="Status"
            value={(result?.status ?? executionStatus).toUpperCase()}
            color={
              result?.status === 'success' ? 'text-success' :
              result?.status === 'error'   ? 'text-error'   :
              result?.status === 'timeout' ? 'text-warning'  : 'text-text-muted'
            }
          />
          <InfoRow label="Lines out"
            value={String(terminalLines.filter(l => l.type === 'stdout').length)} />
          <InfoRow label="Encoding" value="UTF-8" />
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, color = 'text-text-primary' }: {
  label: string; value: string; color?: string
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-text-muted w-20 flex-shrink-0">{label}</span>
      <span className={`${color} font-semibold`}>{value}</span>
    </div>
  )
}
