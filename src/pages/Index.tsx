import { useState } from 'react'
import TextEditor from '@/components/TextEditor'
import HighlightSidebar from '@/components/HighlightSidebar'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        return parsed.map((h: any) => ({
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

  const handleTextUpdate = (highlightId: string, newText: string) => {
    const updatedHighlights = highlights.map(h => 
      h.id === highlightId ? { ...h, text: newText } : h
    )
    setHighlights(updatedHighlights)
    saveHighlights(updatedHighlights)
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
          />
        </div>
      )}
    </div>
  );
};

export default Index;
