import { useState, useEffect, useCallback } from 'react'
import { 
  TextContext, 
  ContextStorage, 
  NanoContextConfig,
  DEFAULT_NANO_CONTEXT_CONFIG,
  NANO_CONTEXT_STORAGE_KEY,
  NANO_CONTEXT_CONFIG_KEY
} from '@/types/ai-models'
import { compressContextBatch, decompressContextBatch } from '@/lib/context-compression'
import { PerformanceConfig, timeOperation } from '@/lib/performance-monitor'

const STORAGE_VERSION = '1.0.0'

/**
 * React hook for managing nano context storage and retrieval
 * Provides localStorage persistence with LRU eviction and error handling
 * Following patterns from useAIHistory hook
 */
export function useNanoContext() {
  const [contexts, setContexts] = useState<Record<string, TextContext>>({})
  const [config, setConfig] = useState<NanoContextConfig>(DEFAULT_NANO_CONTEXT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)
  const [storageMetadata, setStorageMetadata] = useState({
    lastCleanup: new Date(),
    totalContexts: 0,
    storageVersion: STORAGE_VERSION,
    estimatedSize: 0
  })

  // Load contexts and config from localStorage on mount
  useEffect(() => {
    const loadStorage = () => {
      try {
        // Load configuration
        const storedConfig = localStorage.getItem(NANO_CONTEXT_CONFIG_KEY)
        if (storedConfig) {
          const parsedConfig = JSON.parse(storedConfig)
          setConfig({ ...DEFAULT_NANO_CONTEXT_CONFIG, ...parsedConfig })
        }

        // Load contexts
        const storedContexts = localStorage.getItem(NANO_CONTEXT_STORAGE_KEY)
        if (storedContexts) {
          const parsedStorage: ContextStorage = JSON.parse(storedContexts)
          
          // Validate storage version and structure
          if (parsedStorage.metadata?.storageVersion === STORAGE_VERSION) {
            // Check if data is compressed
            const isCompressed = parsedStorage.metadata?.compressed === true
            const contextsWithDates: Record<string, TextContext> = {}
            
            if (isCompressed) {
              // Decompress contexts
              timeOperation(
                PerformanceConfig.STORAGE_OPERATION,
                () => {
                  // Create text hash mapping for decompression
                  const textHashMapping: Record<string, string> = {}
                  Object.keys(parsedStorage.contexts || {}).forEach(key => {
                    textHashMapping[key] = key // Use key as full hash for now
                  })
                  
                  const decompressed = decompressContextBatch(parsedStorage.contexts as any, textHashMapping)
                  
                  // Reconstruct Date objects
                  Object.entries(decompressed).forEach(([key, context]) => {
                    contextsWithDates[key] = {
                      ...context,
                      timestamp: new Date(context.timestamp),
                      lastUsed: new Date(context.lastUsed),
                    }
                  })
                  
                  console.debug(`Loaded ${Object.keys(contextsWithDates).length} compressed contexts`)
                },
                { contextCount: Object.keys(parsedStorage.contexts || {}).length, compressed: true }
              )
            } else {
              // Legacy uncompressed format
              Object.entries(parsedStorage.contexts || {}).forEach(([key, context]) => {
                contextsWithDates[key] = {
                  ...context,
                  timestamp: new Date(context.timestamp),
                  lastUsed: new Date(context.lastUsed),
                }
              })
              console.debug(`Loaded ${Object.keys(contextsWithDates).length} uncompressed contexts`)
            }
            
            setContexts(contextsWithDates)
            setStorageMetadata({
              ...parsedStorage.metadata,
              lastCleanup: new Date(parsedStorage.metadata.lastCleanup)
            })
          } else {
            console.warn('Nano context storage version mismatch, resetting storage')
            localStorage.removeItem(NANO_CONTEXT_STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error('Failed to load nano context storage:', error)
        // Clear corrupted storage
        localStorage.removeItem(NANO_CONTEXT_STORAGE_KEY)
      } finally {
        setIsLoaded(true)
      }
    }

    loadStorage()
  }, [])

  // Save contexts to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return // Don't save during initial load

    timeOperation(
      PerformanceConfig.STORAGE_OPERATION,
      () => {
        try {
          // Compress contexts for efficient storage
          const compressedContexts = compressContextBatch(contexts)
          
          const storage: ContextStorage = {
            contexts: compressedContexts as any, // Store compressed format
            metadata: {
              ...storageMetadata,
              totalContexts: Object.keys(contexts).length,
              estimatedSize: JSON.stringify(compressedContexts).length,
              compressed: true // Flag to indicate compression
            }
          }

          localStorage.setItem(NANO_CONTEXT_STORAGE_KEY, JSON.stringify(storage))
          
          console.debug(`Saved ${Object.keys(contexts).length} contexts (compressed: ${JSON.stringify(compressedContexts).length} bytes)`)
        } catch (error) {
          console.error('Failed to save nano context storage:', error)
          
          // Handle quota exceeded error
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('Storage quota exceeded, triggering emergency cleanup')
            // Trigger emergency cleanup by reducing contexts
            const contextEntries = Object.entries(contexts)
            if (contextEntries.length > 0) {
              // Sort by lastUsed (oldest first) then by usageCount (least used first)
              const sortedEntries = contextEntries.sort((a, b) => {
                const dateCompare = a[1].lastUsed.getTime() - b[1].lastUsed.getTime()
                if (dateCompare !== 0) return dateCompare
                return a[1].usageCount - b[1].usageCount
              })
              
              // Keep only the most recent half
              const keepCount = Math.floor(sortedEntries.length / 2)
              const contextsToKeep = sortedEntries.slice(-keepCount)
              
              const newContexts: Record<string, TextContext> = {}
              contextsToKeep.forEach(([key, context]) => {
                newContexts[key] = context
              })
              
              // This will trigger a re-save with fewer contexts
              setContexts(newContexts)
              console.log(`Emergency cleanup: removed ${sortedEntries.length - keepCount} contexts`)
            }
          }
        }
      },
      { contextCount: Object.keys(contexts).length }
    )
  }, [contexts, isLoaded])

  // Save config whenever it changes
  useEffect(() => {
    if (!isLoaded) return
    
    try {
      localStorage.setItem(NANO_CONTEXT_CONFIG_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save nano context config:', error)
    }
  }, [config, isLoaded])

  /**
   * Emergency cleanup when storage quota is exceeded
   * Removes oldest and least used contexts
   */
  const performEmergencyCleanup = useCallback(() => {
    const contextEntries = Object.entries(contexts)
    
    // Sort by lastUsed (oldest first) then by usageCount (least used first)
    const sortedEntries = contextEntries.sort((a, b) => {
      const dateCompare = a[1].lastUsed.getTime() - b[1].lastUsed.getTime()
      if (dateCompare !== 0) return dateCompare
      return a[1].usageCount - b[1].usageCount
    })
    
    // Keep only the most recent half
    const keepCount = Math.floor(sortedEntries.length / 2)
    const contextsToKeep = sortedEntries.slice(-keepCount)
    
    const newContexts: Record<string, TextContext> = {}
    contextsToKeep.forEach(([key, context]) => {
      newContexts[key] = context
    })
    
    setContexts(newContexts)
    console.log(`Emergency cleanup: removed ${sortedEntries.length - keepCount} contexts`)
  }, [contexts])

  /**
   * Add a new context to storage
   */
  const addContext = useCallback((context: TextContext) => {
    setContexts(prev => {
      const newContexts = { ...prev }
      newContexts[context.textHash] = {
        ...context,
        lastUsed: new Date(),
        usageCount: 0
      }
      
      // Check if we need to cleanup old contexts
      if (Object.keys(newContexts).length > config.thresholds.maxContexts) {
        // Remove oldest contexts using LRU strategy
        const entries = Object.entries(newContexts)
        const sortedEntries = entries.sort((a, b) => {
          const dateCompare = a[1].lastUsed.getTime() - b[1].lastUsed.getTime()
          if (dateCompare !== 0) return dateCompare
          return a[1].usageCount - b[1].usageCount
        })
        
        // Keep only maxContexts number of most recent contexts
        const contextsToKeep = sortedEntries.slice(-config.thresholds.maxContexts)
        const cleanedContexts: Record<string, TextContext> = {}
        contextsToKeep.forEach(([key, context]) => {
          cleanedContexts[key] = context
        })
        
        return cleanedContexts
      }
      
      return newContexts
    })
  }, [config.thresholds.maxContexts])

  /**
   * Get a context by text hash
   */
  const getContext = useCallback((textHash: string): TextContext | null => {
    const context = contexts[textHash]
    if (!context) return null
    
    // Update lastUsed and usageCount
    setContexts(prev => ({
      ...prev,
      [textHash]: {
        ...context,
        lastUsed: new Date(),
        usageCount: context.usageCount + 1
      }
    }))
    
    return context
  }, [contexts])

  /**
   * Update an existing context
   */
  const updateContext = useCallback((textHash: string, updates: Partial<TextContext>) => {
    setContexts(prev => {
      if (!prev[textHash]) return prev
      
      return {
        ...prev,
        [textHash]: {
          ...prev[textHash],
          ...updates,
          lastUsed: new Date()
        }
      }
    })
  }, [])

  /**
   * Remove a specific context
   */
  const removeContext = useCallback((textHash: string) => {
    setContexts(prev => {
      const newContexts = { ...prev }
      delete newContexts[textHash]
      return newContexts
    })
  }, [])

  /**
   * Clear expired contexts based on configuration
   */
  const clearExpiredContexts = useCallback(() => {
    const now = new Date()
    const expiryTime = config.thresholds.contextExpiryMs
    
    setContexts(prev => {
      const newContexts: Record<string, TextContext> = {}
      let removedCount = 0
      
      Object.entries(prev).forEach(([key, context]) => {
        const ageMs = now.getTime() - context.timestamp.getTime()
        if (ageMs < expiryTime) {
          newContexts[key] = context
        } else {
          removedCount++
        }
      })
      
      if (removedCount > 0) {
        console.log(`Cleared ${removedCount} expired contexts`)
      }
      
      return newContexts
    })
    
    setStorageMetadata(prev => ({
      ...prev,
      lastCleanup: now
    }))
  }, [config.thresholds.contextExpiryMs])

  /**
   * Clear all contexts
   */
  const clearAllContexts = useCallback(() => {
    setContexts({})
    localStorage.removeItem(NANO_CONTEXT_STORAGE_KEY)
  }, [])

  /**
   * Update configuration
   */
  const updateConfig = useCallback((updates: Partial<NanoContextConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  /**
   * Get storage statistics
   */
  const getStorageStats = useCallback(() => {
    const contextCount = Object.keys(contexts).length
    const totalSize = JSON.stringify(contexts).length
    const oldestContext = Object.values(contexts).reduce((oldest, context) => 
      !oldest || context.timestamp < oldest.timestamp ? context : oldest, null as TextContext | null)
    const newestContext = Object.values(contexts).reduce((newest, context) => 
      !newest || context.timestamp > newest.timestamp ? context : newest, null as TextContext | null)
    
    // Calculate current storage metadata dynamically
    const currentStorageMetadata = {
      ...storageMetadata,
      totalContexts: contextCount,
      estimatedSize: totalSize
    }
    
    return {
      contextCount,
      totalSize,
      estimatedMemoryUsage: `${(totalSize / 1024).toFixed(1)} KB`,
      oldestContext: oldestContext?.timestamp,
      newestContext: newestContext?.timestamp,
      storageMetadata: currentStorageMetadata
    }
  }, [contexts, storageMetadata])

  // Auto-cleanup expired contexts periodically
  useEffect(() => {
    if (!isLoaded) return
    
    const interval = setInterval(() => {
      const now = new Date()
      const timeSinceLastCleanup = now.getTime() - storageMetadata.lastCleanup.getTime()
      
      // Run cleanup every 24 hours
      if (timeSinceLastCleanup > 24 * 60 * 60 * 1000) {
        clearExpiredContexts()
      }
    }, 60 * 60 * 1000) // Check every hour
    
    return () => clearInterval(interval)
  }, [isLoaded, storageMetadata.lastCleanup, clearExpiredContexts])

  return {
    // Context management
    contexts,
    addContext,
    getContext,
    updateContext,
    removeContext,
    clearExpiredContexts,
    clearAllContexts,
    
    // Configuration
    config,
    updateConfig,
    
    // Metadata and statistics
    isLoaded,
    storageMetadata,
    getStorageStats,
    
    // Utilities
    performEmergencyCleanup
  }
}