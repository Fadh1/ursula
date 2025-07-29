export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'lmstudio'
  capabilities: string[]
  maxTokens: number
  costPerToken: number
  isDefault: boolean
  // New fields
  isLocal?: boolean
  status?: 'online' | 'offline' | 'checking'
  lastChecked?: Date
  averageResponseTime?: number
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
  actualModel?: AIModel // Model actually used (for fallback scenarios)
  fallbackUsed?: boolean
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
  sendRequest(text: string, prompt: string, config: AIProviderConfig, modelName?: string): Promise<string>
  validateKey(config: AIProviderConfig): Promise<boolean>
  getModelInfo(): AIModel | AIModel[]
  discoverModels?(): Promise<AIModel[]>
}

export interface ModelHealth {
  modelId: string
  status: 'online' | 'offline' | 'degraded'
  lastChecked: Date
  responseTime?: number
  error?: string
  consecutiveFailures: number
}

// Enhanced types for Sidebar Improvements
export type ActionType = 'verify' | 'expand' | 'reword';

export type RewordType = 'concise' | 'flesh_out' | 'tone' | 'simplify' | 'engaging' | 'audience';

export type ToneType = 'formal' | 'casual' | 'academic';

export type AudienceType = 'technical' | 'general';

export interface RewordConfig {
  type: RewordType;
  tone?: ToneType;
  audience?: AudienceType;
}

export interface ActionOptions {
  rewordType?: RewordType;
  tone?: ToneType;
  audience?: AudienceType;
  customPrompt?: string;
}

export interface DiffContext {
  action: ActionType;
  options: ActionOptions;
  timestamp: Date;
  model: AIModel;
  canUndo: boolean;
}

export interface ActionRecommendation {
  suggested: ActionType;
  confidence: number;
  reason: string;
  alternatives: ActionType[];
}

export interface SmartSuggestion {
  recommendation: ActionRecommendation;
  previewText?: string;
  processing: boolean;
}