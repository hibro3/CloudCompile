import React, { useState } from 'react'
import {
  Play, Download, Upload, Share2, Settings,
  FileText, X, Check, Copy
} from 'lucide-react'
import type { EditorSettings } from '../types'
import { useStore } from '../store/useStore'
import { LANGUAGE_MAP } from '../constants'
import { saveAs } from 'file-saver'
import { executeCode } from '../.gitignore/api/executor'

/* ---------- DOWNLOAD MODAL ---------- */
function DownloadModal({ onClose }: { onClose: () => void }) {
  const { code, languageKey, filename, setFilename } = useStore()
  const lang = LANGUAGE_MAP[languageKey]
  const [name, setName] = useState(filename)

  const handleDownload = () => {
    const fullName = `${name}${lang.extension}`
    const blob = new Blob([code], { type: `${lang.mime};charset=utf-8` })
    saveAs(blob, fullName)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Download size={16} className="text-primary" />
            Download File
          </h2>
          <button onClick={onClose} className="btn btn-ghost !p-1.5 !border-0">
            <X size={16} />
          </button>
        </div>
        <p className="text-text-muted text-xs mb-4">
          Your file will be saved with the correct extension for{' '}
          <span className="text-text-primary font-medium">{lang.label}</span>.
        </p>
        <label className="block text-xs text-text-muted mb-1">Filename</label>
        <div className="flex gap-2 mb-5">
          <input
            className="input flex-1"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDownload()}
            autoFocus
          />
          <span className="input flex-shrink-0 !w-auto text-text-muted cursor-default select-none">
            {lang.extension}
          </span>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleDownload} className="btn btn-primary">
            <Download size={14} /> Download
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- SHARE MODAL ---------- */
function ShareModal({ onClose }: { onClose: () => void }) {
  const { code, languageKey } = useStore()
  const [copied, setCopied] = useState(false)

  const encoded = btoa(unescape(encodeURIComponent(code))).slice(0, 4096)
  const url = `${window.location.origin}?lang=${languageKey}&code=${encoded}`

  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Share2 size={16} className="text-primary" />
            Share Code
          </h2>
          <button onClick={onClose} className="btn btn-ghost !p-1.5 !border-0">
            <X size={16} />
          </button>
        </div>
        <p className="text-text-muted text-xs mb-3">
          Copy this link to share your code. Large files may be truncated.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1 !text-xs font-mono"
            value={url}
            readOnly
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <button onClick={copy} className="btn btn-primary !px-3">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="btn btn-ghost">Close</button>
        </div>
      </div>
    </div>
  )
}



/* ---------- SETTINGS MODAL ---------- */
function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useStore()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Settings size={16} className="text-primary" />
            Editor Settings
          </h2>
          <button onClick={onClose} className="btn btn-ghost !p-1.5 !border-0">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Font Size */}
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Font Size: <span className="text-text-primary">{settings.fontSize}px</span>
            </label>
            <input
              type="range" min={12} max={20} value={settings.fontSize}
              onChange={e => updateSettings({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Theme</label>
            <select
              value={settings.theme}
              onChange={e => updateSettings({ theme: e.target.value as EditorSettings['theme'] })}
              className="input"
            >
              <option value="vs-dark">🌙 Dark (Default)</option>
              <option value="vs-light">☀️ Light</option>
              <option value="hc-black">⚡ High Contrast</option>
            </select>
          </div>

          {/* Toggles */}
          {[
            { key: 'minimap', label: 'Show Minimap' },
            { key: 'lineNumbers', label: 'Show Line Numbers' },
            { key: 'wordWrap', label: 'Word Wrap' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm text-text-primary">{label}</span>
              <button
                onClick={() => updateSettings({ [key]: !settings[key as keyof typeof settings] })}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings[key as keyof typeof settings] ? 'bg-primary' : 'bg-bg-surface border border-border'
                  }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </label>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn btn-primary">Done</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- NAVBAR ---------- */
export default function Navbar() {
  const { languageKey, filename, setFilename, code, setCode, setResult, setExecutionStatus, executionStatus, setActiveOutputTab, appendLine, clearTerminal, requestInput } = useStore()
  const lang = LANGUAGE_MAP[languageKey]

  const [showDownload, setShowDownload] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [filenameEditing, setFilenameEditing] = useState(false)

  /* ----- File Upload ----- */
  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.py'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = e => {
        const content = e.target?.result as string
        setCode(content)
        setFilename(file.name.replace(/\.py$/i, ''))
      }
      reader.readAsText(file)
    }
    input.click()
  }

  /* ----- Run code ----- */
  const handleRun = async () => {
    if (executionStatus === 'running' || executionStatus === 'loading-runtime') return

    clearTerminal()
    setResult(null)
    setActiveOutputTab('output')

    // Python/Pyodide needs time to load on first run
    setExecutionStatus('loading-runtime')

    try {
      const result = await executeCode(
        code,
        // onLine – append each streamed line to the terminal
        (line) => {
          setExecutionStatus('running')
          appendLine(line)
        },
        // onInputRequest – delegate to store (resolves when user hits Enter)
        () => requestInput()
      )
      setResult(result)
      setExecutionStatus(result.status)
      if (result.status === 'error') setActiveOutputTab('error')
    } catch (err) {
      const r = { stdout: '', stderr: String(err), exitCode: -1, status: 'error' as const }
      setResult(r)
      setExecutionStatus('error')
      setActiveOutputTab('error')
    }
  }

  return (
    <>
      <header
        className="flex items-center justify-between px-3 border-b border-[var(--border)] flex-shrink-0"
        style={{ height: 48, background: 'var(--bg-navbar)', gap: 8 }}
      >
        {/* LEFT: Logo + Language Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-1.5 mr-1">
            <img
              src="/logo.png"
              alt="CloudCompile Logo"
              className="w-8 h-8 object-contain rounded-md"
            />
            <span className="font-bold text-text-primary text-sm tracking-tight hide-mobile">CloudCompile</span>
          </div>

          {/* Static Python badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-primary border border-[var(--border)] select-none">
            <span>{lang.icon}</span>
            <span className="hide-mobile">{lang.label} 3</span>
          </div>
        </div>

        {/* CENTER: Filename */}
        <div className="flex items-center gap-1 text-xs text-text-muted min-w-0 flex-shrink">
          <FileText size={12} className="flex-shrink-0" />
          {filenameEditing ? (
            <input
              className="bg-transparent border-b border-primary outline-none text-text-primary text-xs w-24 text-center"
              value={filename}
              autoFocus
              onChange={e => setFilename(e.target.value)}
              onBlur={() => setFilenameEditing(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setFilenameEditing(false) }}
            />
          ) : (
            <button
              className="hover:text-text-primary transition-colors truncate max-w-[120px]"
              onClick={() => setFilenameEditing(true)}
              title="Click to rename"
            >
              {filename}{lang.extension}
            </button>
          )}
        </div>

        {/* RIGHT: Actions + Run */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <NavBtn onClick={handleUpload} title="Open File (Ctrl+O)" icon={<Upload size={15} />} label="Open" />
          <NavBtn onClick={() => setShowDownload(true)} title="Download File (Ctrl+S)" icon={<Download size={15} />} label="Download" />
          <NavBtn onClick={() => setShowShare(true)} title="Share" icon={<Share2 size={15} />} label="Share" />
          <NavBtn onClick={() => setShowSettings(true)} title="Settings" icon={<Settings size={15} />} label="" />

          {/* Run */}
          <button
            className={`run-btn ml-1 ${executionStatus === 'running' ? 'running' : ''}`}
            onClick={handleRun}
            disabled={executionStatus === 'running'}
            title="Run Code (Ctrl+Enter)"
          >
            {executionStatus === 'running' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hide-mobile">Running…</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span className="hide-mobile">Run</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Modals */}
      {showDownload && <DownloadModal onClose={() => setShowDownload(false)} />}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Keyboard shortcuts */}
      <KeyboardHandler onRun={handleRun} onDownload={() => setShowDownload(true)} onOpen={handleUpload} />
    </>
  )
}

function NavBtn({ onClick, title, icon, label }: { onClick: () => void; title: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="nav-btn flex items-center gap-1 px-2 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-xs"
    >
      {icon}
      {label && <span className="hide-mobile">{label}</span>}
    </button>
  )
}

function KeyboardHandler({ onRun, onDownload, onOpen }: { onRun: () => void; onDownload: () => void; onOpen: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun() }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onDownload() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); onOpen() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onRun, onDownload, onOpen])
  return null
}
