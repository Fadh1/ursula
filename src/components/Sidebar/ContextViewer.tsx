import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Save, 
  X,
  Info,
  Clock,
  Target,
  Volume2,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TextContext } from '@/types/ai-models'

export interface ContextViewerProps {
  context: TextContext | null
  onContextUpdate?: (updatedContext: Partial<TextContext>) => void
  className?: string
}

export const ContextViewer = ({ 
  context, 
  onContextUpdate,
  className 
}: ContextViewerProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContext, setEditedContext] = useState<Partial<TextContext> | null>(null)

  if (!context) {
    return (
      <></>
    )
  }

  const handleStartEdit = () => {
    setEditedContext({
      description: context.description,
      tone: context.tone,
      intent: context.intent
    })
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editedContext && onContextUpdate) {
      onContextUpdate(editedContext)
    }
    setIsEditing(false)
    setEditedContext(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedContext(null)
  }


  const formatTimestamp = (date: Date) => {
    return date.toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  return (
    <div className={cn("space-y-2", className)}>
      {/* Heading */}
      <div className="flex items-center gap-2">
        <Info className="text-muted-foreground mt-1 flex-shrink-0" size={14} />
        <div className="text-sm text-muted-foreground mt-1">Context</div>
      </div>
      
      {/* Context Preview */}
      <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg border">
        <span className="flex-1 truncate">{context.description}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </Button>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <Card className="p-4 space-y-4 bg-muted/30 border-muted">
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-muted-foreground" />
              <h4 className="font-medium text-sm">Text Context Details</h4>
            </div>
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEdit}
                  className="h-8 px-2 text-xs"
                >
                  <Edit3 size={12} className="mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-8 px-2 text-xs text-green-600 hover:text-green-700"
                  >
                    <Save size={12} className="mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    <X size={12} className="mr-1" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Context Details */}
          <div className="space-y-3">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-muted-foreground" />
                <Label className="text-sm font-medium">Description</Label>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedContext?.description || ''}
                  onChange={(e) => setEditedContext({ 
                    ...editedContext, 
                    description: e.target.value 
                  })}
                  className="min-h-[80px] text-sm"
                  placeholder="Describe the context of this text..."
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded border">
                  {context.description}
                </p>
              )}
            </div>

            {/* Tone and Intent */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Tone</Label>
                </div>
                {isEditing ? (
                  <Input
                    value={editedContext?.tone || ''}
                    onChange={(e) => setEditedContext({ 
                      ...editedContext, 
                      tone: e.target.value 
                    })}
                    className="text-sm"
                    placeholder="e.g., formal, casual"
                  />
                ) : (
                  <Badge variant="secondary" className="text-sm">
                    {context.tone}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Intent</Label>
                </div>
                {isEditing ? (
                  <Input
                    value={editedContext?.intent || ''}
                    onChange={(e) => setEditedContext({ 
                      ...editedContext, 
                      intent: e.target.value 
                    })}
                    className="text-sm"
                    placeholder="e.g., explanation, instruction"
                  />
                ) : (
                  <Badge variant="outline" className="text-sm">
                    {context.intent}
                  </Badge>
                )}
              </div>
            </div>


            {/* Metadata */}
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={12} />
                  <span>Generated: {formatTimestamp(context.timestamp)}</span>
                </div>
                <div>
                  Text length: {context.textLength.toLocaleString()} characters
                  {context.usageCount > 0 && (
                    <span className="ml-3">Used {context.usageCount} times</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ContextViewer