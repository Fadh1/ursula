import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  X, 
  Send, 
  MessageCircle, 
  Sparkles, 
  Clock,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

const HighlightSidebar = ({ 
  isOpen, 
  onClose, 
  currentHighlight, 
  highlights,
  onSelectHighlight 
}: HighlightSidebarProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentHighlight) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        content: `I can see you've highlighted: "${currentHighlight.text}". This is an interesting passage! Here are some thoughts about it:\n\n• The highlighted text appears to focus on key concepts\n• This could be expanded with additional context\n• Consider how this relates to the broader document theme\n\nWhat specific aspect would you like to explore further?`,
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
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

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && currentHighlight && (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="mx-auto mb-3 opacity-50" size={32} />
                <p className="text-sm">Start a conversation about this highlight!</p>
                <p className="text-xs mt-1">Ask questions, request analysis, or explore ideas.</p>
              </div>
            )}
            
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] p-3 rounded-lg text-sm",
                      message.sender === 'user'
                        ? "bg-primary text-primary-foreground ml-4"
                        : "bg-muted border mr-4"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className={cn(
                      "text-xs mt-1 opacity-70",
                      message.sender === 'user' ? "text-right" : "text-left"
                    )}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted border mr-4 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      AI is thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          {currentHighlight && (
            <div className="p-4 border-t border-sidebar-border bg-background/50">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask AI about this highlight..."
                  className="flex-1 bg-background"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          )}
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