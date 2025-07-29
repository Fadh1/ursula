import { AIModel, ModelHealth, AIProviderAdapter } from '@/types/ai-models'
import { configManager } from './config-manager'

export class ModelMonitor {
  private static instance: ModelMonitor
  private healthCache: Map<string, ModelHealth> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private providers: Map<string, AIProviderAdapter> = new Map()
  
  private constructor() {}
  
  static getInstance(): ModelMonitor {
    if (!ModelMonitor.instance) {
      ModelMonitor.instance = new ModelMonitor()
    }
    return ModelMonitor.instance
  }
  
  registerProvider(provider: string, adapter: AIProviderAdapter) {
    this.providers.set(provider, adapter)
  }
  
  async checkHealth(model: AIModel): Promise<ModelHealth> {
    const startTime = Date.now()
    const adapter = this.providers.get(model.provider)
    
    if (!adapter) {
      return {
        modelId: model.id,
        status: 'offline',
        lastChecked: new Date(),
        error: 'Provider not found',
        consecutiveFailures: 1,
      }
    }
    
    try {
      const config = configManager.getProviderConfig(model.provider)
      if (!config) {
        return {
          modelId: model.id,
          status: 'offline',
          lastChecked: new Date(),
          error: 'Provider not configured',
          consecutiveFailures: 1,
        }
      }
      
      // For local models, check if they're discoverable
      if (model.isLocal && adapter.discoverModels) {
        const models = await adapter.discoverModels()
        const isAvailable = models.some(m => m.id === model.id)
        
        if (!isAvailable) {
          const previousHealth = this.healthCache.get(model.id)
          return {
            modelId: model.id,
            status: 'offline',
            lastChecked: new Date(),
            error: 'Model not available',
            consecutiveFailures: (previousHealth?.consecutiveFailures || 0) + 1,
          }
        }
      } else {
        // For cloud models, validate the key
        const isValid = await adapter.validateKey(config)
        if (!isValid) {
          const previousHealth = this.healthCache.get(model.id)
          return {
            modelId: model.id,
            status: 'offline',
            lastChecked: new Date(),
            error: 'Invalid API key',
            consecutiveFailures: (previousHealth?.consecutiveFailures || 0) + 1,
          }
        }
      }
      
      const responseTime = Date.now() - startTime
      const health: ModelHealth = {
        modelId: model.id,
        status: 'online',
        lastChecked: new Date(),
        responseTime,
        consecutiveFailures: 0,
      }
      
      this.healthCache.set(model.id, health)
      return health
    } catch (error) {
      const previousHealth = this.healthCache.get(model.id)
      const health: ModelHealth = {
        modelId: model.id,
        status: 'offline',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        consecutiveFailures: (previousHealth?.consecutiveFailures || 0) + 1,
      }
      
      this.healthCache.set(model.id, health)
      return health
    }
  }
  
  getHealthStatus(modelId: string): ModelHealth | null {
    return this.healthCache.get(modelId) || null
  }
  
  startMonitoring(models: AIModel[], intervalMs: number = 30000) {
    this.stopMonitoring()
    
    // Initial health check
    models.forEach(model => this.checkHealth(model))
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      models.forEach(model => this.checkHealth(model))
    }, intervalMs)
  }
  
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
  
  getAverageResponseTime(modelId: string, sampleSize: number = 10): number | null {
    const health = this.healthCache.get(modelId)
    return health?.responseTime || null
  }
  
  clearCache() {
    this.healthCache.clear()
  }
}

export const modelMonitor = ModelMonitor.getInstance()