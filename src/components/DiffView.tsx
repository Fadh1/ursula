import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiffViewProps {
  originalText: string
  suggestedText: string
  onAccept: () => void
  onReject: () => void
  operation: string
}

const DiffView = ({ originalText, suggestedText, onAccept, onReject, operation }: DiffViewProps) => {
  // Simple diff visualization - splits by words for better readability
  const getWordDiff = () => {
    const originalWords = originalText.split(' ')
    const suggestedWords = suggestedText.split(' ')
    
    // For simplicity, we'll show the original as "removed" and suggested as "added"
    return {
      removed: originalWords,
      added: suggestedWords
    }
  }

  const { removed, added } = getWordDiff()

  return (
    <Card className="p-4 border-orange-200 bg-orange-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-orange-600" />
          <h4 className="font-medium text-foreground">Suggested Changes</h4>
          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
            {operation}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onReject}
            variant="outline"
            size="sm"
            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            <X size={14} />
            Reject
          </Button>
          <Button
            onClick={onAccept}
            size="sm"
            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check size={14} />
            Accept
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Original Text (Removed) */}
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-xs text-red-600 font-medium mb-2">- Original</div>
          <div className="text-sm">
            {removed.map((word, index) => (
              <span key={index} className="bg-red-100 text-red-800 px-0.5 rounded mr-1">
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Suggested Text (Added) */}
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="text-xs text-green-600 font-medium mb-2">+ Suggested</div>
          <div className="text-sm">
            {added.map((word, index) => (
              <span key={index} className="bg-green-100 text-green-800 px-0.5 rounded mr-1">
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default DiffView