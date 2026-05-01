import { useStore } from '../store/useStore'
import { LANGUAGE_MAP } from '../constants'

export default function StatusBar() {
  const { languageKey, cursorPosition, executionStatus, result } = useStore()
  const lang = LANGUAGE_MAP[languageKey]

  const statusBadge = () => {
    switch (executionStatus) {
      case 'running': return <span className="badge badge-running">● Running</span>
      case 'loading-runtime': return <span className="badge badge-warning">● Initializing...</span>
      case 'success': return <span className="badge badge-success">✓ Success</span>
      case 'error':   return <span className="badge badge-error">✕ Error</span>
      case 'timeout': return <span className="badge badge-warning">⏱ Timeout</span>
      default:        return <span className="badge badge-idle">● Idle</span>
    }
  }

  return (
    <div
      className="flex items-center px-3 gap-4 border-t border-[var(--border)] flex-shrink-0"
      style={{ height: 24, background: 'var(--bg-statusbar)', fontSize: 11, color: 'var(--text-subtle)' }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 text-text-muted">
        <span>{lang.icon} {lang.label}</span>
        <span className="opacity-30">|</span>
        <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
        <span className="opacity-30">|</span>
        <span>UTF-8</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right */}
      <div className="flex items-center gap-3">
        {statusBadge()}
        <span className="text-text-muted/50 hide-mobile">Ctrl+Enter to Run</span>
      </div>
    </div>
  )
}
