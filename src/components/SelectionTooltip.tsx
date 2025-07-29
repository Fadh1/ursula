import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectionTooltipProps {
  visible: boolean
  onRefine: () => void
}

const SelectionTooltip = ({ visible, onRefine }: SelectionTooltipProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        // Position tooltip above the selection
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        })
      }
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-50 transform -translate-x-1/2 -translate-y-full",
        "animate-fade-in"
      )}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <Button
        onClick={onRefine}
        size="sm"
        className="gap-1 bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg border border-primary/20"
      >
        <Sparkles size={14} />
        Refine
      </Button>
    </div>
  )
}

export default SelectionTooltip