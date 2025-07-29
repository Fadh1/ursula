import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { 
  X, 
  Send, 
  MessageCircle, 
  Sparkles, 
  Clock,
  Hash,
  CheckCircle,
  Eye,
  PlusCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DiffView from './DiffView'

interface Highlight {
  id: string
  text: string
  color: string
  position: { from: number; to: number }
  timestamp: Date
}

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

interface HighlightSidebarProps {
  isOpen: boolean
  onClose: () => void
  currentHighlight: Highlight | null
  highlights: Highlight[]
  onSelectHighlight: (highlight: Highlight) => void
  onTextUpdate: (highlightId: string, newText: string) => void
}

const HighlightSidebar = ({ 
  isOpen, 
  onClose, 
  currentHighlight, 
  highlights,
  onSelectHighlight,
  onTextUpdate
}: HighlightSidebarProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'options' | 'freeform' | 'diff'>('options')
  const [suggestedText, setSuggestedText] = useState('')
  const [currentOperation, setCurrentOperation] = useState('')

  const handleOptionSelect = (option: 'verify' | 'expand') => {
    if (!currentHighlight) return
    
    setIsLoading(true)
    setCurrentOperation(option)
    
    // Simulate AI processing
    setTimeout(() => {
      let newText = ''
      if (option === 'verify') {
        newText = `${currentHighlight.text} [Verified: This information appears accurate based on current knowledge]`
      } else {
        newText = `${currentHighlight.text} Additionally, this concept relates to broader themes and can be further explored through multiple perspectives and applications.`
      }
      
      setSuggestedText(newText)
      setMode('diff')
      setIsLoading(false)
    }, 1500)
  }

  const handleFreeformSubmit = () => {
    if (!inputValue.trim() || !currentHighlight) return
    
    setIsLoading(true)
    setCurrentOperation('custom')
    
    // Simulate AI processing the custom request
    setTimeout(() => {
      const newText = `${currentHighlight.text} [Modified based on: "${inputValue}"]`
      setSuggestedText(newText)
      setMode('diff')
      setInputValue('')
      setIsLoading(false)
    }, 1500)
  }

  const handleAcceptChanges = () => {
    if (currentHighlight && suggestedText) {
      onTextUpdate(currentHighlight.id, suggestedText)
      setMode('options')
      setSuggestedText('')
      setCurrentOperation('')
    }
  }

  const handleRejectChanges = () => {
    setMode('options')
    setSuggestedText('')
    setCurrentOperation('')
  }

  const resetToOptions = () => {
    setMode('options')
    setInputValue('')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getColorBadgeClass = (color: string) => {
    const colorClasses = {
      yellow: 'bg-highlight-yellow text-yellow-800 border-yellow-300',
      blue: 'bg-highlight-blue text-blue-800 border-blue-300',
      green: 'bg-highlight-green text-green-800 border-green-300',
      pink: 'bg-highlight-pink text-pink-800 border-pink-300',
    }
    return colorClasses[color as keyof typeof colorClasses] || 'bg-muted'
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full w-96 bg-sidebar-bg border-l border-sidebar-border shadow-2xl z-50 transform transition-transform duration-300 ease-out",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border bg-gradient-to-r from-sidebar-bg to-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              <h3 className="font-semibold text-foreground">AI Highlights</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-sidebar-border"
            >
              <X size={16} />
            </Button>
          </div>
          {currentHighlight && (
            <div className="mt-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs", getColorBadgeClass(currentHighlight.color))}
              >
                {currentHighlight.color} highlight
              </Badge>
            </div>
          )}
        </div>

        {/* Current Highlight */}
        {currentHighlight && (
          <div className="p-4 border-b border-sidebar-border bg-card/30">
            <div className="flex items-start gap-2 mb-2">
              <Hash className="text-muted-foreground mt-1 flex-shrink-0" size={14} />
              <div className="text-sm text-muted-foreground">Selected Text:</div>
            </div>
            <div className="text-sm bg-muted/50 p-3 rounded-lg border">
              "{currentHighlight.text}"
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock size={12} />
              {formatTime(currentHighlight.timestamp)}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {currentHighlight && (
              <div className="space-y-4">
                {/* Mode: Options */}
                {mode === 'options' && (
                  <div className="space-y-4">
                    <div className="text-center text-muted-foreground py-4">
                      <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
                      <p className="text-sm font-medium mb-1">How would you like to refine this text?</p>
                      <p className="text-xs">Choose an option below or create a custom request.</p>
                    </div>

                    {/* Default Options */}
                    <div className="grid gap-3">
                      <Button
                        onClick={() => handleOptionSelect('verify')}
                        variant="outline"
                        className="flex items-center gap-3 p-4 h-auto text-left justify-start"
                        disabled={isLoading}
                      >
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CheckCircle size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">Verify</div>
                          <div className="text-xs text-muted-foreground">Check accuracy and add verification notes</div>
                        </div>
                      </Button>

                      <Button
                        onClick={() => handleOptionSelect('expand')}
                        variant="outline"
                        className="flex items-center gap-3 p-4 h-auto text-left justify-start"
                        disabled={isLoading}
                      >
                        <div className="p-2 bg-green-100 rounded-lg">
                          <PlusCircle size={20} className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">Expand</div>
                          <div className="text-xs text-muted-foreground">Add more detail and context</div>
                        </div>
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    {/* Custom Request */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Custom Request</h4>
                      <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Describe how you'd like to modify this text..."
                        className="min-h-[80px] bg-background"
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleFreeformSubmit}
                        disabled={!inputValue.trim() || isLoading}
                        className="w-full"
                      >
                        <Send size={16} className="mr-2" />
                        Generate Changes
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mode: Diff View */}
                {mode === 'diff' && suggestedText && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Review Changes</h4>
                      <Button
                        onClick={resetToOptions}
                        variant="outline"
                        size="sm"
                      >
                        Back to Options
                      </Button>
                    </div>
                    
                    <DiffView
                      originalText={currentHighlight.text}
                      suggestedText={suggestedText}
                      onAccept={handleAcceptChanges}
                      onReject={handleRejectChanges}
                      operation={currentOperation}
                    />
                  </div>
                )}

                {/* Loading State */}
                {isLoading && (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      Processing your request...
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* All Highlights */}
        {highlights.length > 0 && (
          <div className="border-t border-sidebar-border bg-background/30">
            <div className="p-3">
              <h4 className="text-sm font-medium text-foreground mb-2">All Highlights ({highlights.length})</h4>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {highlights.map((highlight) => (
                    <button
                      key={highlight.id}
                      onClick={() => onSelectHighlight(highlight)}
                      className={cn(
                        "w-full text-left p-2 rounded text-xs border transition-all duration-200 hover:bg-muted/50",
                        currentHighlight?.id === highlight.id 
                          ? "bg-primary/10 border-primary/30" 
                          : "bg-background border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          getColorBadgeClass(highlight.color)
                        )} />
                        <span className="text-muted-foreground">{formatTime(highlight.timestamp)}</span>
                      </div>
                      <div className="truncate text-foreground">
                        "{highlight.text}"
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HighlightSidebar