import { AIModel, AIProviderAdapter, AIProviderConfig } from '@/types/ai-models'

export class AnthropicAdapter implements AIProviderAdapter {
  async sendRequest(text: string, prompt: string, config: AIProviderConfig, modelName?: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: `Text to process: "${text}"\n\nInstruction: ${prompt}\n\nReturn only the processed text without any additional explanation.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const data = await response.json()
    return data.content[0].text
  }

  async validateKey(config: AIProviderConfig): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10,
        }),
      })
      
      return response.ok || response.status === 400 // 400 might mean rate limit, but key is valid
    } catch {
      return false
    }
  }

  getModelInfo(): AIModel {
    return {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      capabilities: ['Advanced reasoning', 'Code analysis', 'Creative writing', 'Complex tasks'],
      maxTokens: 200000,
      costPerToken: 0.000015,
      isDefault: false,
    }
  }
}