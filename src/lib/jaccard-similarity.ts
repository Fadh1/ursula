/**
 * Jaccard Similarity Utilities for Nano Context
 * 
 * Provides functions to calculate text similarity using Jaccard coefficient
 * for detecting meaningful text changes in the editor.
 * 
 * Includes performance monitoring and optimization for large text processing.
 */

// Common English stop words to filter out for better similarity calculation
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'would', 'could', 'should', 'can',
  'have', 'had', 'this', 'these', 'they', 'them', 'their', 'there',
  'where', 'when', 'what', 'who', 'why', 'how', 'do', 'does', 'did',
  'been', 'being', 'but', 'or', 'not', 'no', 'yes', 'if', 'then'
])

/**
 * Normalizes text for consistent processing
 * - Converts to lowercase
 * - Removes extra whitespace
 * - Removes special characters except basic punctuation
 * - Preserves word boundaries
 */
export function normalizeText(text: string): string {
  if (typeof text !== 'string') return ''
  
  return text
    .toLowerCase()
    .trim()
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Remove special characters but keep basic punctuation that affects meaning
    .replace(/[^\w\s.,!?;:'-]/g, ' ')
    // Clean up any extra spaces created by special character removal
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tokenizes text into a set of unique words
 * - Normalizes the text first
 * - Splits by whitespace and punctuation
 * - Removes stop words for better semantic comparison
 * - Filters out very short words (< 2 characters)
 * - Optimized for large texts with sampling when needed
 */
export function tokenizeText(text: string): Set<string> {
  const normalized = normalizeText(text)
  
  if (!normalized) return new Set()
  
  // For very large texts, use sampling to improve performance
  const shouldSample = normalized.length > 10000 // 10KB threshold
  let textToProcess = normalized
  
  if (shouldSample) {
    // Sample every nth word to reduce processing time for very large texts
    const sampleRate = Math.max(1, Math.floor(normalized.length / 5000)) // Target ~5KB of text
    const words = normalized.split(/[\s.,!?;:'"()-]+/)
    const sampledWords = words.filter((_, index) => index % sampleRate === 0)
    textToProcess = sampledWords.join(' ')
    console.debug(`tokenizeText: Sampling large text (${normalized.length} -> ${textToProcess.length} chars)`)
  }
  
  // Split by whitespace and common punctuation
  const words = textToProcess
    .split(/[\s.,!?;:'"()-]+/)
    .filter(word => 
      word.length >= 2 && // Filter out very short words
      !STOP_WORDS.has(word) && // Remove stop words
      /\w/.test(word) // Must contain at least one word character
    )
  
  return new Set(words)
}

/**
 * Calculates Jaccard similarity coefficient between two texts
 * 
 * The Jaccard similarity is defined as:
 * J(A,B) = |A ∩ B| / |A ∪ B|
 * 
 * Where A and B are sets of tokens from each text.
 * 
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @returns Similarity coefficient between 0 and 1
 *          - 1.0 = identical texts (after normalization)
 *          - 0.0 = completely different texts
 *          - Values closer to 1.0 indicate higher similarity
 */
export function calculateJaccardSimilarity(text1: string, text2: string): number {
  const startTime = performance.now()
  
  try {
    // Handle edge cases
    if (typeof text1 !== 'string' || typeof text2 !== 'string') {
      console.warn('calculateJaccardSimilarity: Invalid input types')
      return 0
    }
    
    if (text1 === text2) return 1.0
    
    // Performance check for very large texts
    const totalLength = text1.length + text2.length
    if (totalLength > 50000) { // More than 50KB of text
      console.warn(`calculateJaccardSimilarity: Processing large text (${totalLength} chars)`)
    }
    
    const tokens1 = tokenizeText(text1)
    const tokens2 = tokenizeText(text2)
    
    // Handle empty texts
    if (tokens1.size === 0 && tokens2.size === 0) return 1.0
    if (tokens1.size === 0 || tokens2.size === 0) return 0.0
    
    // Calculate intersection (common tokens)
    const intersection = new Set([...tokens1].filter(token => tokens2.has(token)))
    
    // Calculate union (all unique tokens)
    const union = new Set([...tokens1, ...tokens2])
    
    // Jaccard coefficient: |intersection| / |union|
    const similarity = intersection.size / union.size
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Log performance for large texts or slow calculations
    if (duration > 100 || totalLength > 10000) {
      console.debug(`calculateJaccardSimilarity: ${duration.toFixed(2)}ms for ${totalLength} chars (similarity: ${similarity.toFixed(3)})`)
    }
    
    return similarity
  } catch (error) {
    console.error('calculateJaccardSimilarity: Error calculating similarity:', error)
    return 0 // Return 0 similarity on error for safe fallback
  }
}

/**
 * Determines if two texts are significantly different based on similarity threshold
 * 
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @param threshold Similarity threshold (default: 0.8)
 * @returns true if texts are significantly different (similarity < threshold)
 */
export function isSignificantChange(text1: string, text2: string, threshold: number = 0.8): boolean {
  const similarity = calculateJaccardSimilarity(text1, text2)
  return similarity < threshold
}

/**
 * Creates a hash of text content for quick comparison and storage keys
 * Uses a simple hash function suitable for text content identification
 * 
 * @param text Text to hash
 * @returns Hash string for the text
 */
export function createTextHash(text: string): string {
  if (!text) return ''
  
  const normalized = normalizeText(text)
  let hash = 0
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}