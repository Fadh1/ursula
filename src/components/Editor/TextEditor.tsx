import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Highlighter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SelectionTooltip from './SelectionTooltip'
import InEditorDiff from './InEditorDiff'
import { DiffContext, AIModel, TextContext } from '@/types/ai-models'
import { nanoContextService } from '@/services/nano-context-service'
import { aiService } from '@/services/ai-service'
import { useNanoContext } from '@/hooks/use-nano-context'

interface Highlight {
  id: string
  text: string
  color: string
  position: { from: number; to: number }
  timestamp: Date
}

interface TextEditorProps {
  onHighlightCreate: (highlight: Highlight) => void
  activeHighlight?: string | null
  onOpenSidebar: () => void
  diffData?: { original: string; suggested: string; context: DiffContext } | null
  onDiffAccept?: () => void
  onDiffReject?: () => void
  onDiffUndo?: () => void
}

const TextEditor = ({ 
  onHighlightCreate, 
  activeHighlight, 
  onOpenSidebar, 
  diffData, 
  onDiffAccept, 
  onDiffReject, 
  onDiffUndo 
}: TextEditorProps) => {
  const [highlightColor, setHighlightColor] = useState('yellow')
  const [showTooltip, setShowTooltip] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [diffSelection, setDiffSelection] = useState<{ from: number; to: number } | null>(null)
  
  // Nano context state
  const [previousContent, setPreviousContent] = useState<string>('')
  const [currentContext, setCurrentContext] = useState<TextContext | null>(null)
  const [contextUpdateTimer, setContextUpdateTimer] = useState<NodeJS.Timeout | null>(null)
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [defaultModel, setDefaultModel] = useState<AIModel | null>(null)
  
  const { addContext, getStorageStats } = useNanoContext()

  // localStorage key for saving editor content
  const STORAGE_KEY = 'text-editor-content'
  
  // Debounce delay for context updates (in milliseconds)
  const CONTEXT_UPDATE_DELAY = 2000

  // Load content from localStorage
  const loadSavedContent = () => {
    try {
      const savedContent = localStorage.getItem(STORAGE_KEY)
      if (savedContent) {
        return JSON.parse(savedContent)
      }
    } catch (error) {
      console.error('Error loading saved content:', error)
    }
    
    // Default content if nothing saved
    return {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to Your AI-Powered Text Editor' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is a powerful text editor built with TipTap. You can format your text, create highlights, and discuss them with AI.' }]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Getting Started' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Try selecting some text and highlighting it! When you highlight text, a side panel will open where you can chat with AI about the selected content.' }]
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Features' }]
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich text formatting' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Multiple highlight colors' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AI-powered discussions' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Clean, pastel design' }] }] }
          ]
        },
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Select any text and highlight it to start a conversation with AI about that specific content!' }] }]
        }
      ]
    }
  }

  // Save content to localStorage
  const saveContent = (content: object) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
    } catch (error) {
      console.error('Error saving content:', error)
    }
  }
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      TextStyle,
      Color,
    ],
    content: loadSavedContent(),
    onUpdate: ({ editor }) => {
      // Auto-save content to localStorage whenever it changes
      const json = editor.getJSON()
      saveContent(json)
      
      // Handle nano context updates
      const textContent = editor.getText()
      handleContextUpdate(textContent)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none focus:border-none focus:ring-0 focus:shadow-none',
        style: 'outline: none !important; border: none !important;'
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const hasContent = from !== to
      
      // Normal selection handling
      setHasSelection(hasContent)
      setShowTooltip(hasContent && !isRefining) // Don't show tooltip if already refining
      
      // Store selection for diff if we have diff data
      if (diffData && hasContent) {
        setDiffSelection({ from, to })
      }
    },
  })

  const exitRefineMode = useCallback(() => {
    // Don't remove the highlight when exiting refine mode
    // Just clear the selection
    if (isRefining && editor) {
      editor.chain()
        .focus()
        .setTextSelection(editor.state.selection.to) // Clear selection
        .run()
    }
    
    setIsRefining(false)
  }, [isRefining, editor])

  const handleClickOutside = useCallback((event: MouseEvent) => {
    // Don't dismiss if clicking on the tooltip itself
    const tooltipElement = document.querySelector('[data-selection-tooltip]')
    if (tooltipElement?.contains(event.target as Node)) {
      return
    }
    
    // Don't dismiss if clicking on the sidebar
    const sidebarElement = event.target as HTMLElement
    if (sidebarElement.closest('[class*="fixed right-0"]') || 
        sidebarElement.closest('[data-sidebar]') ||
        sidebarElement.closest('[data-radix-popper-content-wrapper]')) {
      return
    }
    
    // If clicking on main page while refining, exit refine mode
    if (isRefining) {
      exitRefineMode()
      return
    }
    
    // Don't dismiss if there's still an active selection and we have an editor
    if (hasSelection && editor?.state.selection.from !== editor?.state.selection.to) {
      return
    }
    
    setShowTooltip(false)
  }, [hasSelection, editor, isRefining, exitRefineMode])

  useEffect(() => {
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [handleClickOutside])

  // Load available AI models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await aiService.getAvailableModels()
        setAvailableModels(models)
        const defaultModel = models.find(m => m.isDefault) || models[0]
        setDefaultModel(defaultModel)
        
        // If we have an editor with content, try to get initial context
        if (editor && defaultModel) {
          const textContent = editor.getText()
          if (textContent.trim().length > 50) {
            // Try to get existing context from storage first
            const { createTextHash } = await import('@/lib/jaccard-similarity')
            const textHash = createTextHash(textContent)
            const existingContext = nanoContextService.getContextForText(textHash)
            
            if (existingContext) {
              setCurrentContext(existingContext)
              console.log('Loaded existing context for current text')
            }
          }
        }
      } catch (error) {
        console.error('Failed to load AI models:', error)
      }
    }
    
    loadModels()
  }, [editor])

  // Handle context updates with debouncing
  const handleContextUpdate = useCallback(async (newContent: string) => {
    if (!defaultModel || !newContent.trim()) {
      return
    }
    
    // Clear existing timer
    if (contextUpdateTimer) {
      clearTimeout(contextUpdateTimer)
    }
    
    // Set new timer for debounced update
    const timer = setTimeout(async () => {
      try {
        // Check if content has changed significantly
        await nanoContextService.checkAndUpdateContext(
          newContent,
          previousContent,
          defaultModel,
          (context: TextContext) => {
            setCurrentContext(context)
            // Store in localStorage for persistence
            addContext(context)
            console.log('Context updated:', context.description.substring(0, 50) + '...')
          }
        )
        
        // Update previous content for next comparison
        setPreviousContent(newContent)
        
      } catch (error) {
        console.error('Context update failed:', error)
      }
    }, CONTEXT_UPDATE_DELAY)
    
    setContextUpdateTimer(timer)
  }, [defaultModel, previousContent, contextUpdateTimer, addContext])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (contextUpdateTimer) {
        clearTimeout(contextUpdateTimer)
      }
    }
  }, [contextUpdateTimer])


  const handleRefine = () => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    
    if (selectedText.trim()) {
      // Apply visual highlight to the selected text
      const highlightId = `refine-${Date.now()}`
      
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .setHighlight({ color: 'rgba(59, 130, 246, 0.3)' }) // Blue highlight for refine
        .run()
      
      // Enter refine mode
      setIsRefining(true)
      
      // Create highlight object for the selected text
      const highlight: Highlight = {
        id: highlightId,
        text: selectedText,
        color: 'blue',
        position: { from, to },
        timestamp: new Date()
      }

      // Create the highlight and open sidebar
      onHighlightCreate(highlight)
    }
    
    setShowTooltip(false)
  }

  const addHighlight = useCallback(() => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    
    if (selectedText.trim()) {
      // Apply highlight to selected text
      editor.chain()
        .focus()
        .setHighlight({ color: highlightColor })
        .run()

      // Create highlight object
      const highlight: Highlight = {
        id: `highlight-${Date.now()}`,
        text: selectedText,
        color: highlightColor,
        position: { from, to },
        timestamp: new Date()
      }

      onHighlightCreate(highlight)
    }
  }, [editor, highlightColor, onHighlightCreate])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    title 
  }: { 
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      title={title}
      className={cn(
        "h-9 w-9 p-0 transition-all duration-200 hover:scale-105 rounded-lg",
        isActive && "bg-primary text-primary-foreground shadow-sm",
        !isActive && "hover:bg-black/5"
      )}
    >
      {children}
    </Button>
  )

  const HighlightColorButton = ({ color, isActive }: { color: string; isActive: boolean }) => {
    const colorClasses = {
      yellow: 'bg-highlight-yellow border-yellow-400',
      blue: 'bg-highlight-blue border-blue-400',
      green: 'bg-highlight-green border-green-400',
      pink: 'bg-highlight-pink border-pink-400',
    }

    return (
      <button
        onClick={() => setHighlightColor(color)}
        className={cn(
          "w-7 h-7 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm",
          colorClasses[color as keyof typeof colorClasses],
          isActive && "ring-2 ring-primary ring-offset-2 scale-110"
        )}
        title={`Highlight with ${color}`}
      />
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      {/* Toolbar */}
      <Card className="p-3 mb-6 bg-white/60 backdrop-blur-md border-0 shadow-sm rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 pr-3 border-r border-border/30">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 pr-3 border-r border-border/30">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={16} />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 pr-3 border-r border-border/30">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote size={16} />
            </ToolbarButton>
          </div>

          {/* Highlighting */}
          <div className="flex items-center gap-2 pr-3 border-r border-border/30">
            <div className="flex items-center gap-1">
              <HighlightColorButton color="yellow" isActive={highlightColor === 'yellow'} />
              <HighlightColorButton color="blue" isActive={highlightColor === 'blue'} />
              <HighlightColorButton color="green" isActive={highlightColor === 'green'} />
              <HighlightColorButton color="pink" isActive={highlightColor === 'pink'} />
            </div>
            <ToolbarButton
              onClick={addHighlight}
              title="Highlight Selected Text"
            >
              <Highlighter size={16} />
            </ToolbarButton>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              title="Undo"
            >
              <Undo size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              title="Redo"
            >
              <Redo size={16} />
            </ToolbarButton>
          </div>
        </div>
      </Card>

      {/* Editor */}
      <div className="bg-transparent relative">
        <EditorContent 
          editor={editor} 
          className="min-h-[500px] prose prose-lg max-w-none focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:border-none [&_.ProseMirror]:p-6 [&_.ProseMirror]:bg-transparent [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:focus:border-none [&_.ProseMirror]:focus:ring-0 [&_.ProseMirror]:focus:shadow-none"
        />
        
        {/* In-Editor Diff Overlay */}
        {diffData && onDiffAccept && onDiffReject && diffSelection && (
          <InEditorDiff
            originalText={diffData.original}
            suggestedText={diffData.suggested}
            onAccept={() => {
              if (editor && diffSelection) {
                // Replace the selected text with the suggested text
                editor.chain()
                  .focus()
                  .setTextSelection(diffSelection)
                  .deleteSelection()
                  .insertContent(diffData.suggested)
                  .run()
              }
              onDiffAccept()
            }}
            onReject={onDiffReject}
            onUndo={onDiffUndo}
            context={diffData.context}
            position={(() => {
              if (!editor || !diffSelection) return undefined
              try {
                const coords = editor.view.coordsAtPos(diffSelection.from)
                const endCoords = editor.view.coordsAtPos(diffSelection.to)
                if (coords && endCoords) {
                  return {
                    top: coords.bottom + 10,
                    left: coords.left + (endCoords.left - coords.left) / 2
                  }
                }
              } catch (e) {
                console.error('Error getting diff position:', e)
              }
              return undefined
            })()}
          />
        )}
      </div>

      {/* Selection Tooltip */}
      <SelectionTooltip
        visible={showTooltip && hasSelection}
        onRefine={handleRefine}
      />
    </div>
  )
}

export default TextEditor