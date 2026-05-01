import { useRef, useEffect, useState, ReactNode } from 'react'

interface Props {
  top: ReactNode
  bottom: ReactNode
  defaultTopPercent?: number
  minTopPercent?: number
  maxTopPercent?: number
}

export default function VerticalSplitter({
  top,
  bottom,
  defaultTopPercent = 30,
  minTopPercent = 15,
  maxTopPercent = 60,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [topH, setTopH] = useState(defaultTopPercent)
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientY - rect.top) / rect.height) * 100
      setTopH(Math.min(maxTopPercent, Math.max(minTopPercent, pct)))
    }
    const onMouseUp = () => {
      dragging.current = false
      setIsDragging(false)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [minTopPercent, maxTopPercent])

  const onMouseDown = () => {
    dragging.current = true
    setIsDragging(true)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'
  }

  return (
    <div ref={containerRef} className="flex flex-col flex-1 overflow-hidden">
      <div style={{ height: `${topH}%`, minHeight: 0 }} className="overflow-hidden">
        {top}
      </div>
      <div
        className={`resizer resizer-vertical ${isDragging ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
        role="separator"
        aria-label="Resize input/output"
      />
      <div style={{ height: `${100 - topH}%`, minHeight: 0 }} className="overflow-hidden">
        {bottom}
      </div>
    </div>
  )
}
