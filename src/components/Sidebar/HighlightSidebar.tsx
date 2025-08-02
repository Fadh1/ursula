import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  X, 
  Sparkles, 
  Hash,
  History,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import InEditorDiff from '../Editor/InEditorDiff'
import ActionPanel from './ActionPanel'
import { ModelSelector } from './ModelSelector'
import ContextViewer from './ContextViewer'
import { AIModel, AIHistoryEntry, ActionType, ActionOptions, SmartSuggestion, DiffContext, TextContext } from '@/types/ai-models'
import { aiService } from '@/services/ai-service'
import { smartSuggestionsService } from '@/services/smart-suggestions'
import { useAIHistory } from '@/hooks/use-ai-history'
import { useToast } from '@/hooks/use-toast'
import { nanoContextService } from '@/services/nano-context-service'
import { createTextHash } from '@/lib/jaccard-similarity'
import { useNanoContext } from '@/hooks/use-nano-context'
import { 
  generateContextAwareActionPrompt, 
  enhanceCustomPrompt,
  isContextSuitableForPrompts 
} from '@/lib/enhanced-prompt-builder'

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
  onTextUpdate: (highlightId: string, newText: string, context?: DiffContext) => void
  onDiffRequest?: (diffData: { original: string; suggested: string; context: DiffContext }) => void
}

const HighlightSidebar = ({ 
  isOpen, 
  onClose, 
  currentHighlight, 
  highlights,
  onSelectHighlight,
  onTextUpdate,
  onDiffRequest
}: HighlightSidebarProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'actions' | 'diff'>('actions')
  const [suggestedText, setSuggestedText] = useState('')
  const [currentContext, setCurrentContext] = useState<DiffContext | null>(null)
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [smartSuggestion, setSmartSuggestion] = useState<SmartSuggestion | null>(null)
  const [undoStack, setUndoStack] = useState<{ text: string; context: DiffContext }[]>([])
  const [textContext, setTextContext] = useState<TextContext | null>(null)
  
  const { history, addEntry } = useAIHistory()
  const { toast } = useToast()
  const { updateContext } = useNanoContext()

  useEffect(() => {
    const loadModels = async () => {
      const models = await aiService.getAvailableModels()
      setAvailableModels(models)
      const defaultModel = models.find(m => m.isDefault) || models[0]
      setSelectedModel(defaultModel)
    }
    loadModels()
  }, [])

  // Generate smart suggestions when highlight changes
  useEffect(() => {
    if (currentHighlight && selectedModel) {
      setSmartSuggestion({ recommendation: { suggested: 'expand', confidence: 0, reason: '', alternatives: [] }, processing: true })
      
      smartSuggestionsService.analyzeText(currentHighlight.text, selectedModel)
        .then(recommendation => {
          setSmartSuggestion({
            recommendation,
            processing: false
          })
        })
        .catch(() => {
          setSmartSuggestion(null)
        })
    } else {
      setSmartSuggestion(null)
    }
  }, [currentHighlight, selectedModel])

  // Helper function to get full document text from localStorage
  const getFullDocumentText = (): string => {
    try {
      const savedContent = localStorage.getItem('text-editor-content')
      if (savedContent) {
        const content = JSON.parse(savedContent)
        
        // For TipTap JSON format, we need to convert to text
        if (content.type === 'doc' && content.content) {
          // Simple text extraction from TipTap JSON (matches TipTap's getText() behavior)
          const extractText = (node: any): string => {
            let text = ''
            if (node.type === 'text') {
              text += node.text
            } else if (node.content) {
              for (const child of node.content) {
                text += extractText(child)
              }
            }
            // Add line breaks after block elements (similar to TipTap's getText())
            if (node.type === 'paragraph' || 
                node.type === 'heading' || 
                node.type === 'listItem' ||
                node.type === 'blockquote') {
              text += '\n'
            }
            return text
          }
          
          const fullText = extractText(content).trim()
          return fullText
        }
        
        // Handle both old and new storage formats
        const fallbackText = content.content || content.text || ''
        return fallbackText
      }
    } catch (error) {
      console.warn('HighlightSidebar: Could not load full document text for context generation:', error)
    }
    return ''
  }

  // Load existing text context for the current document
  // NOTE: Context should already be generated by TextEditor when content changes
  // This effect only retrieves existing context, it doesn't generate new context
  useEffect(() => {
    // Only load context when sidebar is open
    if (isOpen) {
      // Get the full document text to find existing context
      const fullText = getFullDocumentText()
      
      if (fullText && fullText.length > 50) {
        // Look for existing context for the full document text
        const textHash = createTextHash(fullText)
        const existingContext = nanoContextService.getContextForText(textHash)
        
        if (existingContext && isContextSuitableForPrompts(existingContext)) {
          setTextContext(existingContext)
        } else {
          setTextContext(null)
        }
      } else {
        setTextContext(null)
      }
    } else {
      setTextContext(null)
    }
  }, [isOpen])

  // Handle context updates from the context viewer
  const handleContextUpdate = (updatedContext: Partial<TextContext>) => {
    if (!textContext || !currentHighlight) return

    const fullUpdatedContext: TextContext = {
      ...textContext,
      ...updatedContext,
      lastUsed: new Date() // Update usage timestamp
    }

    // Update local state
    setTextContext(fullUpdatedContext)

    // Update in storage
    updateContext(textContext.textHash, updatedContext)

    toast({
      title: 'Context Updated',
      description: 'Text context has been saved successfully',
    })
  }

  const handleActionSelect = async (action: ActionType, options?: ActionOptions) => {
    if (!currentHighlight || !selectedModel) return
    
    setIsLoading(true)
    
    const prompt = generatePrompt(action, options)
    
    try {
      const response = await aiService.sendToAI(
        currentHighlight.text,
        prompt,
        selectedModel
      )
      
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }
      
      // Show fallback notification if a different model was used
      if (response.fallbackUsed && response.actualModel) {
        toast({
          title: 'Model Switched',
          description: `Used ${response.actualModel.name} instead of ${selectedModel.name}`,
        })
      }
      
      const context: DiffContext = {
        action,
        options: options || {},
        timestamp: new Date(),
        model: selectedModel,
        canUndo: undoStack.length > 0
      }
      
      const historyEntry: AIHistoryEntry = {
        id: crypto.randomUUID(),
        highlightId: currentHighlight.id,
        text: currentHighlight.text,
        prompt,
        model: selectedModel,
        timestamp: new Date(),
        response,
        applied: false,
      }
      
      addEntry(historyEntry)
      setSuggestedText(response.suggestedText)
      setCurrentContext(context)
      
      // Use in-editor diff if callback provided, otherwise fallback to sidebar
      if (onDiffRequest) {
        onDiffRequest({
          original: currentHighlight.text,
          suggested: response.suggestedText,
          context
        })
      } else {
        setMode('diff')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process AI request',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generatePrompt = (action: ActionType, options?: ActionOptions): string => {
    // Handle custom prompts with context enhancement
    if (action === 'reword' && options?.customPrompt) {
      return enhanceCustomPrompt(options.customPrompt, textContext)
    }
    
    // Generate context-aware action prompts
    const enhancedPrompt = generateContextAwareActionPrompt(action, options, textContext)
    
    // If no context enhancement was applied, fall back to original logic
    if (!textContext || !isContextSuitableForPrompts(textContext)) {
      return enhancedPrompt
    }
    
    // Log context usage for debugging
    console.log(`Using context for ${action} action:`, textContext.description.substring(0, 50) + '...')
    
    return enhancedPrompt
  }

  const handleAcceptChanges = () => {
    if (currentHighlight && suggestedText && currentContext) {
      // Add current state to undo stack
      setUndoStack(prev => [...prev, { text: currentHighlight.text, context: currentContext }])
      
      onTextUpdate(currentHighlight.id, suggestedText, currentContext)
      setMode('actions')
      setSuggestedText('')
      setCurrentContext(null)
    }
  }

  const handleRejectChanges = () => {
    setMode('actions')
    setSuggestedText('')
    setCurrentContext(null)
  }
  
  const handleUndo = () => {
    if (undoStack.length > 0 && currentHighlight) {
      const lastState = undoStack[undoStack.length - 1]
      setUndoStack(prev => prev.slice(0, -1))
      onTextUpdate(currentHighlight.id, lastState.text, lastState.context)
      
      toast({
        title: 'Change Undone',
        description: 'Previous text state has been restored',
      })
    }
  }

  const resetToActions = () => {
    setMode('actions')
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
    <div 
      data-sidebar
      className="h-full bg-sidebar-bg border-l border-sidebar-border"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border bg-gradient-to-r from-sidebar-bg to-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              <h3 className="font-semibold text-foreground">Refine</h3>
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
        </div>

        {/* Current Highlight */}
        {currentHighlight && (
          <div className="p-4 border-b border-sidebar-border bg-card/30">
            <div className="flex items-start gap-2 mb-2">
              <Hash className="text-muted-foreground mt-1 flex-shrink-0" size={14} />
              <div className="text-sm text-muted-foreground">Selected text</div>
            </div>
            <div className="text-sm bg-muted/50 p-3 rounded-lg border whitespace-pre-wrap">
              {currentHighlight.text}
            </div>
            
            {/* Context Viewer */}
            <div className="mt-2">
              <ContextViewer 
                context={textContext && isContextSuitableForPrompts(textContext) ? textContext : null}
                onContextUpdate={handleContextUpdate}
              />
            </div>
          </div>
        )}

        {/* AI Model Selection */}
        <div className="p-4 border-b border-sidebar-border bg-background/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Model</span>
            <ModelSelector
              onModelSelect={setSelectedModel}
              currentModel={selectedModel}
              availableModels={availableModels}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History size={14} />
                History
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {history.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
            {currentHighlight && (
              <div className="space-y-4">
                {/* Mode: Actions */}
                {mode === 'actions' && (
                  <ActionPanel
                    onActionSelect={handleActionSelect}
                    isLoading={isLoading}
                    smartSuggestion={smartSuggestion || undefined}
                    hasModel={!!selectedModel}
                  />
                )}

                {/* Mode: Diff View (Fallback for sidebar display) */}
                {mode === 'diff' && suggestedText && currentContext && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Review Changes</h4>
                      <Button
                        onClick={resetToActions}
                        variant="outline"
                        size="sm"
                      >
                        Back to Actions
                      </Button>
                    </div>
                    
                    <InEditorDiff
                      originalText={currentHighlight.text}
                      suggestedText={suggestedText}
                      onAccept={handleAcceptChanges}
                      onReject={handleRejectChanges}
                      onUndo={currentContext.canUndo ? handleUndo : undefined}
                      context={currentContext}
                    />
                  </div>
                )}

                {/* Undo Button */}
                {undoStack.length > 0 && mode === 'actions' && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      onClick={handleUndo}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-muted-foreground"
                    >
                      <History size={14} />
                      Undo Last Change
                    </Button>
                  </div>
                )}
              </div>
            )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-sm text-muted-foreground">No AI requests yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <Card 
                        key={entry.id} 
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          if (currentHighlight?.id === entry.highlightId) {
                            // Reapply this historical entry
                            handleActionSelect('reword', { customPrompt: entry.prompt })
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {entry.model.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(entry.timestamp)}
                              </span>
                              {entry.applied && (
                                <Badge variant="secondary" className="text-xs">
                                  Applied
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">Prompt:</p>
                            <p className="text-sm line-clamp-2">{entry.prompt}</p>
                            {entry.response.error && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {entry.response.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default HighlightSidebar