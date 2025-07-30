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
  Hash,
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
      <div className={cn("text-xs text-muted-foreground", className)}>
        No context available for this text
      </div>
    )
  }

  const handleStartEdit = () => {
    setEditedContext({
      description: context.description,
      tone: context.tone,
      intent: context.intent,
      keyArguments: [...context.keyArguments]
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

  const handleKeyArgumentChange = (index: number, value: string) => {
    if (!editedContext) return
    const newArgs = [...(editedContext.keyArguments || [])]
    newArgs[index] = value
    setEditedContext({ ...editedContext, keyArguments: newArgs })
  }

  const handleAddKeyArgument = () => {
    if (!editedContext) return
    const newArgs = [...(editedContext.keyArguments || []), '']
    setEditedContext({ ...editedContext, keyArguments: newArgs })
  }

  const handleRemoveKeyArgument = (index: number) => {
    if (!editedContext) return
    const newArgs = [...(editedContext.keyArguments || [])]
    newArgs.splice(index, 1)
    setEditedContext({ ...editedContext, keyArguments: newArgs })
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Compact View */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Context available: {context.tone} tone, {context.intent}</span>
        <Badge variant="outline" className="text-xs">
          {Math.round(context.confidence * 100)}% confidence
        </Badge>
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

            {/* Key Arguments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-muted-foreground" />
                <Label className="text-sm font-medium">Key Points</Label>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  {(editedContext?.keyArguments || []).map((arg, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={arg}
                        onChange={(e) => handleKeyArgumentChange(index, e.target.value)}
                        className="text-sm"
                        placeholder={`Key point ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveKeyArgument(index)}
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-600"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddKeyArgument}
                    className="w-full text-sm"
                  >
                    Add Key Point
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {context.keyArguments.length > 0 ? (
                    context.keyArguments.map((arg, index) => (
                      <div key={index} className="text-sm text-muted-foreground bg-background/50 px-3 py-2 rounded border">
                        • {arg}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No key points identified</p>
                  )}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="pt-2 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>Generated: {formatTimestamp(context.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getConfidenceColor(context.confidence))}
                  >
                    {Math.round(context.confidence * 100)}% confidence
                  </Badge>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Text length: {context.textLength.toLocaleString()} characters
                {context.usageCount > 0 && (
                  <span className="ml-3">Used {context.usageCount} times</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ContextViewer