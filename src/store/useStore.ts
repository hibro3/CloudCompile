import { create } from 'zustand'
import { ExecutionResult, ExecutionStatus, EditorSettings, TerminalLine } from '../types'
import { LANGUAGES, DEFAULT_SETTINGS } from '../constants'

interface AppState {
  // Editor
  languageKey: string
  code: string
  filename: string
  stdin: string
  cursorPosition: { line: number; col: number }

  // Execution
  executionStatus: ExecutionStatus
  result: ExecutionResult | null

  // Interactive terminal
  terminalLines: TerminalLine[]
  isAwaitingInput: boolean
  inputPrompt: string
  /** Called internally by executor to resolve the pending input Promise */
  _inputResolve: ((value: string) => void) | null

  // Output tab
  activeOutputTab: 'output' | 'error' | 'info'

  // Settings
  settings: EditorSettings

  // Actions
  setLanguage: (key: string, keepCode?: boolean) => void
  setCode: (code: string) => void
  setFilename: (name: string) => void
  setStdin: (stdin: string) => void
  setCursorPosition: (line: number, col: number) => void
  setExecutionStatus: (status: ExecutionStatus) => void
  setResult: (result: ExecutionResult | null) => void
  setActiveOutputTab: (tab: 'output' | 'error' | 'info') => void
  updateSettings: (settings: Partial<EditorSettings>) => void
  clearOutput: () => void

  // Terminal actions
  appendLine: (line: TerminalLine) => void
  clearTerminal: () => void
  /** Called by the executor when input() is triggered */
  requestInput: () => Promise<string>
  /** Called by the terminal UI when the user submits a line */
  submitInput: (value: string) => void
}

const savedSettings = (): EditorSettings => {
  try {
    const s = localStorage.getItem('codeforge-settings')
    const settings = s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS
    // Apply theme immediately on load to avoid flash
    document.documentElement.setAttribute(
      'data-theme',
      settings.theme === 'vs-light' ? 'light' : 'dark'
    )
    return settings
  } catch {
    return DEFAULT_SETTINGS
  }
}

let _lineId = 0
const uid = () => String(++_lineId)

export const useStore = create<AppState>((set, get) => ({
  languageKey: 'python',
  code: LANGUAGES[0].template,
  filename: 'main',
  stdin: '',
  cursorPosition: { line: 1, col: 1 },
  executionStatus: 'idle',
  result: null,
  terminalLines: [],
  isAwaitingInput: false,
  inputPrompt: '',
  _inputResolve: null,
  activeOutputTab: 'output',
  settings: savedSettings(),

  setLanguage: (key, keepCode = false) => {
    const lang = LANGUAGES.find(l => l.key === key)
    if (!lang) return
    set({ languageKey: key, code: keepCode ? get().code : lang.template, filename: 'main' })
  },

  setCode:            (code)          => set({ code }),
  setFilename:        (filename)      => set({ filename }),
  setStdin:           (stdin)         => set({ stdin }),
  setCursorPosition:  (line, col)     => set({ cursorPosition: { line, col } }),
  setExecutionStatus: (executionStatus) => set({ executionStatus }),
  setResult:          (result)        => set({ result }),
  setActiveOutputTab: (activeOutputTab) => set({ activeOutputTab }),

  updateSettings: (newSettings) => {
    const merged = { ...get().settings, ...newSettings }
    localStorage.setItem('codeforge-settings', JSON.stringify(merged))
    // Sync data-theme on <html> so CSS variables switch instantly
    document.documentElement.setAttribute(
      'data-theme',
      merged.theme === 'vs-light' ? 'light' : 'dark'
    )
    set({ settings: merged })
  },

  clearOutput: () =>
    set({ result: null, executionStatus: 'idle', activeOutputTab: 'output', terminalLines: [] }),

  appendLine: (line) =>
    set(s => ({ terminalLines: [...s.terminalLines, line] })),

  clearTerminal: () =>
    set({ terminalLines: [], isAwaitingInput: false, inputPrompt: '', _inputResolve: null }),

  requestInput: () =>
    new Promise<string>(resolve => {
      set({ isAwaitingInput: true, inputPrompt: '', _inputResolve: resolve })
    }),

  submitInput: (value) => {
    const resolve = get()._inputResolve
    if (!resolve) return
    // Echo the typed text into the terminal
    set(s => ({
      isAwaitingInput: false,
      inputPrompt: '',
      _inputResolve: null,
      terminalLines: [
        ...s.terminalLines,
        { id: uid(), type: 'stdin', text: value },
      ],
    }))
    resolve(value)
  },
}))
