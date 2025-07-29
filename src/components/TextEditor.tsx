import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { useState, useCallback } from 'react'
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
}

const TextEditor = ({ onHighlightCreate, activeHighlight }: TextEditorProps) => {
  const [highlightColor, setHighlightColor] = useState('yellow')
  
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
    content: `
      <h1>Welcome to Your AI-Powered Text Editor</h1>
      <p>This is a powerful text editor built with TipTap. You can format your text, create highlights, and discuss them with AI.</p>
      
      <h2>Getting Started</h2>
      <p>Try selecting some text and highlighting it! When you highlight text, a side panel will open where you can chat with AI about the selected content.</p>
      
      <h3>Features</h3>
      <ul>
        <li>Rich text formatting</li>
        <li>Multiple highlight colors</li>
        <li>AI-powered discussions</li>
        <li>Clean, pastel design</li>
      </ul>
      
      <blockquote>
        <p>Select any text and highlight it to start a conversation with AI about that specific content!</p>
      </blockquote>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none',
      },
    },
  })

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
    <div className="w-full max-w-4xl mx-auto">
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
    </div>
  )
}

export default TextEditor