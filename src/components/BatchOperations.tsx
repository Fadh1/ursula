import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Square, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Users
} from 'lucide-react'
import { ActionType, ActionOptions } from '@/types/ai-models'

interface Highlight {
  id: string
  text: string
  color: string
  position: { from: number; to: number }
  timestamp: Date
}

interface BatchResult {
  highlightId: string
  success: boolean
  originalText: string
  suggestedText?: string
  error?: string
}

interface BatchOperationsProps {
  highlights: Highlight[]
  onBatchExecute: (highlightIds: string[], action: ActionType, options?: ActionOptions) => Promise<BatchResult[]>
  isVisible: boolean
  onClose: () => void
}

const BatchOperations = ({
  highlights,
  onBatchExecute,
  isVisible,
  onClose
}: BatchOperationsProps) => {
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BatchResult[]>([])
  const [currentAction, setCurrentAction] = useState<ActionType>('verify')

  const handleSelectAll = () => {
    if (selectedHighlights.length === highlights.length) {
      setSelectedHighlights([])
    } else {
      setSelectedHighlights(highlights.map(h => h.id))
    }
  }
  
  const handleSelectHighlight = (highlightId: string) => {
    setSelectedHighlights(prev => 
      prev.includes(highlightId)
        ? prev.filter(id => id !== highlightId)
        : [...prev, highlightId]
    )
  }

  const handleBatchAction = async (action: ActionType, options?: ActionOptions) => {
    if (selectedHighlights.length === 0) return
    
    setIsProcessing(true)
    setProgress(0)
    setResults([])
    setCurrentAction(action)
    
    try {
      const results = await onBatchExecute(selectedHighlights, action, options)
      setResults(results)
      setProgress(100)
    } catch (error) {
      console.error('Batch operation failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  if (!isVisible) return null

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="font-medium">Batch Operations</h3>
          <Badge variant="secondary">{highlights.length} highlights</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      {/* Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Select highlights:</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
          >
            {selectedHighlights.length === highlights.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        
        <div className="max-h-32 overflow-y-auto space-y-1">
          {highlights.map(highlight => (
            <div key={highlight.id} className="flex items-center space-x-2">
              <Checkbox
                id={highlight.id}
                checked={selectedHighlights.includes(highlight.id)}
                onCheckedChange={() => handleSelectHighlight(highlight.id)}
              />
              <label 
                htmlFor={highlight.id} 
                className="text-sm cursor-pointer flex-1 truncate"
              >
                {highlight.text.substring(0, 50)}...
              </label>
              <Badge variant="outline" className="text-xs">
                {highlight.color}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBatchAction('verify')}
          disabled={selectedHighlights.length === 0 || isProcessing}
        >
          <CheckCircle2 size={14} className="mr-1" />
          Verify All
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBatchAction('expand')}
          disabled={selectedHighlights.length === 0 || isProcessing}
        >
          <Play size={14} className="mr-1" />
          Expand All
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBatchAction('reword', { rewordType: 'concise' })}
          disabled={selectedHighlights.length === 0 || isProcessing}
        >
          <Square size={14} className="mr-1" />
          Make Concise
        </Button>
      </div>

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing {currentAction}...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 size={14} />
              {successCount} successful
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle size={14} />
                {errorCount} failed
              </span>
            )}
          </div>
          
          {errorCount > 0 && (
            <div className="text-xs text-muted-foreground">
              Failed operations can be retried individually from the sidebar.
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default BatchOperations