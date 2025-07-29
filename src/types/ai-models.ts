export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  capabilities: string[]
  maxTokens: number
  costPerToken: number
  isDefault: boolean
}

export interface AIRequest {
  id: string
  highlightId: string
  text: string
  prompt: string
  model: AIModel
  timestamp: Date
}

export interface AIResponse {
  id: string
  requestId: string
  originalText: string
  suggestedText: string
  model: AIModel
  processingTime: number
  error?: string
}

export interface AIHistoryEntry extends AIRequest {
  response: AIResponse
  applied: boolean
}

export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
  organizationId?: string
}

export interface AIProviderAdapter {
  sendRequest(text: string, prompt: string, config: AIProviderConfig): Promise<string>
  validateKey(config: AIProviderConfig): Promise<boolean>
  getModelInfo(): AIModel
}