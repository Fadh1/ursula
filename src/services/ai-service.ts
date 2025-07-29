import { AIModel, AIRequest, AIResponse, AIProviderAdapter, AIProviderConfig } from '@/types/ai-models'
import { OpenAIAdapter } from './providers/openai-adapter'
import { AnthropicAdapter } from './providers/anthropic-adapter'

const STORAGE_KEY_PREFIX = 'ai_provider_key_'

export class AIService {
  private providers: Map<string, AIProviderAdapter> = new Map()
  private availableModels: AIModel[] = []
  
  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    const openAI = new OpenAIAdapter()
    const anthropic = new AnthropicAdapter()
    
    this.providers.set('openai', openAI)
    this.providers.set('anthropic', anthropic)
    
    this.availableModels = [
      openAI.getModelInfo(),
      anthropic.getModelInfo(),
    ]
  }

  async sendToAI(text: string, prompt: string, model: AIModel): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = this.generateId()
    
    try {
      const provider = this.providers.get(model.provider)
      if (!provider) {
        throw new Error(`Provider ${model.provider} not found`)
      }

      const config = this.getProviderConfig(model.provider)
      if (!config.apiKey) {
        throw new Error(`API key not configured for ${model.provider}`)
      }

      const suggestedText = await provider.sendRequest(text, prompt, config)
      
      return {
        id: this.generateId(),
        requestId,
        originalText: text,
        suggestedText,
        model,
        processingTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        id: this.generateId(),
        requestId,
        originalText: text,
        suggestedText: text,
        model,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  getAvailableModels(): AIModel[] {
    return this.availableModels
  }

  async validateAPIKey(model: AIModel, key: string): Promise<boolean> {
    const provider = this.providers.get(model.provider)
    if (!provider) {
      return false
    }

    try {
      const config: AIProviderConfig = { apiKey: key }
      const isValid = await provider.validateKey(config)
      
      if (isValid) {
        this.saveProviderConfig(model.provider, config)
      }
      
      return isValid
    } catch {
      return false
    }
  }

  private getProviderConfig(provider: string): AIProviderConfig {
    const storedKey = localStorage.getItem(STORAGE_KEY_PREFIX + provider)
    return {
      apiKey: storedKey || '',
    }
  }

  private saveProviderConfig(provider: string, config: AIProviderConfig) {
    localStorage.setItem(STORAGE_KEY_PREFIX + provider, config.apiKey)
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const aiService = new AIService()