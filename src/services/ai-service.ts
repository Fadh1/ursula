import { AIModel, AIRequest, AIResponse, AIProviderAdapter, AIProviderConfig, ModelHealth } from '@/types/ai-models'
import { OpenAIAdapter } from './providers/openai-adapter'
import { AnthropicAdapter } from './providers/anthropic-adapter'
import { GoogleAdapter } from './providers/google-adapter'
import { OllamaAdapter } from './providers/ollama-adapter'
import { LMStudioAdapter } from './providers/lmstudio-adapter'
import { configManager } from './models/config-manager'
import { modelMonitor } from './models/model-monitor'


export class AIService {
  private providers: Map<string, AIProviderAdapter> = new Map()
  private availableModels: AIModel[] = []
  private modelsByProvider: Map<string, AIModel[]> = new Map()
  private initialized: boolean = false
  
  constructor() {
    // Initialize synchronously, models will load asynchronously
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize all adapters
    const adapters: [string, AIProviderAdapter][] = [
      ['openai', new OpenAIAdapter()],
      ['anthropic', new AnthropicAdapter()],
      ['google', new GoogleAdapter()],
      ['ollama', new OllamaAdapter()],
      ['lmstudio', new LMStudioAdapter()],
    ]
    
    // Register providers and check configurations
    for (const [provider, adapter] of adapters) {
      if (configManager.isProviderConfigured(provider)) {
        this.providers.set(provider, adapter)
        modelMonitor.registerProvider(provider, adapter)
        
        // Get models from adapter
        const modelInfo = adapter.getModelInfo()
        const models = Array.isArray(modelInfo) ? modelInfo : [modelInfo]
        this.modelsByProvider.set(provider, models)
      }
    }
    
    // Update available models synchronously
    this.updateAvailableModels()
  }
  
  private async ensureInitialized() {
    if (this.initialized) return
    
    // Discover local models asynchronously
    const promises = []
    for (const [provider, adapter] of this.providers.entries()) {
      if (adapter.discoverModels) {
        promises.push(this.discoverLocalModels(provider, adapter))
      }
    }
    
    await Promise.all(promises)
    
    // Start model monitoring
    if (this.availableModels.length > 0) {
      modelMonitor.startMonitoring(this.availableModels)
    }
    
    this.initialized = true
  }
  
  private async discoverLocalModels(provider: string, adapter: AIProviderAdapter) {
    if (adapter.discoverModels) {
      try {
        const discovered = await adapter.discoverModels()
        if (discovered.length > 0) {
          this.modelsByProvider.set(provider, discovered)
          this.updateAvailableModels()
        }
      } catch (error) {
        console.error(`Failed to discover models for ${provider}:`, error)
      }
    }
  }
  
  private updateAvailableModels() {
    this.availableModels = []
    for (const models of this.modelsByProvider.values()) {
      this.availableModels.push(...models)
    }
  }

  async sendToAI(text: string, prompt: string, model: AIModel): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = this.generateId()
    let actualModel = model
    let fallbackUsed = false
    
    // Try the primary model first
    const result = await this.tryModel(text, prompt, model)
    
    if (result.error && this.availableModels.length > 1) {
      // Try fallback models
      const fallbackModels = this.availableModels
        .filter(m => m.id !== model.id && m.status === 'online')
        .sort((a, b) => {
          // Prefer models from same provider
          if (a.provider === model.provider && b.provider !== model.provider) return -1
          if (b.provider === model.provider && a.provider !== model.provider) return 1
          // Then prefer non-local models for reliability
          if (!a.isLocal && b.isLocal) return -1
          if (!b.isLocal && a.isLocal) return 1
          return 0
        })
      
      for (const fallbackModel of fallbackModels) {
        const fallbackResult = await this.tryModel(text, prompt, fallbackModel)
        if (!fallbackResult.error) {
          actualModel = fallbackModel
          fallbackUsed = true
          return {
            id: this.generateId(),
            requestId,
            originalText: text,
            suggestedText: fallbackResult.suggestedText,
            model,
            actualModel,
            fallbackUsed,
            processingTime: Date.now() - startTime,
          }
        }
      }
    }
    
    // Return the original result (with error if all failed)
    return {
      id: this.generateId(),
      requestId,
      originalText: text,
      suggestedText: result.suggestedText || text,
      model,
      actualModel,
      fallbackUsed,
      processingTime: Date.now() - startTime,
      error: result.error,
    }
  }
  
  private async tryModel(text: string, prompt: string, model: AIModel): Promise<{ suggestedText?: string; error?: string }> {
    try {
      const provider = this.providers.get(model.provider)
      if (!provider) {
        return { error: `Provider ${model.provider} not found` }
      }

      const config = configManager.getProviderConfig(model.provider)
      if (!config) {
        return { error: `Provider ${model.provider} not configured` }
      }

      // For local models with multiple options, extract the model name
      let modelName: string | undefined
      if (model.isLocal && model.id.includes('-')) {
        modelName = model.id.split('-').slice(1).join('-')
      }

      const suggestedText = await provider.sendRequest(text, prompt, config, modelName)
      
      // Update model health on success
      modelMonitor.checkHealth(model)
      
      return { suggestedText }
    } catch (error) {
      // Update model health on failure
      modelMonitor.checkHealth(model)
      
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
  }

  async getAvailableModels(): Promise<AIModel[]> {
    // Ensure initialization is complete
    await this.ensureInitialized()
    
    // Update model statuses
    for (const model of this.availableModels) {
      const health = modelMonitor.getHealthStatus(model.id)
      if (health) {
        model.status = health.status
        model.lastChecked = health.lastChecked
        model.averageResponseTime = health.responseTime
      }
    }
    
    return this.availableModels
  }
  
  getModelHealth(modelId: string): ModelHealth | null {
    return modelMonitor.getHealthStatus(modelId)
  }




  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const aiService = new AIService()