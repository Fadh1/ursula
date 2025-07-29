import { AIProviderConfig } from '@/types/ai-models'

interface EnvironmentConfig {
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GOOGLE_API_KEY?: string
  OLLAMA_BASE_URL?: string
  LM_STUDIO_BASE_URL?: string
}

export class ConfigManager {
  private static instance: ConfigManager
  private configs: Map<string, AIProviderConfig> = new Map()
  
  private constructor() {
    this.loadConfigurations()
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }
  
  private loadConfigurations() {
    // Load from environment variables
    const env = import.meta.env as unknown as EnvironmentConfig
    
    // OpenAI configuration
    if (env.OPENAI_API_KEY) {
      this.configs.set('openai', {
        apiKey: env.OPENAI_API_KEY,
      })
    }
    
    // Anthropic configuration
    if (env.ANTHROPIC_API_KEY) {
      this.configs.set('anthropic', {
        apiKey: env.ANTHROPIC_API_KEY,
      })
    }
    
    // Google configuration
    if (env.GOOGLE_API_KEY) {
      this.configs.set('google', {
        apiKey: env.GOOGLE_API_KEY,
      })
    }
    
    // Ollama configuration
    if (env.OLLAMA_BASE_URL) {
      this.configs.set('ollama', {
        baseUrl: env.OLLAMA_BASE_URL,
        apiKey: '', // Ollama doesn't require API key
      })
    }
    
    // LM Studio configuration
    if (env.LM_STUDIO_BASE_URL) {
      this.configs.set('lmstudio', {
        baseUrl: env.LM_STUDIO_BASE_URL,
        apiKey: '', // LM Studio doesn't require API key
      })
    }
  }
  
  getProviderConfig(provider: string): AIProviderConfig | null {
    return this.configs.get(provider) || null
  }
  
  isProviderConfigured(provider: string): boolean {
    return this.configs.has(provider)
  }
  
  getAllConfigurations(): Map<string, AIProviderConfig> {
    return new Map(this.configs)
  }
  
  getConfiguredProviders(): string[] {
    return Array.from(this.configs.keys())
  }
}

export const configManager = ConfigManager.getInstance()