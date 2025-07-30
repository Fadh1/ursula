import { ActionType, ActionRecommendation, AIModel } from '@/types/ai-models'
import { aiService } from './ai-service'

export class SmartSuggestionsService {
  private static instance: SmartSuggestionsService
  private cache = new Map<string, ActionRecommendation>()
  private readonly CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

  static getInstance(): SmartSuggestionsService {
    if (!this.instance) {
      this.instance = new SmartSuggestionsService()
    }
    return this.instance
  }

  private generateCacheKey(text: string): string {
    // Simple hash function for caching
    return btoa(text).slice(0, 16)
  }

  private analyzeTextCharacteristics(text: string): {
    wordCount: number
    sentenceCount: number
    avgWordsPerSentence: number
    hasComplexWords: boolean
    hasTechnicalTerms: boolean
    isVague: boolean
    hasRedundancy: boolean
  } {
    const words = text.split(/\s+/).filter(word => word.length > 0)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    const wordCount = words.length
    const sentenceCount = sentences.length
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1)
    
    // Detect complex words (> 3 syllables or > 10 characters)
    const complexWords = words.filter(word => 
      word.length > 10 || (word.match(/[aeiouAEIOU]/g) || []).length > 3
    )
    const hasComplexWords = complexWords.length / wordCount > 0.15
    
    // Simple technical terms detection
    const technicalPattern = /\b(API|HTTP|JSON|SQL|algorithm|framework|implementation|architecture|optimization)\b/i
    const hasTechnicalTerms = technicalPattern.test(text)
    
    // Detect vague language
    const vaguePhrases = /\b(maybe|perhaps|possibly|kind of|sort of|somewhat|rather|quite|fairly)\b/i
    const isVague = vaguePhrases.test(text)
    
    // Detect redundancy patterns
    const redundancyPattern = /\b(\w+)\s+(?:\w+\s+){0,3}\1\b/i
    const hasRedundancy = redundancyPattern.test(text) || text.includes('very very') || text.includes('really really')
    
    return {
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      hasComplexWords,
      hasTechnicalTerms,
      isVague,
      hasRedundancy
    }
  }

  private generateRuleBasedRecommendation(text: string): ActionRecommendation {
    const analysis = this.analyzeTextCharacteristics(text)
    
    // Rule-based recommendation logic
    if (analysis.wordCount > 100 && analysis.hasRedundancy) {
      return {
        suggested: 'reword',
        confidence: 0.8,
        reason: 'Text appears verbose with potential redundancy',
        alternatives: ['expand', 'verify']
      }
    }
    
    if (analysis.wordCount < 20 && !analysis.isVague) {
      return {
        suggested: 'expand',
        confidence: 0.75,
        reason: 'Short text could benefit from more detail',
        alternatives: ['verify', 'reword']
      }
    }
    
    if (analysis.hasComplexWords && !analysis.hasTechnicalTerms) {
      return {
        suggested: 'reword',
        confidence: 0.7,
        reason: 'Complex language could be simplified',
        alternatives: ['verify', 'expand']
      }
    }
    
    if (analysis.isVague || analysis.avgWordsPerSentence > 25) {
      return {
        suggested: 'reword',
        confidence: 0.65,
        reason: 'Text could be clearer and more concise',
        alternatives: ['verify', 'expand']
      }
    }
    
    if (analysis.hasTechnicalTerms || text.includes('research') || text.includes('study')) {
      return {
        suggested: 'verify',
        confidence: 0.6,
        reason: 'Technical or factual content should be verified',
        alternatives: ['expand', 'reword']
      }
    }
    
    // Default recommendation
    return {
      suggested: 'expand',
      confidence: 0.4,
      reason: 'Consider adding more context or detail',
      alternatives: ['verify', 'reword']
    }
  }

  async analyzeText(text: string, model?: AIModel): Promise<ActionRecommendation> {
    if (!text.trim()) {
      return {
        suggested: 'expand',
        confidence: 0.3,
        reason: 'Empty text needs content',
        alternatives: ['verify', 'reword']
      }
    }

    const cacheKey = this.generateCacheKey(text)
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    // Try AI-powered analysis if model is available
    if (model && text.length > 10) {
      try {
        const aiRecommendation = await this.getAIRecommendation(text, model)
        if (aiRecommendation) {
          this.cache.set(cacheKey, aiRecommendation)
          // Clear cache after expiry
          setTimeout(() => this.cache.delete(cacheKey), this.CACHE_EXPIRY)
          return aiRecommendation
        }
      } catch (error) {
        console.warn('AI recommendation failed, falling back to rule-based analysis:', error)
      }
    }

    // Fallback to rule-based analysis
    const recommendation = this.generateRuleBasedRecommendation(text)
    this.cache.set(cacheKey, recommendation)
    setTimeout(() => this.cache.delete(cacheKey), this.CACHE_EXPIRY)
    
    return recommendation
  }

  private async getAIRecommendation(text: string, model: AIModel): Promise<ActionRecommendation | null> {
    const prompt = `Analyze this text and recommend the best action: verify (check accuracy), expand (add detail), or reword (improve clarity/style). 

Text: "${text}"

Respond with JSON only:
{
  "suggested": "verify|expand|reword",
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "alternatives": ["action1", "action2"]
}`

    try {
      const response = await aiService.sendToAI(text, prompt, model)
      
      if (response.error) {
        return null
      }

      // Try to parse AI response as JSON
      const cleanResponse = response.suggestedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleanResponse)
      
      // Validate the response structure
      if (
        parsed.suggested && 
        ['verify', 'expand', 'reword'].includes(parsed.suggested) &&
        typeof parsed.confidence === 'number' &&
        typeof parsed.reason === 'string' &&
        Array.isArray(parsed.alternatives)
      ) {
        return {
          suggested: parsed.suggested as ActionType,
          confidence: Math.max(0, Math.min(1, parsed.confidence)),
          reason: parsed.reason,
          alternatives: parsed.alternatives.filter((alt: string) => 
            ['verify', 'expand', 'reword'].includes(alt)
          ) as ActionType[]
        }
      }
    } catch (error) {
      console.warn('Failed to parse AI recommendation:', error)
    }

    return null
  }

  getConfidence(recommendation: ActionRecommendation): 'high' | 'medium' | 'low' {
    if (recommendation.confidence >= 0.7) return 'high'
    if (recommendation.confidence >= 0.5) return 'medium'
    return 'low'
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const smartSuggestionsService = SmartSuggestionsService.getInstance()