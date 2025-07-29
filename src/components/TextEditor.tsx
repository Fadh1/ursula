import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { useState, useCallback, useEffect } from 'react'
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
}

const TextEditor = ({ onHighlightCreate, activeHighlight, onOpenSidebar }: TextEditorProps) => {
  const [highlightColor, setHighlightColor] = useState('yellow')
  const [showTooltip, setShowTooltip] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refineSelection, setRefineSelection] = useState<{from: number, to: number} | null>(null)

  // localStorage key for saving editor content
  const STORAGE_KEY = 'text-editor-content'

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
  const saveContent = (content: any) => {
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
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const hasContent = from !== to
      
      // If we're in refine mode and the selection is lost, restore it
      if (isRefining && !hasContent && refineSelection) {
        setTimeout(() => {
          editor.chain().focus().setTextSelection(refineSelection).run()
        }, 10)
        return
      }
      
      // Normal selection handling
      setHasSelection(hasContent)
      setShowTooltip(hasContent && !isRefining) // Don't show tooltip if already refining
    },
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't dismiss if clicking on the tooltip itself
      const tooltipElement = document.querySelector('[data-selection-tooltip]')
      if (tooltipElement?.contains(event.target as Node)) {
        return
      }
      
      // Don't dismiss if clicking on the sidebar
      const sidebarElement = event.target as HTMLElement
      if (sidebarElement.closest('[class*="fixed right-0"]') || 
          sidebarElement.closest('[data-sidebar]')) {
        return
      }
      
      // If clicking on main page while refining, exit refine mode
      if (isRefining) {
        setIsRefining(false)
        setRefineSelection(null)
        // Clear the selection
        if (editor) {
          editor.chain().focus().setTextSelection(editor.state.selection.to).run()
        }
        return
      }
      
      // Don't dismiss if there's still an active selection and we have an editor
      if (hasSelection && editor?.state.selection.from !== editor?.state.selection.to) {
        return
      }
      
      setShowTooltip(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [hasSelection, editor, isRefining])

  const handleRefine = () => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    
    if (selectedText.trim()) {
      // Enter refine mode and store the selection
      setIsRefining(true)
      setRefineSelection({ from, to })
      
      // Create highlight object for the selected text
      const highlight: Highlight = {
        id: `refine-${Date.now()}`,
        text: selectedText,
        color: 'blue', // Default color for refine highlights
        position: { from, to },
        timestamp: new Date()
      }

      // Create the highlight and open sidebar
      onHighlightCreate(highlight)
      
      // Keep the editor focused and maintain the selection
      setTimeout(() => {
        editor.chain().focus().setTextSelection({ from, to }).run()
      }, 100)
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
        "h-8 w-8 p-0 transition-all duration-200 hover:scale-105",
        isActive && "bg-primary text-primary-foreground shadow-sm"
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
          "w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-110",
          colorClasses[color as keyof typeof colorClasses],
          isActive && "ring-2 ring-primary ring-offset-2"
        )}
        title={`Highlight with ${color}`}
      />
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      {/* Toolbar */}
      <Card className="p-3 mb-4 bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 pr-2 border-r border-border">
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
          <div className="flex items-center gap-1 pr-2 border-r border-border">
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
          <div className="flex items-center gap-1 pr-2 border-r border-border">
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
          <div className="flex items-center gap-2 pr-2 border-r border-border">
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
      <Card className="p-0 overflow-hidden bg-editor-bg border-editor-border shadow-lg">
        <EditorContent 
          editor={editor} 
          className="min-h-[500px]"
        />
      </Card>

      {/* Selection Tooltip */}
      <SelectionTooltip
        visible={showTooltip && hasSelection}
        onRefine={handleRefine}
      />
    </div>
  )
}

export default TextEditor