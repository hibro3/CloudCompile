import { useRef, useEffect, useState, ReactNode } from 'react'

interface Props {
  left: ReactNode
  right: ReactNode
  defaultLeftPercent?: number
  minLeftPercent?: number
  maxLeftPercent?: number
}

export default function HorizontalSplitter({
  left,
  right,
  defaultLeftPercent = 65,
  minLeftPercent = 25,
  maxLeftPercent = 80,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftW, setLeftW] = useState(defaultLeftPercent)
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setLeftW(Math.min(maxLeftPercent, Math.max(minLeftPercent, pct)))
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
  }, [minLeftPercent, maxLeftPercent])

  const onMouseDown = () => {
    dragging.current = true
    setIsDragging(true)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      <div style={{ width: `${leftW}%`, minWidth: 0 }} className="overflow-hidden flex flex-col">
        {left}
      </div>
      <div
        className={`resizer ${isDragging ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
        role="separator"
        aria-label="Resize panels"
      />
      <div style={{ width: `${100 - leftW}%`, minWidth: 0 }} className="overflow-hidden flex flex-col">
        {right}
      </div>
    </div>
  )
}
