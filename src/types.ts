export interface Language {
  key: string
  label: string
  extension: string
  monacoLanguage: string
  mime: string
  icon: string
  template: string
  supportsStdin: boolean
}

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'timeout' | 'loading-runtime'

export interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number | null
  memoryUsed?: number
  cpuTime?: number
  status: ExecutionStatus
}

export interface EditorSettings {
  fontSize: number
  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  minimap: boolean
  lineNumbers: boolean
  wordWrap: boolean
}

/** A single line rendered in the interactive terminal */
export interface TerminalLine {
  id: string
  type: 'stdout' | 'stderr' | 'stdin' | 'system'
  text: string
}
