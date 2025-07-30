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
import { Info, Circle, Loader2 } from 'lucide-react'

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
      case 'ollama':
        return 'Ollama'
      case 'lmstudio':
        return 'LM Studio'
      default:
        return provider
    }
  }
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online':
        return <Circle className="w-2 h-2 fill-green-500 text-green-500" />
      case 'offline':
        return <Circle className="w-2 h-2 fill-red-500 text-red-500" />
      case 'checking':
        return <Loader2 className="w-2 h-2 animate-spin text-yellow-500" />
      default:
        return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />
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
              <SelectItem 
                key={model.id} 
                value={model.id} 
                className={`flex items-center justify-between ${
                  model.status === 'offline' ? 'opacity-50' : ''
                }`}
                disabled={model.status === 'offline'}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(model.status)}
                  <span>{model.name}</span>
                  {model.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                  {model.isLocal && (
                    <Badge variant="outline" className="text-xs">
                      Local
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
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Max tokens: {currentModel.maxTokens.toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(currentModel.status)}
                    <span className="capitalize">{currentModel.status || 'unknown'}</span>
                  </div>
                </div>
                {currentModel.averageResponseTime && (
                  <div>Avg response: {currentModel.averageResponseTime}ms</div>
                )}
                {currentModel.lastChecked && (
                  <div>Last checked: {currentModel.lastChecked.toLocaleTimeString()}</div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}