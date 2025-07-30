import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, GitBranch, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DiffContext } from '@/types/ai-models'

interface InEditorDiffProps {
  originalText: string
  suggestedText: string
  onAccept: () => void
  onReject: () => void
  onUndo?: () => void
  context: DiffContext
  position?: { top: number; left: number }
  className?: string
}

const InEditorDiff = ({
  originalText,
  suggestedText,
  onAccept,
  onReject,
  onUndo,
  context,
  position,
  className
}: InEditorDiffProps) => {
  const diffRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Handle keyboard shortcuts
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

  // Simple diff visualization - splits by words for better readability
  const getWordDiff = () => {
    const originalWords = originalText.split(' ')
    const suggestedWords = suggestedText.split(' ')
    
    return {
      removed: originalWords,
      added: suggestedWords
    }
  }

  const { removed, added } = getWordDiff()

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

  const overlayStyle = position ? {
    position: 'absolute' as const,
    top: position.top,
    left: position.left,
    zIndex: 50,
    maxWidth: '600px',
    minWidth: '400px'
  } : {}

  return (
    <div
      ref={diffRef}
      className={cn(
        "bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg",
        className
      )}
      style={overlayStyle}
    >
      <Card className="border-0 shadow-none">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitBranch size={16} className="text-primary" />
              <h4 className="font-medium text-foreground">Suggested Changes</h4>
              <Badge variant="outline" className="text-xs">
                {getActionLabel()}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {context.model.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {context.canUndo && onUndo && (
                <Button
                  onClick={onUndo}
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Undo2 size={14} />
                  Undo
                </Button>
              )}
            </div>
          </div>

          {/* Diff Content */}
          <div className="space-y-3 mb-4">
            {/* Original Text (Removed) */}
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
                <span>−</span> Original
              </div>
              <div className="text-sm whitespace-pre-wrap break-words text-red-800">
                {originalText}
              </div>
            </div>

            {/* Suggested Text (Added) */}
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="text-xs text-green-600 font-medium mb-2 flex items-center gap-1">
                <span>+</span> Suggested
              </div>
              <div className="text-sm whitespace-pre-wrap break-words text-green-800">
                {suggestedText}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs">Ctrl+Enter</kbd>
              <span>Accept</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs ml-2">Esc</kbd>
              <span>Reject</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={onReject}
                variant="outline"
                size="sm"
                className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <X size={14} />
                Reject
              </Button>
              <Button
                onClick={onAccept}
                size="sm"
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check size={14} />
                Accept
              </Button>
            </div>
          </div>

          {/* Context Info */}
          {context.options.customPrompt && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <strong>Custom Request:</strong> {context.options.customPrompt}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default InEditorDiff