import { useState, useMemo } from 'react'

export function useSecurityAlerts(entries) {
  const [isFilterActive, setIsFilterActive] = useState(false)

  const alertCount = useMemo(() => {
    return entries.filter(e => e.strength === 'weak' || e.compromised).length
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (!isFilterActive) return entries
    return entries.filter(e => e.strength === 'weak' || e.compromised)
  }, [entries, isFilterActive])

  function toggleFilter() {
    setIsFilterActive(prev => !prev)
  }

  return { alertCount, isFilterActive, filteredEntries, toggleFilter }
}
