import { AIProviderConfig } from '@/types/ai-models'

interface EnvironmentConfig {
  VITE_OPENAI_API_KEY?: string
  VITE_ANTHROPIC_API_KEY?: string
  VITE_GOOGLE_API_KEY?: string
  VITE_OLLAMA_BASE_URL?: string
  VITE_LM_STUDIO_BASE_URL?: string
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
    if (env.VITE_OPENAI_API_KEY) {
      this.configs.set('openai', {
        apiKey: env.VITE_OPENAI_API_KEY,
      })
    }
    
    // Anthropic configuration
    if (env.VITE_ANTHROPIC_API_KEY) {
      this.configs.set('anthropic', {
        apiKey: env.VITE_ANTHROPIC_API_KEY,
      })
    }
    
    // Google configuration
    if (env.VITE_GOOGLE_API_KEY) {
      this.configs.set('google', {
        apiKey: env.VITE_GOOGLE_API_KEY,
      })
    }
    
    // Ollama configuration
    if (env.VITE_OLLAMA_BASE_URL) {
      this.configs.set('ollama', {
        baseUrl: env.VITE_OLLAMA_BASE_URL,
        apiKey: '', // Ollama doesn't require API key
      })
    }
    
    // LM Studio configuration
    if (env.VITE_LM_STUDIO_BASE_URL) {
      this.configs.set('lmstudio', {
        baseUrl: env.VITE_LM_STUDIO_BASE_URL,
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