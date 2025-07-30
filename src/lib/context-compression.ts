/**
 * Context Storage Compression Utilities
 * 
 * Provides efficient compression and decompression for TextContext objects
 * to reduce localStorage usage while maintaining data integrity.
 */

import { TextContext } from '@/types/ai-models'

/**
 * Compressed context format for efficient storage
 */
interface CompressedContext {
  /** Compressed data version */
  v: number
  /** Text hash (shortened) */
  h: string
  /** Description (truncated if too long) */
  d: string
  /** Tone (abbreviated) */
  t: string
  /** Intent (abbreviated) */
  i: string
  /** Key arguments (top 3 only) */
  a: string[]
  /** Model ID only */
  m: string
  /** Timestamps as numbers */
  ts: number
  lu: number
  /** Usage count */
  u: number
  /** Confidence (rounded to 2 decimals) */
  c: number
  /** Text length */
  l: number
}

/**
 * Tone abbreviation mapping for compression
 */
const TONE_ABBREVIATIONS = new Map([
  ['formal', 'f'],
  ['casual', 'c'],
  ['technical', 't'],
  ['creative', 'cr'],
  ['persuasive', 'p'],
  ['academic', 'a'],
  ['professional', 'pr'],
  ['friendly', 'fr'],
  ['neutral', 'n'],
  ['conversational', 'co']
])

const TONE_EXPANSIONS = new Map(
  Array.from(TONE_ABBREVIATIONS, ([full, abbr]) => [abbr, full])
)

/**
 * Intent abbreviation mapping for compression
 */
const INTENT_ABBREVIATIONS = new Map([
  ['general purpose text', 'g'],
  ['documentation', 'd'],
  ['explanation', 'e'],
  ['instruction', 'i'],
  ['description', 'de'],
  ['analysis', 'a'],
  ['summary', 's'],
  ['proposal', 'p'],
  ['report', 'r'],
  ['email', 'em'],
  ['article', 'ar'],
  ['blog post', 'b']
])

const INTENT_EXPANSIONS = new Map(
  Array.from(INTENT_ABBREVIATIONS, ([full, abbr]) => [abbr, full])
)

/**
 * Compress a TextContext object for efficient storage
 */
export function compressContext(context: TextContext): CompressedContext {
  try {
    return {
      v: 1, // Version for future migration
      h: context.textHash.substring(0, 12), // Truncate hash to save space
      d: truncateDescription(context.description),
      t: TONE_ABBREVIATIONS.get(context.tone) || context.tone.substring(0, 3),
      i: INTENT_ABBREVIATIONS.get(context.intent) || context.intent.substring(0, 3),
      a: context.keyArguments.slice(0, 3).map(arg => arg.substring(0, 30)), // Limit argument length
      m: context.model.id,
      ts: context.timestamp.getTime(),
      lu: context.lastUsed.getTime(),
      u: context.usageCount,
      c: Math.round(context.confidence * 100) / 100, // Round to 2 decimals
      l: context.textLength
    }
  } catch (error) {
    console.error('compressContext: Error compressing context:', error)
    throw error
  }
}

/**
 * Decompress a compressed context back to full TextContext
 */
export function decompressContext(compressed: CompressedContext, fullTextHash: string): TextContext {
  try {
    return {
      id: `ctx-${compressed.ts}-${compressed.h}`, // Reconstructed ID
      textHash: fullTextHash, // Use full hash provided
      description: compressed.d,
      tone: TONE_EXPANSIONS.get(compressed.t) || compressed.t,
      intent: INTENT_EXPANSIONS.get(compressed.i) || compressed.i,
      keyArguments: compressed.a || [],
      model: { id: compressed.m } as any, // Minimal model object
      timestamp: new Date(compressed.ts),
      lastUsed: new Date(compressed.lu),
      usageCount: compressed.u,
      confidence: compressed.c,
      textLength: compressed.l
    }
  } catch (error) {
    console.error('decompressContext: Error decompressing context:', error)
    throw error
  }
}

/**
 * Intelligently truncate description while preserving key information
 */
function truncateDescription(description: string): string {
  if (description.length <= 150) return description
  
  // Find the last complete sentence within 150 characters
  const truncated = description.substring(0, 150)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )
  
  if (lastSentenceEnd > 100) {
    return truncated.substring(0, lastSentenceEnd + 1)
  }
  
  // If no sentence boundary found, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 100) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  // Fallback: hard truncate
  return truncated + '...'
}

/**
 * Calculate compression ratio for analytics
 */
export function calculateCompressionRatio(original: TextContext, compressed: CompressedContext): number {
  try {
    const originalSize = JSON.stringify(original).length
    const compressedSize = JSON.stringify(compressed).length
    return compressedSize / originalSize
  } catch (error) {
    console.error('calculateCompressionRatio: Error calculating ratio:', error)
    return 1 // No compression on error
  }
}

/**
 * Batch compress multiple contexts
 */
export function compressContextBatch(contexts: Record<string, TextContext>): Record<string, CompressedContext> {
  const compressed: Record<string, CompressedContext> = {}
  let totalOriginalSize = 0
  let totalCompressedSize = 0
  
  for (const [key, context] of Object.entries(contexts)) {
    try {
      const originalSize = JSON.stringify(context).length
      const compressedContext = compressContext(context)
      const compressedSize = JSON.stringify(compressedContext).length
      
      compressed[key] = compressedContext
      totalOriginalSize += originalSize
      totalCompressedSize += compressedSize
    } catch (error) {
      console.error(`compressContextBatch: Failed to compress context ${key}:`, error)
      // Skip this context on error
    }
  }
  
  const ratio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1
  console.debug(`compressContextBatch: Compressed ${Object.keys(compressed).length} contexts, ratio: ${(ratio * 100).toFixed(1)}%`)
  
  return compressed
}

/**
 * Batch decompress multiple contexts
 */
export function decompressContextBatch(
  compressed: Record<string, CompressedContext>, 
  textHashMapping: Record<string, string>
): Record<string, TextContext> {
  const decompressed: Record<string, TextContext> = {}
  
  for (const [key, compressedContext] of Object.entries(compressed)) {
    try {
      const fullTextHash = textHashMapping[key] || key
      decompressed[key] = decompressContext(compressedContext, fullTextHash)
    } catch (error) {
      console.error(`decompressContextBatch: Failed to decompress context ${key}:`, error)
      // Skip this context on error
    }
  }
  
  console.debug(`decompressContextBatch: Decompressed ${Object.keys(decompressed).length} contexts`)
  return decompressed
}