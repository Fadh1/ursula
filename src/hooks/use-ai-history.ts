import { useState, useEffect, useCallback } from 'react'
import { AIHistoryEntry } from '@/types/ai-models'

const STORAGE_KEY = 'ai_request_history'
const MAX_HISTORY_ITEMS = 50

export function useAIHistory() {
  const [history, setHistory] = useState<AIHistoryEntry[]>([])

  // Load history from localStorage on mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Reconstruct Date objects
          const historyWithDates = parsed.map((entry: AIHistoryEntry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
            response: {
              ...entry.response,
            },
          }))
          setHistory(historyWithDates)
        }
      } catch (error) {
        console.error('Failed to load AI history:', error)
      }
    }

    loadHistory()
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save AI history:', error)
    }
  }, [history])

  const addEntry = useCallback((entry: AIHistoryEntry) => {
    setHistory((prev) => {
      const newHistory = [entry, ...prev]
      // Keep only the most recent MAX_HISTORY_ITEMS
      if (newHistory.length > MAX_HISTORY_ITEMS) {
        return newHistory.slice(0, MAX_HISTORY_ITEMS)
      }
      return newHistory
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const getEntryById = useCallback((id: string) => {
    return history.find((entry) => entry.id === id)
  }, [history])

  const updateEntry = useCallback((id: string, updates: Partial<AIHistoryEntry>) => {
    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      )
    )
  }, [])

  return {
    history,
    addEntry,
    clearHistory,
    getEntryById,
    updateEntry,
  }
}