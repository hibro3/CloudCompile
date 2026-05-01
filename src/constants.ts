import { Language, EditorSettings } from './types'

export const LANGUAGES: Language[] = [
  {
    key: 'python',
    label: 'Python',
    extension: '.py',
    monacoLanguage: 'python',
    mime: 'text/x-python',
    icon: '🐍',
    supportsStdin: true,
    template: `# Python 3 — Browser-Native (Pyodide)
# All standard libraries are fully supported ✅

print("Hello World")

`,
  },
]

export const LANGUAGE_MAP: Record<string, Language> = Object.fromEntries(
  LANGUAGES.map(l => [l.key, l])
)

export const EXTENSION_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGES.map(l => [l.extension, l.key])
)

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  theme: 'vs-dark',
  minimap: true,
  lineNumbers: true,
  wordWrap: false,
}
