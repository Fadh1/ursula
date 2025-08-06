/**
 * Enhanced Prompt Builder for Nano Context
 * 
 * Provides utilities to merge original prompts with contextual information
 * to create more effective AI refinement requests. Integrates seamlessly
 * with existing prompt generation patterns from ActionPanel and HighlightSidebar.
 * 
 * Includes comprehensive error handling and graceful degradation when context
 * is unavailable or invalid.
 */

import { TextContext, ActionType, ActionOptions } from '@/types/ai-models'

/**
 * Format context information for inclusion in AI prompts
 * Creates a clear, structured representation of the context
 * 
 * @param context - The TextContext object to format
 * @returns Formatted context string for prompt inclusion
 */
export function formatContextForPrompt(context: TextContext): string {
  try {
    if (!context || typeof context !== 'object') {
      console.debug('formatContextForPrompt: No valid context provided')
      return ''
    }

    const parts: string[] = []

    // Add description (main context) - with sanitization
    if (context.description && typeof context.description === 'string') {
      const sanitizedDescription = context.description.trim().replace(/[\r\n\t]+/g, ' ')
      if (sanitizedDescription.length > 0) {
        parts.push(`Context: ${sanitizedDescription}`)
      }
    }

    // Add tone information - with validation
    if (context.tone && typeof context.tone === 'string' && 
        context.tone !== 'neutral' && context.tone !== 'general') {
      const sanitizedTone = context.tone.trim().toLowerCase()
      if (sanitizedTone.length > 0) {
        parts.push(`Tone: ${sanitizedTone}`)
      }
    }

    // Add intent if meaningful - with validation
    if (context.intent && typeof context.intent === 'string' && 
        context.intent !== 'general purpose text') {
      const sanitizedIntent = context.intent.trim()
      if (sanitizedIntent.length > 0) {
        parts.push(`Purpose: ${sanitizedIntent}`)
      }
    }


    return parts.join(' | ')
  } catch (error) {
    console.error('formatContextForPrompt: Error formatting context:', error)
    return ''
  }
}

/**
 * Build a context-aware prompt by merging original prompt with context information
 * Ensures clear separation between the original instruction and contextual background
 * 
 * @param originalPrompt - The base prompt for the AI action
 * @param text - The text being refined
 * @param context - Optional context information about the text
 * @returns Enhanced prompt with context information
 */
export function buildContextAwarePrompt(
  originalPrompt: string,
  _text: string,
  context?: TextContext | null
): string {
  try {
    // Validate inputs
    if (!originalPrompt || typeof originalPrompt !== 'string') {
      console.warn('buildContextAwarePrompt: Invalid original prompt provided')
      return originalPrompt || ''
    }

    // If no context available, return original prompt
    if (!context) {
      console.debug('buildContextAwarePrompt: No context provided, using original prompt')
      return originalPrompt
    }

    // Format context for prompt inclusion
    const formattedContext = formatContextForPrompt(context)
    
    if (!formattedContext || formattedContext.trim().length === 0) {
      console.debug('buildContextAwarePrompt: No valid formatted context, using original prompt')
      return originalPrompt
    }

    // Build enhanced prompt with clear structure
    const enhancedPrompt = `${originalPrompt}

BACKGROUND CONTEXT:
${formattedContext}

Please consider this context when refining the text to maintain consistency with the overall tone, purpose, and key themes.`

    console.debug('buildContextAwarePrompt: Successfully enhanced prompt with context')
    return enhancedPrompt
  } catch (error) {
    console.error('buildContextAwarePrompt: Error building context-aware prompt:', error)
    // Return original prompt on error for graceful degradation
    return originalPrompt || ''
  }
}

/**
 * Generate action-specific prompts with context integration
 * Extends the existing prompt generation patterns from HighlightSidebar
 * 
 * @param action - The type of action being performed
 * @param options - Optional action configuration
 * @param context - Optional context information
 * @returns Context-aware prompt for the specified action
 */
export function generateContextAwareActionPrompt(
  action: ActionType,
  options?: ActionOptions,
  context?: TextContext | null
): string {
  let basePrompt: string

  // Generate base prompt using existing patterns
  switch (action) {
    case 'expand':
      basePrompt = 'Expand this text with more detail, context, and supporting information while maintaining the original meaning.'
      break
    case 'condense':
      basePrompt = 'Condense this text to be more concise while preserving all key points and essential information.'
      break
    case 'reword':
      if (options?.customPrompt) {
        basePrompt = options.customPrompt
      } else if (options?.rewordType === 'tone' && options?.tone) {
        basePrompt = `Rewrite this text in a ${options.tone} tone while maintaining the same information and key points.`
      } else if (options?.rewordType === 'simplify') {
        basePrompt = 'Simplify this text using clearer, more accessible language while maintaining the original meaning.'
      } else if (options?.rewordType === 'engaging') {
        basePrompt = 'Rewrite this text to be more engaging and compelling while keeping the same information.'
      } else if (options?.rewordType === 'audience' && options?.audience) {
        basePrompt = `Adjust this text for a ${options.audience} audience, using appropriate language and level of detail.`
      } else {
        basePrompt = 'Rewrite this text to improve clarity, flow, and readability.'
      }
      break
    default:
      basePrompt = 'Improve this text as appropriate.'
  }

  // Apply context enhancement if available
  return buildContextAwarePrompt(basePrompt, '', context)
}

/**
 * Extract context-relevant information for prompt enhancement
 * Helps identify which aspects of context are most relevant for specific actions
 * 
 * @param context - The context object to analyze
 * @param action - The action being performed
 * @returns Relevant context aspects for the action
 */
export function getRelevantContextForAction(
  context: TextContext | null,
  action: ActionType
): Partial<TextContext> | null {
  if (!context) return null

  const relevant: Partial<TextContext> = {}

  switch (action) {
    case 'expand':
      // For expansion, all context is potentially relevant
      relevant.description = context.description
      relevant.intent = context.intent
      relevant.tone = context.tone
      break

    case 'condense':
      // For condensing, tone and intent help maintain the essence
      relevant.tone = context.tone
      relevant.intent = context.intent
      break

    case 'reword':
      // For rewording, tone and intent are most important
      relevant.tone = context.tone
      relevant.intent = context.intent
      break

    default:
      // Default: include tone and intent
      relevant.tone = context.tone
      relevant.intent = context.intent
  }

  return Object.keys(relevant).length > 0 ? relevant : null
}

/**
 * Create a context summary for prompt inclusion
 * Provides a condensed version of context when full context might be too verbose
 * 
 * @param context - The context to summarize
 * @param maxLength - Maximum length of the summary (default: 100 characters)
 * @returns Condensed context summary
 */
export function createContextSummary(context: TextContext | null, maxLength: number = 100): string {
  if (!context) return ''

  let summary = ''

  // Start with tone if meaningful
  if (context.tone && context.tone !== 'neutral') {
    summary = context.tone
  }

  // Add intent if different from tone
  if (context.intent && !summary.includes(context.intent)) {
    summary = summary ? `${summary}, ${context.intent}` : context.intent
  }


  // Truncate if necessary
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...'
  }

  return summary
}

/**
 * Validate context quality for prompt enhancement
 * Determines if context is high-quality enough to improve prompts
 * 
 * @param context - The context to validate
 * @returns True if context is suitable for prompt enhancement
 */
export function isContextSuitableForPrompts(context: TextContext | null): boolean {
  if (!context) return false

  // Check for meaningful content
  if (!context.description || context.description.length < 20) return false

  // Check for generic/default values that don't add value
  if (context.tone === 'neutral' && 
      context.intent === 'general purpose text') {
    return false
  }

  return true
}

/**
 * Enhanced prompt builder for custom user prompts
 * Integrates context with user-provided custom prompts while preserving user intent
 * 
 * @param userPrompt - User's custom prompt
 * @param context - Available context information
 * @returns Enhanced prompt that combines user intent with context
 */
export function enhanceCustomPrompt(
  userPrompt: string,
  context?: TextContext | null
): string {
  if (!userPrompt || !isContextSuitableForPrompts(context)) {
    return userPrompt
  }

  const contextSummary = createContextSummary(context)
  
  if (!contextSummary) {
    return userPrompt
  }

  // For custom prompts, append context more subtly to preserve user's intent
  return `${userPrompt}

Note: This text has the following characteristics: ${contextSummary}`
}