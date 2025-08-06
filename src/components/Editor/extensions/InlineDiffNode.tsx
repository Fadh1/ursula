import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, GitBranch, Undo2, ChevronRight } from 'lucide-react'
import { DiffContext } from '@/types/ai-models'

export interface InlineDiffNodeAttributes {
  originalText: string
  suggestedText: string
  context: string // JSON stringified DiffContext
  diffId: string
}

// React component for the node view
const InlineDiffNodeView = ({ node, deleteNode }: { node: { attrs: InlineDiffNodeAttributes }, deleteNode: () => void }) => {
  const { originalText, suggestedText, context: contextStr, diffId } = node.attrs
  const context: DiffContext = JSON.parse(contextStr)

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

  const handleAccept = () => {
    // Emit custom event for parent component to handle
    const event = new CustomEvent('inline-diff-accept', { 
      detail: { diffId, suggestedText } 
    })
    document.dispatchEvent(event)
    deleteNode()
  }

  const handleReject = () => {
    // Emit custom event for parent component to handle
    const event = new CustomEvent('inline-diff-reject', { 
      detail: { diffId } 
    })
    document.dispatchEvent(event)
    deleteNode()
  }

  const handleUndo = () => {
    // Emit custom event for parent component to handle
    const event = new CustomEvent('inline-diff-undo', { 
      detail: { diffId } 
    })
    document.dispatchEvent(event)
    deleteNode()
  }

  // Keyboard event handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        handleAccept()
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      handleReject()
    }
  }

  return (
    <NodeViewWrapper 
      className="inline-diff-node my-4 not-prose"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg shadow-sm">
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
              {context.canUndo && (
                <Button
                  onClick={handleUndo}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Undo2 size={12} />
                  Undo
                </Button>
              )}
              <Button
                onClick={handleReject}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
              >
                <X size={12} />
                Reject
              </Button>
              <Button
                onClick={handleAccept}
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
    </NodeViewWrapper>
  )
}

// TipTap extension
export const InlineDiffNode = Node.create({
  name: 'inlineDiffNode',

  group: 'block',

  content: '',

  marks: '',

  atom: true,

  addAttributes() {
    return {
      originalText: {
        default: '',
      },
      suggestedText: {
        default: '',
      },
      context: {
        default: '{}',
      },
      diffId: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="inline-diff-node"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-diff-node' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineDiffNodeView)
  },

  addCommands() {
    return {
      insertInlineDiff: (attributes: InlineDiffNodeAttributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        })
      },
    }
  },

  // Extend the commands interface to include our custom command
  addStorage() {
    return {}
  },
})