import { 
  TextContext, 
  AIModel, 
  NanoContextConfig,
  DEFAULT_NANO_CONTEXT_CONFIG 
} from '@/types/ai-models'
import { aiService } from './ai-service'
import { 
  calculateJaccardSimilarity, 
  createTextHash
} from '@/lib/jaccard-similarity'
import { initializeNanoContextWithChecks } from '@/lib/browser-compatibility'
import { performanceMonitor, PerformanceConfig, timeOperation } from '@/lib/performance-monitor'
import { 
  NANO_CONTEXT_STORAGE_KEY, 
  ContextStorage 
} from '@/types/ai-models'

/**
 * NanoContextService - Core service for intelligent contextual awareness
 * 
 * Manages context generation, similarity detection, and storage coordination
 * for enhanced AI-powered text refinement. Follows singleton pattern from
 * SmartSuggestionsService and integrates with existing aiService.
 */
export class NanoContextService {
  private static instance: NanoContextService
  private generationQueue = new Map<string, Promise<TextContext | null>>()
  private config: NanoContextConfig = DEFAULT_NANO_CONTEXT_CONFIG
  private isInitialized = false
  private compatibilityChecked = false

  static getInstance(): NanoContextService {
    if (!this.instance) {
      this.instance = new NanoContextService()
      this.instance.initialize()
    }
    return this.instance
  }

  /**
   * Initialize the service with compatibility checks
   */
  private initialize(): void {
    if (this.isInitialized) return

    try {
      // Check browser compatibility
      this.compatibilityChecked = initializeNanoContextWithChecks()
      
      if (!this.compatibilityChecked) {
        console.warn('NanoContextService: Browser compatibility issues detected, some features may be limited')
        // Don't prevent initialization, but limit functionality
        this.config = {
          ...this.config,
          enabled: false
        }
      }

      this.isInitialized = true
      console.log('NanoContextService: Initialized successfully')
    } catch (error) {
      console.error('NanoContextService: Initialization failed:', error)
      this.isInitialized = false
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<NanoContextConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): NanoContextConfig {
    return { ...this.config }
  }

  /**
   * Generate context description for text using AI
   * 
   * @param text - Text to generate context for
   * @param model - AI model to use for generation
   * @returns Promise resolving to TextContext or null if generation fails
   */
  async generateContextForText(text: string, model: AIModel): Promise<TextContext | null> {
    // Check if service is properly initialized
    if (!this.isInitialized || !this.config.enabled) {
      console.debug('NanoContextService: Service not initialized or disabled')
      return null
    }

    // Check compatibility
    if (!this.compatibilityChecked) {
      console.warn('NanoContextService: Browser compatibility not verified')
      return null
    }

    // Validate inputs
    if (!text?.trim()) {
      console.warn('NanoContextService: Empty text provided for context generation')
      return null
    }
    
    if (!model) {
      console.warn('NanoContextService: No AI model provided for context generation')
      return null
    }

    // Check text length limits
    if (text.length < this.config.minTextLength) {
      console.debug(`NanoContextService: Text too short for context generation: ${text.length} < ${this.config.minTextLength}`)
      return null
    }

    if (text.length > this.config.maxTextLength) {
      console.warn(`NanoContextService: Text too long for context generation: ${text.length} > ${this.config.maxTextLength}`)
      return this.generateContextForLargeText(text, model)
    }

    const textHash = createTextHash(text)
    const cacheKey = `${textHash}-${model.id}`

    // Check localStorage for existing context
    const storedContext = this.getContextFromLocalStorage(textHash)
    if (storedContext && this.isCacheValid(storedContext)) {
      // Update usage tracking and save back to localStorage
      storedContext.lastUsed = new Date()
      storedContext.usageCount++
      this.saveContextToLocalStorage(storedContext).catch(error => {
        console.warn('NanoContextService: Failed to update context usage in localStorage:', error)
      })
      
      console.debug(`NanoContextService: Using stored context for hash ${textHash.substring(0, 8)}...`)
      return { ...storedContext }
    }

    // Check if generation is already in progress
    const existingPromise = this.generationQueue.get(cacheKey)
    if (existingPromise) {
      return existingPromise
    }

    // Start new generation
    const generationPromise = this.performContextGeneration(text, textHash, model)
    this.generationQueue.set(cacheKey, generationPromise)

    try {
      const result = await generationPromise
      
      // Save successful results to localStorage
      if (result) {
        this.saveContextToLocalStorage(result).catch(error => {
          console.warn('NanoContextService: Failed to save context to localStorage:', error)
        })
        console.debug(`NanoContextService: Saved context for text hash ${textHash.substring(0, 8)}...`)
      }

      return result
    } catch (error) {
      console.error('NanoContextService: Context generation failed:', error)
      // Return null on error to allow graceful degradation
      return null
    } finally {
      // Clean up generation queue
      this.generationQueue.delete(cacheKey)
    }
  }

  /**
   * Check if text has changed significantly and update context if needed
   * 
   * @param currentText - Current text content
   * @param previousText - Previous text content
   * @param model - AI model to use for context generation
   * @param onContextUpdate - Callback when context is updated
   * @returns Promise resolving to updated context or null
   */
  async checkAndUpdateContext(
    currentText: string,
    previousText: string,
    model: AIModel,
    onContextUpdate?: (context: TextContext) => void
  ): Promise<TextContext | null> {
    if (!this.config.enabled || !this.config.autoGenerate) {
      return null
    }

    // Skip if texts are identical
    if (currentText === previousText) {
      return null
    }

    // Calculate similarity with performance monitoring
    const similarity = timeOperation(
      PerformanceConfig.JACCARD_SIMILARITY,
      () => calculateJaccardSimilarity(currentText, previousText),
      {
        currentTextLength: currentText.length,
        previousTextLength: previousText.length
      }
    )
    
    // Check if update is needed
    if (similarity >= this.config.thresholds.updateThreshold) {
      // No significant change, no update needed
      return null
    }

    console.log(`Text similarity: ${similarity.toFixed(3)}, triggering context update`)

    try {
      // Generate new context
      const newContext = await this.generateContextForText(currentText, model)
      
      if (newContext && onContextUpdate) {
        try {
          onContextUpdate(newContext)
        } catch (callbackError) {
          console.error('NanoContextService: Context update callback failed:', callbackError)
          // Continue execution even if callback fails
        }
      }

      return newContext
    } catch (error) {
      console.error('NanoContextService: Context update failed:', error)
      return null
    }
  }

  /**
   * Get context for text by hash (from cache and localStorage)
   * 
   * @param textHash - Hash of the text
   * @returns Cached context or null
   */
  getContextForText(textHash: string): TextContext | null {
    // Check localStorage for the context
    const storedContext = this.getContextFromLocalStorage(textHash)
    if (storedContext && this.isCacheValid(storedContext)) {
      // Update usage tracking and save back to localStorage
      storedContext.lastUsed = new Date()
      storedContext.usageCount++
      this.saveContextToLocalStorage(storedContext).catch(error => {
        console.warn('NanoContextService: Failed to update context usage in localStorage:', error)
      })
      
      console.debug(`NanoContextService: Retrieved context from localStorage for hash ${textHash.substring(0, 8)}...`)
      return { ...storedContext }
    }

    return null
  }

  /**
   * Clear all cached contexts from localStorage
   */
  clearCache(): void {
    localStorage.removeItem(NANO_CONTEXT_STORAGE_KEY)
  }

  /**
   * Get cache statistics from localStorage
   */
  getCacheStats() {
    try {
      const storedData = localStorage.getItem(NANO_CONTEXT_STORAGE_KEY)
      if (!storedData) {
        return {
          total: 0,
          valid: 0,
          expired: 0,
          generationInProgress: this.generationQueue.size
        }
      }

      const parsedStorage: ContextStorage = JSON.parse(storedData)
      const contexts = parsedStorage.contexts || {}
      const total = Object.keys(contexts).length
      
      // Count valid contexts by checking their age
      let valid = 0
      let expired = 0
      
      Object.values(contexts).forEach((context: any) => {
        try {
          // Handle both compressed and uncompressed formats
          const contextObj: TextContext = {
            ...context,
            timestamp: new Date(context.timestamp),
            lastUsed: new Date(context.lastUsed)
          }
          
          if (this.isCacheValid(contextObj)) {
            valid++
          } else {
            expired++
          }
        } catch (error) {
          // Count invalid contexts as expired
          expired++
        }
      })

      return {
        total,
        valid,
        expired,
        generationInProgress: this.generationQueue.size
      }
    } catch (error) {
      console.warn('NanoContextService: Error getting cache stats:', error)
      return {
        total: 0,
        valid: 0,
        expired: 0,
        generationInProgress: this.generationQueue.size
      }
    }
  }

  /**
   * Perform the actual context generation using AI
   */
  private async performContextGeneration(
    text: string, 
    textHash: string, 
    model: AIModel
  ): Promise<TextContext | null> {
    const stopTiming = performanceMonitor.startTiming(PerformanceConfig.CONTEXT_GENERATION)
    
    try {
      const prompt = this.buildContextGenerationPrompt(text)

      console.log(`Generating context for ${text.length} characters using ${model.name}`)
      
      const response = await aiService.sendToAI(text, prompt, model)

      if (response.error) {
        console.error('AI context generation error:', response.error)
        return null
      }

      // Parse AI response to extract structured context
      const parsedContext = this.parseContextResponse(response.suggestedText, model)
      
      if (!parsedContext) {
        console.warn('Failed to parse AI context response')
        return null
      }

      // Create complete TextContext object
      const context: TextContext = {
        id: `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        textHash,
        description: parsedContext.description,
        tone: parsedContext.tone,
        intent: parsedContext.intent,
        model: response.actualModel || model,
        timestamp: new Date(),
        lastUsed: new Date(),
        usageCount: 0,
        textLength: text.length
      }

      console.log(`Context generated successfully: ${context.description.substring(0, 50)}...`)
      
      stopTiming()
      
      return context

    } catch (error) {
      console.error('Context generation failed:', error)
      
      stopTiming()
      
      return null
    }
  }

  /**
   * Build optimized prompt for context generation
   */
  private buildContextGenerationPrompt(text: string): string {
    return `Analyze the following text and generate a concise context description that will be useful for future AI refinement requests.

Your response should capture:
1. Overall tone and style (formal, casual, technical, creative, etc.)
2. Primary intent or purpose of the text
3. Any notable characteristics that would help with text refinement

Provide your analysis in the following JSON format:
{
  "description": "A comprehensive 80-120 word description that captures the essence, tone, and key points of the text for use in future refinement contexts",
  "tone": "primary tone (formal/casual/technical/creative/persuasive/etc.)",
  "intent": "main purpose or goal of the text"
}

Text to analyze:
"""
${text.trim()}
"""

Respond with only the JSON object, no additional text.`
  }

  /**
   * Parse AI response to extract structured context information
   */
  private parseContextResponse(response: string, _model: AIModel): {
    description: string
    tone: string
    intent: string
  } | null {
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanResponse = response
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()

      const parsed = JSON.parse(cleanResponse)

      // Validate required fields
      if (!parsed.description || !parsed.tone || !parsed.intent) {
        console.warn('AI response missing required fields')
        return null
      }

      return {
        description: String(parsed.description).trim(),
        tone: String(parsed.tone).trim(),
        intent: String(parsed.intent).trim()
      }

    } catch (error) {
      console.warn('Failed to parse context response as JSON, attempting fallback')
      
      // Fallback: try to extract basic information from free text
      return this.extractContextFromFreeText(response)
    }
  }

  /**
   * Fallback method to extract context from free text response
   */
  private extractContextFromFreeText(response: string): {
    description: string
    tone: string
    intent: string
  } | null {
    if (!response || response.length < 20) {
      return null
    }

    // Simple extraction - use the response as description and infer basic properties
    const description = response.trim().substring(0, 150) + (response.length > 150 ? '...' : '')
    
    // Basic tone detection
    let tone = 'neutral'
    if (/formal|professional|academic/i.test(response)) tone = 'formal'
    else if (/casual|informal|friendly/i.test(response)) tone = 'casual'
    else if (/technical|scientific|programming/i.test(response)) tone = 'technical'

    return {
      description,
      tone,
      intent: 'general purpose text'
    }
  }

  /**
   * Check if cached context is still valid (based on config expiry)
   */
  private isCacheValid(context: TextContext): boolean {
    const now = new Date()
    const age = now.getTime() - context.timestamp.getTime()
    return age < this.config.thresholds.contextExpiryMs
  }

  /**
   * Get comprehensive performance and monitoring data
   */
  getMonitoringData() {
    return {
      service: {
        isInitialized: this.isInitialized,
        compatibilityChecked: this.compatibilityChecked,
        config: this.config,
        cacheStats: this.getCacheStats()
      },
      performance: {
        stats: performanceMonitor.getStats(),
        recentMetrics: performanceMonitor.getRecentMetrics(10),
        slowOperations: performanceMonitor.getSlowOperations(),
        memoryStats: performanceMonitor.getMemoryStats()
      },
      browser: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        localStorage: typeof localStorage !== 'undefined',
        performance: typeof performance !== 'undefined'
      }
    }
  }

  /**
   * Generate a comprehensive diagnostic report
   */
  generateDiagnosticReport(): string {
    const data = this.getMonitoringData()
    
    let report = '=== Nano Context Service Diagnostic Report ===\n\n'
    
    // Service status
    report += 'Service Status:\n'
    report += `  Initialized: ${data.service.isInitialized}\n`
    report += `  Compatibility Checked: ${data.service.compatibilityChecked}\n`
    report += `  Enabled: ${data.service.config.enabled}\n`
    report += `  Auto Generate: ${data.service.config.autoGenerate}\n\n`
    
    // Cache statistics
    report += 'Cache Statistics:\n'
    report += `  Total: ${data.service.cacheStats.total}\n`
    report += `  Valid: ${data.service.cacheStats.valid}\n`
    report += `  Expired: ${data.service.cacheStats.expired}\n`
    report += `  Generation in Progress: ${data.service.cacheStats.generationInProgress}\n\n`
    
    // Performance report
    report += performanceMonitor.generateReport()
    
    // Browser info
    report += 'Browser Environment:\n'
    report += `  localStorage Available: ${data.browser.localStorage}\n`
    report += `  Performance API Available: ${data.browser.performance}\n`
    report += `  User Agent: ${data.browser.userAgent}\n\n`
    
    return report
  }

  /**
   * Generate context for large texts using truncation strategy
   * This method directly processes truncated text without recursion
   */
  private async generateContextForLargeText(text: string, model: AIModel): Promise<TextContext | null> {
    try {
      // Smart truncate the text
      const truncatedText = this.smartTruncateText(text, this.config.maxTextLength)
      console.debug(`NanoContextService: Processing large text with truncation (${text.length} -> ${truncatedText.length} chars)`)
      
      // Use the original text hash for caching, but process truncated text
      const originalTextHash = createTextHash(text)
      const cacheKey = `${originalTextHash}-${model.id}`
      
      // Check localStorage for existing context
      const storedContext = this.getContextFromLocalStorage(originalTextHash)
      if (storedContext && this.isCacheValid(storedContext)) {
        // Update usage tracking and save back to localStorage
        storedContext.lastUsed = new Date()
        storedContext.usageCount++
        this.saveContextToLocalStorage(storedContext).catch(error => {
          console.warn('NanoContextService: Failed to update large text context usage in localStorage:', error)
        })
        
        console.debug(`NanoContextService: Using stored context for large text hash ${originalTextHash.substring(0, 8)}...`)
        return { ...storedContext }
      }
      
      // Check if generation is already in progress
      const existingPromise = this.generationQueue.get(cacheKey)
      if (existingPromise) {
        return existingPromise
      }
      
      // Generate context for truncated text directly (no recursion)
      const generationPromise = this.performContextGenerationDirect(truncatedText, originalTextHash, model, text.length)
      this.generationQueue.set(cacheKey, generationPromise)
      
      try {
        const result = await generationPromise
        
        if (result) {
          // Save to localStorage for persistence
          this.saveContextToLocalStorage(result).catch(error => {
            console.warn('NanoContextService: Failed to save large text context to localStorage:', error)
          })
        }
        
        return result
      } finally {
        this.generationQueue.delete(cacheKey)
      }
    } catch (error) {
      console.error('NanoContextService: Large text context generation failed:', error)
      return null
    }
  }

  /**
   * Direct context generation for truncated text (prevents recursion)
   */
  private async performContextGenerationDirect(
    truncatedText: string,
    originalTextHash: string,
    model: AIModel,
    originalTextLength: number
  ): Promise<TextContext | null> {
    const stopTiming = performanceMonitor.startTiming(PerformanceConfig.CONTEXT_GENERATION)
    
    try {
      const prompt = this.buildContextGenerationPrompt(truncatedText)
      console.log(`Generating context for truncated text (${truncatedText.length} chars from ${originalTextLength} original) using ${model.name}`)
      
      const response = await aiService.sendToAI(truncatedText, prompt, model)
      
      if (response.error) {
        console.error('AI context generation error:', response.error)
        return null
      }
      
      const parsedContext = this.parseContextResponse(response.suggestedText, model)
      
      if (!parsedContext) {
        console.warn('Failed to parse AI context response')
        return null
      }
      
      // Create context with original text hash and length
      const context: TextContext = {
        id: `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        textHash: originalTextHash,
        description: parsedContext.description + ' (generated from truncated large text)',
        tone: parsedContext.tone,
        intent: parsedContext.intent,
        model: response.actualModel || model,
        timestamp: new Date(),
        lastUsed: new Date(),
        usageCount: 0,
        textLength: originalTextLength // Use original length
      }
      
      console.log(`Context generated successfully for large text: ${context.description.substring(0, 50)}...`)
      
      stopTiming()
      
      return context
    } catch (error) {
      console.error('Direct context generation failed:', error)
      
      stopTiming()
      
      return null
    }
  }

  /**
   * Smart text truncation that preserves important content
   * Tries to keep the beginning and end of the text for better context
   */
  private smartTruncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    
    // Reserve space for the truncation message
    const truncationMessage = '\n\n[... content truncated ...]\n\n'
    const availableLength = maxLength - truncationMessage.length
    
    if (availableLength <= 0) {
      // If maxLength is too small, just take the beginning
      return text.substring(0, maxLength)
    }
    
    // Take first 60% and last 40% to preserve beginning and ending context
    const startLength = Math.floor(availableLength * 0.6)
    const endLength = Math.floor(availableLength * 0.4)
    
    const startPart = text.substring(0, startLength)
    const endPart = text.substring(text.length - endLength)
    
    return startPart + truncationMessage + endPart
  }

  /**
   * Get context from localStorage by text hash
   * 
   * @param textHash - Hash of the text to find context for
   * @returns Context from localStorage or null
   */
  private getContextFromLocalStorage(textHash: string): TextContext | null {
    try {
      const storedData = localStorage.getItem(NANO_CONTEXT_STORAGE_KEY)
      if (!storedData) return null

      const parsedStorage: ContextStorage = JSON.parse(storedData)
      if (!parsedStorage.contexts) return null

      // Handle uncompressed format only
      const context = parsedStorage.contexts[textHash]
      if (context) {
        // Reconstruct Date objects and validate
        const result: TextContext = {
          ...context,
          timestamp: new Date(context.timestamp),
          lastUsed: new Date(context.lastUsed)
        }
        return result
      }
    } catch (error) {
      console.warn('NanoContextService: Error reading context from localStorage:', error)
    }
    
    return null
  }

  /**
   * Save context to localStorage (fire-and-forget approach)
   * This is a backup mechanism in case the useNanoContext hook isn't being used
   * 
   * @param context - Context to save
   */
  private async saveContextToLocalStorage(context: TextContext): Promise<void> {
    try {
      // This is a simple fire-and-forget save that won't interfere with the main hook
      // It just ensures contexts generated by the service are persisted
      const existingData = localStorage.getItem(NANO_CONTEXT_STORAGE_KEY)
      let storage: ContextStorage
      
      if (existingData) {
        storage = JSON.parse(existingData)
      } else {
        storage = {
          contexts: {},
          metadata: {
            lastCleanup: new Date(),
            totalContexts: 0,
            storageVersion: '1.0.0',
            estimatedSize: 0
          }
        }
      }
      
      // Add the new context
      storage.contexts[context.textHash] = context
      storage.metadata.totalContexts = Object.keys(storage.contexts).length
      storage.metadata.estimatedSize = JSON.stringify(storage.contexts).length
      
      localStorage.setItem(NANO_CONTEXT_STORAGE_KEY, JSON.stringify(storage))
      console.debug(`NanoContextService: Saved context to localStorage for hash ${context.textHash.substring(0, 8)}...`)
    } catch (error) {
      // Don't throw - this is a backup mechanism
      console.debug('NanoContextService: Could not save to localStorage (likely quota exceeded):', error)
    }
  }
}

// Export singleton instance
export const nanoContextService = NanoContextService.getInstance()