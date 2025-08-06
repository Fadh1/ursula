import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  PlusCircle, 
  Edit3, 
  Send, 
  Sparkles,
  AlertCircle,
  Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ActionType, ActionOptions, SmartSuggestion, TextContext } from '@/types/ai-models'
import { ContextViewer } from './ContextViewer'

interface ActionPanelProps {
  onActionSelect: (action: ActionType, options?: ActionOptions) => void
  isLoading: boolean
  smartSuggestion?: SmartSuggestion
  hasModel: boolean
  context?: TextContext | null
  onContextUpdate?: (updatedContext: Partial<TextContext>) => void
}

const ActionPanel = ({
  onActionSelect,
  isLoading,
  smartSuggestion,
  hasModel,
  context,
  onContextUpdate
}: ActionPanelProps) => {
  const [customPrompt, setCustomPrompt] = useState('')

  const handleActionClick = (action: ActionType) => {
    if (!hasModel || isLoading) return
    onActionSelect(action)
  }

  const handleCustomSubmit = () => {
    if (!customPrompt.trim() || !hasModel || isLoading) return
    onActionSelect('reword', { customPrompt: customPrompt.trim() })
    setCustomPrompt('')
  }

  const getActionButton = (
    action: ActionType,
    icon: React.ReactNode,
    title: string,
    description: string,
    bgColor: string,
    iconColor: string
  ) => {
    const isRecommended = smartSuggestion?.recommendation.suggested === action
    
    return (
      <Button
        onClick={() => handleActionClick(action)}
        variant="outline"
        className={cn(
          "flex items-center gap-3 p-4 h-auto text-left justify-start relative",
          isRecommended && "ring-2 ring-primary/50 border-primary/50",
          !hasModel && "opacity-50 cursor-not-allowed"
        )}
        disabled={isLoading || !hasModel}
      >
        {isRecommended && (
          <div className="absolute -top-1 -right-1">
            <Badge variant="default" className="text-xs bg-primary">
              <Lightbulb size={10} className="mr-1" />
              Suggested
            </Badge>
          </div>
        )}
        
        <div className={cn("p-2 rounded-lg", bgColor)}>
          <div className={iconColor}>
            {icon}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
          {isRecommended && smartSuggestion?.recommendation.reason && (
            <div className="text-xs text-primary mt-1 font-medium">
              {smartSuggestion.recommendation.reason}
            </div>
          )}
        </div>
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center text-muted-foreground py-4">
        <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
        <p className="text-sm font-medium mb-1">How would you like to refine this text?</p>
        <p className="text-xs">Choose an option below or create a custom request.</p>
        {smartSuggestion?.recommendation && (
          <div className="mt-2 text-xs text-primary flex items-center justify-center gap-1">
            <Lightbulb size={12} />
            AI suggests: {smartSuggestion.recommendation.suggested}
          </div>
        )}
      </div>

      {/* Primary Actions */}
      <div className="grid gap-3">
        {getActionButton(
          'verify',
          <CheckCircle size={20} />,
          'Verify',
          'Check accuracy and add verification notes',
          'bg-blue-100',
          'text-blue-600'
        )}

        {getActionButton(
          'expand',
          <PlusCircle size={20} />,
          'Expand',
          'Add more detail and context',
          'bg-green-100',  
          'text-green-600'
        )}

        {getActionButton(
          'reword',
          <Edit3 size={20} />,
          'Reword',
          'Modify style, tone, or structure',
          'bg-purple-100',
          'text-purple-600'
        )}
      </div>

      <Separator className="my-4" />

      {/* Custom Request */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Custom Request</h4>
        <Textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Describe how you'd like to modify this text..."
          className="min-h-[80px] bg-background"
          disabled={isLoading || !hasModel}
          maxLength={500}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{customPrompt.length}/500 characters</span>
          {!hasModel && (
            <span className="text-destructive flex items-center gap-1">
              <AlertCircle size={12} />
              No model selected
            </span>
          )}
        </div>
        <Button
          onClick={handleCustomSubmit}
          disabled={!customPrompt.trim() || isLoading || !hasModel}
          className="w-full"
        >
          <Send size={16} className="mr-2" />
          Generate Changes
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-4 bg-muted/30">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              Processing your request...
            </div>
          </div>
        </Card>
      )}

      {/* Context Viewer */}
      <ContextViewer 
        context={context} 
        onContextUpdate={onContextUpdate}
        className="mt-6"
      />
    </div>
  )
}

export default ActionPanel