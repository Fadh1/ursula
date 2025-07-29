import { AIModel, AIProviderAdapter, AIProviderConfig } from '@/types/ai-models'

export class GoogleAdapter implements AIProviderAdapter {
  async sendRequest(text: string, prompt: string, config: AIProviderConfig, modelName?: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Text to process: "${text}"\n\nInstruction: ${prompt}\n\nReturn only the processed text without any additional explanation.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI API error: ${error}`)
    }

    const data = await response.json()
    return data.candidates[0].content.parts[0].text
  }

  async validateKey(config: AIProviderConfig): Promise<boolean> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`)
      return response.ok
    } catch {
      return false
    }
  }

  getModelInfo(): AIModel {
    return {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'google',
      capabilities: ['Text generation', 'Multi-turn conversations', 'Complex reasoning', 'Code generation'],
      maxTokens: 32768,
      costPerToken: 0.00001,
      isDefault: false,
      isLocal: false,
    }
  }
}