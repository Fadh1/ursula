import { useState } from 'react'
import TextEditor from '@/components/TextEditor'
import HighlightSidebar from '@/components/HighlightSidebar'
import { Button } from '@/components/ui/button'
import { Sparkles, FileText, MessageCircle } from 'lucide-react'

interface Highlight {
  id: string
  text: string
  color: string
  position: { from: number; to: number }
  timestamp: Date
}

const Index = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentHighlight, setCurrentHighlight] = useState<Highlight | null>(null)

  const handleHighlightCreate = (highlight: Highlight) => {
    setHighlights(prev => [...prev, highlight])
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
    setHighlights(prev => 
      prev.map(h => h.id === highlightId ? { ...h, text: newText } : h)
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="text-primary" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">AI Text Editor</h1>
                  <p className="text-sm text-muted-foreground">Highlight text and discuss with AI</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {highlights.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles size={16} />
                  <span>{highlights.length} highlight{highlights.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              
              <Button
                variant={sidebarOpen ? "default" : "outline"}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="gap-2"
              >
                <MessageCircle size={16} />
                {sidebarOpen ? 'Close Chat' : 'Open Chat'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <TextEditor 
            onHighlightCreate={handleHighlightCreate}
            activeHighlight={currentHighlight?.id}
            onOpenSidebar={handleOpenSidebar}
          />
        </div>
        
        {/* Welcome Message */}
        {highlights.length === 0 && (
          <div className="max-w-2xl mx-auto mt-8 text-center">
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 shadow-sm">
              <Sparkles className="mx-auto mb-4 text-primary" size={32} />
              <h2 className="text-lg font-medium text-foreground mb-2">Get Started</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Select any text in the editor and use the highlight tool to create a highlight. 
                Once highlighted, you can discuss that specific content with AI in the sidebar chat.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar */}
      <HighlightSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentHighlight={currentHighlight}
        highlights={highlights}
        onSelectHighlight={handleSelectHighlight}
        onTextUpdate={handleTextUpdate}
      />
      
      {/* Overlay - only show backdrop blur for regular sidebar opening, not for refine mode */}  
      {sidebarOpen && !currentHighlight && (
        <div 
          className="fixed inset-0 bg-background/20 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Index;
