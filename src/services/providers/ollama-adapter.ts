import { AIModel, AIProviderAdapter, AIProviderConfig } from '@/types/ai-models'

interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
}

export class OllamaAdapter implements AIProviderAdapter {
  private discoveredModels: AIModel[] = []
  
  async sendRequest(text: string, prompt: string, config: AIProviderConfig, modelName?: string): Promise<string> {
    const baseUrl = config.baseUrl || 'http://localhost:11434'
    const model = modelName || 'llama2'
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: `Text to process: "${text}"\n\nInstruction: ${prompt}\n\nReturn only the processed text without any additional explanation.`,
        stream: false,
        options: {
          temperature: 0.7,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API error: ${error}`)
    }

    const data = await response.json()
    return data.response
  }

  async validateKey(config: AIProviderConfig): Promise<boolean> {
    // Ollama doesn't use API keys, just check if service is running
    try {
      const baseUrl = config.baseUrl || 'http://localhost:11434'
      const response = await fetch(`${baseUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  async discoverModels(): Promise<AIModel[]> {
    const config = { baseUrl: 'http://localhost:11434', apiKey: '' }
    
    try {
      const response = await fetch(`${config.baseUrl}/api/tags`)
      if (!response.ok) {
        return []
      }
      
      const data = await response.json()
      const models: OllamaModel[] = data.models || []
      
      this.discoveredModels = models.map((model): AIModel => ({
        id: `ollama-${model.name}`,
        name: `Ollama ${model.name}`,
        provider: 'ollama',
        capabilities: ['Text generation', 'Local processing', 'Privacy-focused'],
        maxTokens: 4096, // Default for most local models
        costPerToken: 0, // Free for local models
        isDefault: false,
        isLocal: true,
        status: 'online',
      }))
      
      return this.discoveredModels
    } catch {
      return []
    }
  }

  getModelInfo(): AIModel[] {
    // Return discovered models or a default if none discovered yet
    if (this.discoveredModels.length > 0) {
      return this.discoveredModels
    }
    
    return [{
      id: 'ollama-default',
      name: 'Ollama (Local)',
      provider: 'ollama',
      capabilities: ['Text generation', 'Local processing', 'Privacy-focused'],
      maxTokens: 4096,
      costPerToken: 0,
      isDefault: false,
      isLocal: true,
      status: 'checking',
    }]
  }
}