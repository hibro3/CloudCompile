import { useEffect, useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { useStore } from '../store/useStore'
import { LANGUAGE_MAP } from '../constants'
import type * as monaco from 'monaco-editor'

export default function Editor() {
  const { languageKey, code, setCode, settings, setCursorPosition } = useStore()
  const lang = LANGUAGE_MAP[languageKey]
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    editor.onDidChangeCursorPosition(e => {
      setCursorPosition(e.position.lineNumber, e.position.column)
    })
    editor.focus()
  }

  // Re-focus editor when language changes
  useEffect(() => {
    editorRef.current?.focus()
  }, [languageKey])

  return (
    <div className="flex-1 overflow-hidden" style={{ background: 'var(--bg-editor)' }}>
      <MonacoEditor
        height="100%"
        width="100%"
        language={lang.monacoLanguage}
        value={code}
        theme={settings.theme}
        onChange={v => setCode(v ?? '')}
        onMount={handleEditorDidMount}
        options={{
          fontSize: settings.fontSize,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontLigatures: true,
          minimap: { enabled: settings.minimap },
          lineNumbers: settings.lineNumbers ? 'on' : 'off',
          wordWrap: settings.wordWrap ? 'on' : 'off',
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          tabSize: 2,
          detectIndentation: true,
          folding: true,
          glyphMargin: false,
          lineDecorationsWidth: 8,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  )
}
