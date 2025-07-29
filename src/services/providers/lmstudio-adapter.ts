import { AIModel, AIProviderAdapter, AIProviderConfig } from '@/types/ai-models'

interface LMStudioModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export class LMStudioAdapter implements AIProviderAdapter {
  private discoveredModels: AIModel[] = []
  
  async sendRequest(text: string, prompt: string, config: AIProviderConfig, modelId?: string): Promise<string> {
    const baseUrl = config.baseUrl || 'http://localhost:1234'
    const model = modelId || 'local-model'
    
    // LM Studio uses OpenAI-compatible API
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that processes text according to user instructions. Return only the processed text without any additional explanation.',
          },
          {
            role: 'user',
            content: `Text to process: "${text}"\n\nInstruction: ${prompt}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LM Studio API error: ${error}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  async validateKey(config: AIProviderConfig): Promise<boolean> {
    // LM Studio doesn't use API keys, just check if service is running
    try {
      const baseUrl = config.baseUrl || 'http://localhost:1234'
      const response = await fetch(`${baseUrl}/v1/models`)
      return response.ok
    } catch {
      return false
    }
  }

  async discoverModels(): Promise<AIModel[]> {
    const config = { baseUrl: 'http://localhost:1234', apiKey: '' }
    
    try {
      const response = await fetch(`${config.baseUrl}/v1/models`)
      if (!response.ok) {
        return []
      }
      
      const data = await response.json()
      const models: LMStudioModel[] = data.data || []
      
      this.discoveredModels = models.map((model): AIModel => ({
        id: model.id,
        name: `LM Studio ${model.id}`,
        provider: 'lmstudio',
        capabilities: ['Text generation', 'OpenAI-compatible', 'Local processing'],
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
      id: 'lmstudio-default',
      name: 'LM Studio (Local)',
      provider: 'lmstudio',
      capabilities: ['Text generation', 'OpenAI-compatible', 'Local processing'],
      maxTokens: 4096,
      costPerToken: 0,
      isDefault: false,
      isLocal: true,
      status: 'checking',
    }]
  }
}