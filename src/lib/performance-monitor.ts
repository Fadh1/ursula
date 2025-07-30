/**
 * Performance Monitoring for Nano Context
 * 
 * Provides utilities to monitor and track performance metrics for the nano context
 * system, including similarity calculations, context generation, and storage operations.
 */

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceStats {
  operation: string
  count: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  lastUpdated: number
}

/**
 * Performance monitor singleton for tracking nano context operations
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private stats: Map<string, PerformanceStats> = new Map()
  private readonly MAX_METRICS = 100 // Keep last 100 metrics
  private readonly SLOW_OPERATION_THRESHOLD = 100 // 100ms threshold for slow operations

  /**
   * Start timing an operation
   */
  startTiming(operation: string): () => void {
    const startTime = performance.now()
    
    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime
      this.recordMetric(operation, duration, metadata)
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    }

    // Add to metrics array
    this.metrics.push(metric)
    
    // Keep only recent metrics to prevent memory growth
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // Update aggregated stats
    this.updateStats(operation, duration)

    // Log slow operations
    if (duration > this.SLOW_OPERATION_THRESHOLD) {
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, metadata)
    }
  }

  /**
   * Update aggregated statistics for an operation
   */
  private updateStats(operation: string, duration: number): void {
    const existing = this.stats.get(operation)
    
    if (existing) {
      existing.count += 1
      existing.totalDuration += duration
      existing.averageDuration = existing.totalDuration / existing.count
      existing.minDuration = Math.min(existing.minDuration, duration)
      existing.maxDuration = Math.max(existing.maxDuration, duration)
      existing.lastUpdated = Date.now()
    } else {
      this.stats.set(operation, {
        operation,
        count: 1,
        totalDuration: duration,
        averageDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        lastUpdated: Date.now()
      })
    }
  }

  /**
   * Get performance statistics for all operations
   */
  getStats(): PerformanceStats[] {
    return Array.from(this.stats.values()).sort((a, b) => b.lastUpdated - a.lastUpdated)
  }

  /**
   * Get statistics for a specific operation
   */
  getStatsForOperation(operation: string): PerformanceStats | null {
    return this.stats.get(operation) || null
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 20): PerformanceMetric[] {
    return this.metrics.slice(-count)
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(threshold: number = this.SLOW_OPERATION_THRESHOLD): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.duration > threshold)
  }

  /**
   * Clear all metrics and stats
   */
  clear(): void {
    this.metrics = []
    this.stats.clear()
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const stats = this.getStats()
    const slowOps = this.getSlowOperations()
    
    let report = '=== Nano Context Performance Report ===\n\n'
    
    // Overall statistics
    report += 'Operation Statistics:\n'
    stats.forEach(stat => {
      report += `  ${stat.operation}:\n`
      report += `    Count: ${stat.count}\n`
      report += `    Average: ${stat.averageDuration.toFixed(2)}ms\n`
      report += `    Min/Max: ${stat.minDuration.toFixed(2)}ms / ${stat.maxDuration.toFixed(2)}ms\n`
      report += `    Total: ${stat.totalDuration.toFixed(2)}ms\n\n`
    })
    
    // Slow operations
    if (slowOps.length > 0) {
      report += `Slow Operations (>${this.SLOW_OPERATION_THRESHOLD}ms):\n`
      slowOps.slice(-10).forEach(op => {
        report += `  ${op.operation}: ${op.duration.toFixed(2)}ms`
        if (op.metadata) {
          report += ` (${JSON.stringify(op.metadata)})`
        }
        report += '\n'
      })
    }
    
    return report
  }

  /**
   * Get memory usage statistics for nano context
   */
  getMemoryStats(): Record<string, any> {
    const stats = {
      metricsCount: this.metrics.length,
      statsCount: this.stats.size,
      estimatedMemoryUsage: this.estimateMemoryUsage()
    }

    // Add performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      stats.heapUsed = memory.usedJSHeapSize
      stats.heapTotal = memory.totalJSHeapSize
      stats.heapLimit = memory.jsHeapSizeLimit
    }

    return stats
  }

  /**
   * Estimate memory usage of stored metrics
   */
  private estimateMemoryUsage(): number {
    try {
      return JSON.stringify({
        metrics: this.metrics,
        stats: Array.from(this.stats.entries())
      }).length
    } catch (error) {
      return 0
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Decorator for timing function execution
 */
export function timed(operationName: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!

    descriptor.value = function (...args: any[]) {
      const stopTiming = performanceMonitor.startTiming(operationName)
      
      try {
        const result = originalMethod.apply(this, args)
        
        // Handle async methods
        if (result && typeof result.then === 'function') {
          return result.finally(() => stopTiming())
        } else {
          stopTiming()
          return result
        }
      } catch (error) {
        stopTiming({ error: error.message })
        throw error
      }
    } as T

    return descriptor
  }
}

/**
 * Manual timing utility for functional code
 */
export function timeOperation<T>(
  operationName: string,
  operation: () => T,
  metadata?: Record<string, any>
): T {
  const stopTiming = performanceMonitor.startTiming(operationName)
  
  try {
    const result = operation()
    
    // Handle promises
    if (result && typeof (result as any).then === 'function') {
      (result as any).finally(() => stopTiming(metadata))
    } else {
      stopTiming(metadata)
    }
    
    return result
  } catch (error) {
    stopTiming({ ...metadata, error: error.message })
    throw error
  }
}

/**
 * Performance monitoring configuration
 */
export const PerformanceConfig = {
  JACCARD_SIMILARITY: 'jaccard_similarity',
  CONTEXT_GENERATION: 'context_generation',
  CONTEXT_COMPRESSION: 'context_compression',
  STORAGE_OPERATION: 'storage_operation',
  PROMPT_ENHANCEMENT: 'prompt_enhancement',
  CACHE_OPERATION: 'cache_operation'
} as const

export type PerformanceOperation = typeof PerformanceConfig[keyof typeof PerformanceConfig]