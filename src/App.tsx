import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Editor from './components/Editor'
import OutputPanel from './components/OutputPanel'
import StatusBar from './components/StatusBar'
import HorizontalSplitter from './components/HorizontalSplitter'
import { useStore } from './store/useStore'

export default function App() {
  const { setCode } = useStore()

  // Handle shared URL on load — Python-only, so we just restore code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')

    if (codeParam) {
      try {
        const decoded = decodeURIComponent(escape(atob(codeParam)))
        setCode(decoded)
      } catch {
        // ignore malformed code param
      }
    }
  }, [setCode])

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', width: '100vw', background: 'var(--bg-surface)' }}
    >
      <Navbar />

      {/* Editor | Terminal split */}
      <HorizontalSplitter
        left={<Editor />}
        right={<OutputPanel />}
        defaultLeftPercent={65}
      />

      <StatusBar />
    </div>
  )
}
