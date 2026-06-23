import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { fetchEntries, createEntry, updateEntry, deleteEntry } from './utils/api'
import EntryList from './components/EntryList'
import EntryDetail from './components/EntryDetail'
import LoginModal from './components/LoginModal'
import ConfirmModal from './components/ConfirmModal'
import Spinner from './components/Spinner'

export default function App() {
  const { user, providers, setProviders, logout } = useAuth()
  const [entries, setEntries] = useState([])
  const [activeEntry, setActiveEntry] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showNewEntry, setShowNewEntry] = useState(false)

  const loadEntries = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchEntries(
        user.ownerHash,
        searchQuery,
        user.email
      )
      setEntries(data)
    } catch (err) {
      console.error('Failed to load entries:', err)
    } finally {
      setLoading(false)
    }
  }, [user, searchQuery])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  function handleSearchChange(query) {
    setSearchQuery(query)
  }

  async function handleSelectEntry(id) {
    if (activeEntry?.entryId === id) {
      setActiveEntry(null)
      return
    }
    const found = entries.find(e => e._id === id)
    if (found) {
      setActiveEntry(found)
    }
  }

  function handleCloseDetail() {
    setActiveEntry(null)
    setShowNewEntry(false)
  }

  function handleNewEntry() {
    setShowNewEntry(true)
    setActiveEntry({ title: '', username: '', password: '', strength: 'strong', tags: [] })
  }

  async function handleSave(form) {
    if (!user) return
    setLoading(true)
    try {
      if (form._id) {
        const fields = {}
        if (form.title !== undefined) fields.title = form.title
        if (form.username !== undefined) fields.username = form.username
        if (form.password !== undefined && form.password !== '') fields.password = form.password
        if (form.strength !== undefined) fields.strength = form.strength
        if (form.tags !== undefined) fields.tags = form.tags
        await updateEntry(form._id, fields, user.email)
      } else {
        await createEntry({
          title: form.title,
          username: form.username,
          password: form.password,
          strength: form.strength || 'strong',
          owner: user.ownerHash,
          tags: form.tags || []
        }, user.email)
      }
      setActiveEntry(null)
      setShowNewEntry(false)
      await loadEntries()
    } catch (err) {
      console.error('Failed to save entry:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteRequest(id) {
    setConfirmDelete(id)
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete || !user) return
    setLoading(true)
    try {
      await deleteEntry(confirmDelete, user.ownerHash)
      setActiveEntry(null)
      setConfirmDelete(null)
      await loadEntries()
    } catch (err) {
      console.error('Failed to delete entry:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    setEntries([])
    setActiveEntry(null)
    setSearchQuery('')
    logout()
  }

  if (!user) {
    return <LoginModal />
  }

  const showDetail = activeEntry !== null || showNewEntry

  return (
    <div className="app">
      {loading && <Spinner />}

      <EntryList
        entries={entries}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeEntryId={activeEntry?._id}
        onSelectEntry={handleSelectEntry}
        user={user}
        onLogout={handleLogout}
        onNewEntry={handleNewEntry}
      />

      {showDetail && (
        <EntryDetail
          entry={activeEntry}
          onClose={handleCloseDetail}
          onSave={handleSave}
          onDelete={handleDeleteRequest}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message="Delete entry? This cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
