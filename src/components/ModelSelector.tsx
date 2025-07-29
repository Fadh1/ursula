import { AIModel } from '@/types/ai-models'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface ModelSelectorProps {
  onModelSelect: (model: AIModel) => void
  currentModel: AIModel | null
  availableModels: AIModel[]
}

export function ModelSelector({ onModelSelect, currentModel, availableModels }: ModelSelectorProps) {
  const handleModelChange = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId)
    if (model) {
      onModelSelect(model)
    }
  }

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI'
      case 'anthropic':
        return 'Anthropic'
      case 'google':
        return 'Google'
      default:
        return provider
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentModel?.id} onValueChange={handleModelChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select AI model" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Available Models</SelectLabel>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{model.name}</span>
                  {model.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      {currentModel && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Info size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-semibold">{currentModel.name}</div>
              <div className="text-sm text-muted-foreground">
                Provider: {getProviderLabel(currentModel.provider)}
              </div>
              <div className="text-sm">
                <div className="font-medium mb-1">Capabilities:</div>
                <div className="flex flex-wrap gap-1">
                  {currentModel.capabilities.map((cap, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Max tokens: {currentModel.maxTokens.toLocaleString()}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}