/**
 * Browser Compatibility Checks for Nano Context
 * 
 * Provides utilities to check for required browser features and localStorage
 * capabilities needed for the nano context system to function properly.
 */

/**
 * Check if localStorage is available and functional
 */
export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }

    // Test storage functionality
    const testKey = '__nano_context_test__'
    const testValue = 'test'
    
    localStorage.setItem(testKey, testValue)
    const retrieved = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    
    return retrieved === testValue
  } catch (error) {
    console.warn('localStorage is not available:', error)
    return false
  }
}

/**
 * Check if required JavaScript features are available
 */
export function areRequiredFeaturesAvailable(): boolean {
  try {
    // Check for Map support
    if (typeof Map === 'undefined') {
      console.warn('Map is not supported in this browser')
      return false
    }

    // Check for Set support
    if (typeof Set === 'undefined') {
      console.warn('Set is not supported in this browser')
      return false
    }

    // Check for Promise support
    if (typeof Promise === 'undefined') {
      console.warn('Promise is not supported in this browser')
      return false
    }

    // Check for JSON support
    if (typeof JSON === 'undefined' || !JSON.parse || !JSON.stringify) {
      console.warn('JSON is not supported in this browser')
      return false
    }

    // Check for Array methods
    if (!Array.prototype.filter || !Array.prototype.map || !Array.prototype.reduce) {
      console.warn('Required Array methods are not supported in this browser')
      return false
    }

    // Check for setTimeout/clearTimeout
    if (typeof setTimeout === 'undefined' || typeof clearTimeout === 'undefined') {
      console.warn('Timer functions are not supported in this browser')
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking browser features:', error)
    return false
  }
}

/**
 * Get localStorage quota information
 */
export function getLocalStorageQuota(): { used: number; available: number; total: number } | null {
  try {
    if (!isLocalStorageAvailable()) {
      return null
    }

    // Estimate used storage
    let used = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length
      }
    }

    // Try to estimate total quota by attempting to store data
    let total = used
    const testKey = '__quota_test__'
    const chunkSize = 1024 // 1KB chunks
    
    try {
      while (total < 10 * 1024 * 1024) { // Test up to 10MB
        const testData = 'x'.repeat(chunkSize)
        localStorage.setItem(testKey, testData)
        localStorage.removeItem(testKey)
        total += chunkSize
      }
    } catch (error) {
      // Hit quota limit
    }

    return {
      used,
      available: total - used,
      total
    }
  } catch (error) {
    console.error('Error checking localStorage quota:', error)
    return null
  }
}

/**
 * Comprehensive browser compatibility check for nano context
 */
export function checkNanoContextCompatibility(): {
  compatible: boolean
  issues: string[]
  warnings: string[]
  storageInfo: ReturnType<typeof getLocalStorageQuota>
} {
  const issues: string[] = []
  const warnings: string[] = []

  // Check localStorage
  if (!isLocalStorageAvailable()) {
    issues.push('localStorage is not available or functional')
  }

  // Check required JavaScript features
  if (!areRequiredFeaturesAvailable()) {
    issues.push('Required JavaScript features are not supported')
  }

  // Check storage quota
  const storageInfo = getLocalStorageQuota()
  if (storageInfo && storageInfo.available < 100 * 1024) { // Less than 100KB available
    warnings.push('Low localStorage space available (less than 100KB)')
  }

  // Check for HTTPS in production (recommended for localStorage persistence)
  if (typeof window !== 'undefined' && 
      window.location.protocol === 'http:' && 
      !window.location.hostname.includes('localhost')) {
    warnings.push('HTTPS recommended for better localStorage persistence')
  }

  return {
    compatible: issues.length === 0,
    issues,
    warnings,
    storageInfo
  }
}

/**
 * Initialize nano context with compatibility checks
 */
export function initializeNanoContextWithChecks(): boolean {
  const compatibility = checkNanoContextCompatibility()
  
  if (!compatibility.compatible) {
    console.error('Nano Context cannot be initialized due to compatibility issues:', compatibility.issues)
    return false
  }

  if (compatibility.warnings.length > 0) {
    console.warn('Nano Context initialized with warnings:', compatibility.warnings)
  }

  console.log('Nano Context compatibility check passed')
  if (compatibility.storageInfo) {
    console.log(`localStorage info: ${(compatibility.storageInfo.used / 1024).toFixed(1)}KB used, ${(compatibility.storageInfo.available / 1024).toFixed(1)}KB available`)
  }

  return true
}