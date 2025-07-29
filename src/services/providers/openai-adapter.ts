import { AIModel, AIProviderAdapter, AIProviderConfig } from '@/types/ai-models'

export class OpenAIAdapter implements AIProviderAdapter {
  async sendRequest(text: string, prompt: string, config: AIProviderConfig): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...(config.organizationId && { 'OpenAI-Organization': config.organizationId }),
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
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
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  async validateKey(config: AIProviderConfig): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          ...(config.organizationId && { 'OpenAI-Organization': config.organizationId }),
        },
      })
      
      return response.ok
    } catch {
      return false
    }
  }

  getModelInfo(): AIModel {
    return {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      capabilities: ['Text generation', 'Code writing', 'Analysis', 'Creative writing'],
      maxTokens: 128000,
      costPerToken: 0.00001,
      isDefault: true,
    }
  }
}