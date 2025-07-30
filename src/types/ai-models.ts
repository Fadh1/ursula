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

// Nano Context Types for intelligent contextual awareness
export interface TextContext {
  /** Unique identifier for the context */
  id: string
  /** Hash of the text for quick comparison and storage key */
  textHash: string
  /** AI-generated description (~100 words) */
  description: string
  /** Detected tone (formal, casual, technical, etc.) */
  tone: string
  /** Overall intent/purpose of the text */
  intent: string
  /** Main arguments or key points made in the text */
  keyArguments: string[]
  /** AI model used for context generation */
  model: AIModel
  /** When context was generated */
  timestamp: Date
  /** When context was last accessed/used */
  lastUsed: Date
  /** How many times context was used in prompts */
  usageCount: number
  /** Confidence score (0-1) from AI generation */
  confidence: number
  /** Original text length for reference */
  textLength: number
}

export interface ContextStorage {
  /** Map of textHash -> context for efficient lookup */
  contexts: Record<string, TextContext>
  /** Storage metadata for maintenance */
  metadata: {
    /** When expired contexts were last cleaned up */
    lastCleanup: Date
    /** Total number of contexts stored */
    totalContexts: number
    /** Storage format version for migration support */
    storageVersion: string
    /** Total storage size estimate in characters */
    estimatedSize: number
    /** Whether the contexts are compressed (optional) */
    compressed?: boolean
  }
}

export interface SimilarityThresholds {
  /** Threshold below which context update is triggered (default: 0.8) */
  updateThreshold: number
  /** Threshold above which cached context is reused (default: 0.95) */
  cacheThreshold: number
  /** Threshold below which text is considered significantly changed (default: 0.5) */
  significantChange: number
  /** Maximum allowed contexts before cleanup (default: 100) */
  maxContexts: number
  /** Context expiry time in milliseconds (default: 7 days) */
  contextExpiryMs: number
}

export interface NanoContextConfig {
  /** Similarity thresholds configuration */
  thresholds: SimilarityThresholds
  /** Whether nano context is enabled */
  enabled: boolean
  /** Whether to generate context automatically on text changes */
  autoGenerate: boolean
  /** Maximum text length to process (default: 10000 characters) */
  maxTextLength: number
  /** Debounce delay for context updates in milliseconds (default: 2000) */
  debounceMs: number
}

// Default configuration constants
export const DEFAULT_NANO_CONTEXT_CONFIG: NanoContextConfig = {
  thresholds: {
    updateThreshold: 0.8,
    cacheThreshold: 0.95,
    significantChange: 0.5,
    maxContexts: 100,
    contextExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  enabled: true,
  autoGenerate: true,
  maxTextLength: 10000,
  debounceMs: 2000,
}

export const NANO_CONTEXT_STORAGE_KEY = 'nano_context_storage'
export const NANO_CONTEXT_CONFIG_KEY = 'nano_context_config'