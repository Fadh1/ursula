import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, GitBranch, Undo2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DiffContext } from '@/types/ai-models'
import { useEffect } from 'react'

interface InlineDiffProps {
  originalText: string
  suggestedText: string
  onAccept: () => void
  onReject: () => void
  onUndo?: () => void
  context: DiffContext
  className?: string
}

const InlineDiff = ({
  originalText,
  suggestedText,
  onAccept,
  onReject,
  onUndo,
  context,
  className
}: InlineDiffProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault()
          onAccept()
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onReject()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onAccept, onReject])

  const getActionLabel = () => {
    switch (context.action) {
      case 'verify':
        return 'Verification'
      case 'expand':
        return 'Expansion'
      case 'reword':
        if (context.options.rewordType === 'tone') {
          return `Tone: ${context.options.tone}`
        }
        if (context.options.rewordType === 'audience') {
          return `Audience: ${context.options.audience}`
        }
        if (context.options.customPrompt) {
          return 'Custom'
        }
        return context.options.rewordType ? 
          context.options.rewordType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
          'Reword'
      default:
        return 'AI Suggestion'
    }
  }

  return (
    <div 
      className={cn(
        "relative my-2 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pl-4 pr-3 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Suggested Changes
            </span>
            <Badge 
              variant="outline" 
              className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300"
            >
              {getActionLabel()}
            </Badge>
            <Badge 
              variant="secondary" 
              className="text-xs"
            >
              {context.model.name}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {context.canUndo && onUndo && (
              <Button
                onClick={onUndo}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <Undo2 size={12} />
                Undo
              </Button>
            )}
            <Button
              onClick={onReject}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
            >
              <X size={12} />
              Reject
            </Button>
            <Button
              onClick={onAccept}
              size="sm"
              className="h-7 px-2 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check size={12} />
              Accept
            </Button>
          </div>
        </div>

        {/* Diff Content */}
        <div className="space-y-2 text-sm">
          {/* Original Text */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-red-500 font-bold">−</span>
              <ChevronRight size={12} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="bg-red-100/60 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                <span className="line-through opacity-75">{originalText}</span>
              </div>
            </div>
          </div>

          {/* Suggested Text */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-green-500 font-bold">+</span>
              <ChevronRight size={12} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="bg-green-100/60 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                {suggestedText}
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Ctrl+Enter</kbd>
            <span>Accept</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Esc</kbd>
            <span>Reject</span>
          </div>
        </div>

        {/* Custom prompt info */}
        {context.options.customPrompt && (
          <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
            <div className="text-xs text-muted-foreground">
              <strong>Request:</strong> {context.options.customPrompt}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InlineDiff