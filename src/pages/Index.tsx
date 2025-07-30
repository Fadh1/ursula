import { useState } from 'react'
import TextEditor from '@/components/Editor/TextEditor'
import HighlightSidebar from '@/components/Sidebar/HighlightSidebar'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DiffContext } from '@/types/ai-models'

interface Highlight {
  id: string
  text: string
  color: string
  position: { from: number; to: number }
  timestamp: Date
}

const Index = () => {
  // Load highlights from localStorage
  const loadSavedHighlights = (): Highlight[] => {
    try {
      const saved = localStorage.getItem('text-editor-highlights')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert timestamp strings back to Date objects
        return parsed.map((h: Highlight & { timestamp: string }) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        }))
      }
    } catch (error) {
      console.error('Error loading highlights:', error)
    }
    return []
  }

  // Save highlights to localStorage
  const saveHighlights = (highlights: Highlight[]) => {
    try {
      localStorage.setItem('text-editor-highlights', JSON.stringify(highlights))
    } catch (error) {
      console.error('Error saving highlights:', error)
    }
  }

  const [highlights, setHighlights] = useState<Highlight[]>(loadSavedHighlights)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentHighlight, setCurrentHighlight] = useState<Highlight | null>(null)
  const [diffData, setDiffData] = useState<{ original: string; suggested: string; context: DiffContext } | null>(null)

  const handleHighlightCreate = (highlight: Highlight) => {
    const newHighlights = [...highlights, highlight]
    setHighlights(newHighlights)
    saveHighlights(newHighlights)
    setCurrentHighlight(highlight)
    setSidebarOpen(true)
  }

  const handleSelectHighlight = (highlight: Highlight) => {
    setCurrentHighlight(highlight)
  }

  const handleOpenSidebar = () => {
    setSidebarOpen(true)
  }

  const handleTextUpdate = (highlightId: string, newText: string, context?: DiffContext) => {
    const updatedHighlights = highlights.map(h => 
      h.id === highlightId ? { ...h, text: newText } : h
    )
    setHighlights(updatedHighlights)
    saveHighlights(updatedHighlights)
  }
  
  const handleDiffRequest = (data: { original: string; suggested: string; context: DiffContext }) => {
    setDiffData(data)
  }
  
  const handleDiffAccept = () => {
    if (diffData && currentHighlight) {
      handleTextUpdate(currentHighlight.id, diffData.suggested, diffData.context)
    }
    setDiffData(null)
  }
  
  const handleDiffReject = () => {
    setDiffData(null)
  }
  
  const handleDiffUndo = () => {
    // This will be handled by the sidebar's undo functionality
    setDiffData(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex">
      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-[60%]" : "w-full"
      )}>
        {/* Floating Open Chat Button */}
        <div className="fixed top-6 right-6 z-50">
          <Button
            variant={sidebarOpen ? "default" : "outline"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="gap-2 shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background/90 border-border/50"
          >
            <MessageCircle size={16} />
            {sidebarOpen ? 'Close Chat' : 'Open Chat'}
          </Button>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12 h-screen overflow-y-auto">
          <div className="flex justify-center">
            <TextEditor 
              onHighlightCreate={handleHighlightCreate}
              activeHighlight={currentHighlight?.id}
              onOpenSidebar={handleOpenSidebar}
              diffData={diffData}
              onDiffAccept={handleDiffAccept}
              onDiffReject={handleDiffReject}
              onDiffUndo={handleDiffUndo}
            />
          </div>
        </main>
      </div>

      {/* Sidebar - 40% width when open */}
      {sidebarOpen && (
        <div className="w-[40%] h-screen overflow-hidden">
          <HighlightSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentHighlight={currentHighlight}
            highlights={highlights}
            onSelectHighlight={handleSelectHighlight}
            onTextUpdate={handleTextUpdate}
            onDiffRequest={handleDiffRequest}
          />
        </div>
      )}
    </div>
  );
};

export default Index;
