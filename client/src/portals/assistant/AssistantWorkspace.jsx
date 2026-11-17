import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, ExternalLink, LoaderCircle, Plus, RefreshCw, Save, Search } from 'lucide-react'
import {
  createConversationActionItem,
  fetchAssistantSettings,
  fetchThreads,
  fetchWorkspaceActionItems,
  fetchWorkspaceFollowUps,
  fetchWorkspaceMeetings,
  updateAssistantProfile,
  updateWorkspaceActionItem,
  updateWorkspaceFollowUp,
  updateWorkspaceMeeting,
} from '../../services/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { safeHttpUrl } from '../../utils/urls'

const pageMeta = {
  actions: { title: 'Action Center', description: 'Tasks and commitments across your conversations.' },
  'follow-ups': { title: 'Follow-ups', description: 'Track conversations waiting for a response without sending anything automatically.' },
  meetings: { title: 'Meetings', description: 'Review meeting details extracted from email conversations.' },
  settings: { title: 'Settings', description: 'Manage your assistant profile, preferences, and simulated integrations.' },
}

const dateValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const displayDate = (value) => {
  if (!value) return 'No date set'
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { timeZone: 'UTC' })
}

const FormField = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
    {children}
  </label>
)

const controlClass = 'w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600'

const StatusMessage = ({ error, notice, retry }) => {
  if (error) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">
        <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
        <Button size="sm" variant="outline" onClick={retry}>Retry</Button>
      </div>
    )
  }
  if (notice) return <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">{notice}</div>
  return null
}

export const AssistantWorkspace = ({ section, workspaceRequest, onOpenConversation, onProfileUpdated }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [items, setItems] = useState([])
  const [threads, setThreads] = useState([])
  const [reviewThreads, setReviewThreads] = useState([])
  const [delegatedThreads, setDelegatedThreads] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editValues, setEditValues] = useState({})
  const [createValues, setCreateValues] = useState({ threadId: '', task: '', assignedTo: 'assistant', priority: 'normal', dueAt: '' })
  const [settings, setSettings] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [meetingFilter, setMeetingFilter] = useState('ALL')
  const [meetingEdits, setMeetingEdits] = useState({})

  const meta = pageMeta[section]

  const loadWorkspace = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      if (section === 'actions') {
        const actionStatus = ['OPEN', 'UPCOMING', 'OVERDUE', 'DELEGATED', 'COMPLETED'].includes(statusFilter)
          ? statusFilter
          : 'ALL'
        const [actionItems, conversations, review, assistantQueue] = await Promise.all([
          fetchWorkspaceActionItems({ status: actionStatus, priority: priorityFilter, search }),
          fetchThreads({ segment: 'PRIMARY_INBOX' }),
          fetchThreads({ segment: 'NEEDS_REVIEW' }),
          fetchThreads({ segment: 'ASSISTANT_REPLY' }),
        ])
        setItems(actionItems)
        setThreads(conversations)
        setReviewThreads(review.filter((thread) => !thread.isHandled))
        setDelegatedThreads(assistantQueue.filter((thread) => !thread.isHandled && thread.clientStatus === 'DELEGATED_TO_ASSISTANT'))
      } else if (section === 'follow-ups') {
        setItems(await fetchWorkspaceFollowUps(statusFilter))
      } else if (section === 'meetings') {
        const status = ['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(meetingFilter) ? meetingFilter : 'ALL'
        setItems(await fetchWorkspaceMeetings(status))
      } else if (section === 'settings') {
        const result = await fetchAssistantSettings()
        setSettings(result)
        setPreferences(result?.profile?.preferences || {})
      }
    } catch (loadError) {
      setItems([])
      setReviewThreads([])
      setDelegatedThreads([])
      setError(loadError.message || 'Unable to load workspace data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [section, statusFilter, priorityFilter, search, meetingFilter])

  useEffect(() => {
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
    setSearch('')
    setMeetingFilter('ALL')
  }, [section])

  useEffect(() => {
    if (workspaceRequest?.section !== section || !workspaceRequest?.filter) return
    if (section === 'actions') setStatusFilter(workspaceRequest.filter)
    if (section === 'follow-ups') setStatusFilter(workspaceRequest.filter)
    if (section === 'meetings') setMeetingFilter(workspaceRequest.filter)
  }, [workspaceRequest?.nonce, section])

  const notify = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  const saveAction = async (item, updates) => {
    setSaving(true)
    setError('')
    try {
      await updateWorkspaceActionItem(item.threadId, item.id, updates)
      setEditingId('')
      await loadWorkspace({ showLoading: false })
      notify('Action item updated.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to update the action item')
    } finally {
      setSaving(false)
    }
  }

  const createAction = async (event) => {
    event.preventDefault()
    if (!createValues.threadId || !createValues.task.trim()) return
    setSaving(true)
    setError('')
    try {
      await createConversationActionItem(createValues.threadId, {
        task: createValues.task.trim(),
        assignedTo: createValues.assignedTo,
        priority: createValues.priority,
        dueAt: createValues.dueAt || null,
      })
      setCreateValues({ threadId: '', task: '', assignedTo: 'assistant', priority: 'normal', dueAt: '' })
      await loadWorkspace({ showLoading: false })
      notify('Action item created.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to create the action item')
    } finally {
      setSaving(false)
    }
  }

  const saveFollowUp = async (threadId, updates) => {
    setSaving(true)
    setError('')
    try {
      await updateWorkspaceFollowUp(threadId, updates)
      await loadWorkspace({ showLoading: false })
      notify('Follow-up updated.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to update the follow-up')
    } finally {
      setSaving(false)
    }
  }

  const saveMeeting = async (meeting) => {
    const edits = meetingEdits[meeting.threadId] || {}
    const updates = { ...edits }
    if (typeof updates.attendees === 'string') {
      updates.attendees = updates.attendees.split(',').map((name) => name.trim()).filter(Boolean)
    }
    if (!Object.keys(updates).length) {
      notify('No meeting changes to save.')
      return true
    }
    setSaving(true)
    setError('')
    try {
      await updateWorkspaceMeeting(meeting.threadId, updates)
      setMeetingEdits((current) => {
        const next = { ...current }
        delete next[meeting.threadId]
        return next
      })
      await loadWorkspace({ showLoading: false })
      notify('Meeting details updated.')
      return true
    } catch (saveError) {
      setError(saveError.message || 'Unable to update the meeting')
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    if (!settings || !preferences) return
    setSaving(true)
    setError('')
    try {
      const profile = await updateAssistantProfile({
        name: settings.profile.name,
        preferences,
      })
      setSettings((current) => ({ ...current, profile }))
      setPreferences(profile.preferences || {})
      onProfileUpdated?.(profile)
      notify('Settings saved.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save settings')
    } finally {
      setSaving(false)
    }
  }

  const filteredMeetings = useMemo(() => {
    if (section !== 'meetings') return items
    if (meetingFilter === 'TODAY') return items.filter((meeting) => meeting.status === 'SCHEDULED' && meeting.temporalStatus === 'TODAY')
    if (meetingFilter === 'UPCOMING') return items.filter((meeting) => meeting.status === 'SCHEDULED' && meeting.temporalStatus === 'UPCOMING')
    if (meetingFilter === 'PAST') return items.filter((meeting) => meeting.status !== 'CANCELLED' && meeting.temporalStatus === 'PAST')
    if (meetingFilter === 'ATTENTION') return items.filter((meeting) => meeting.status === 'SCHEDULED' && meeting.needsAttention)
    return items
  }, [items, meetingFilter, section])

  if (!meta) return null

  return (
    <main className="min-h-[calc(100vh-7rem)] bg-zinc-950 px-3 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">AssistIQ · Assistant workspace</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">{meta.title}</h1>
            <p className="mt-1 text-xs text-zinc-400">{meta.description}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadWorkspace()} disabled={loading}>
            {loading ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            Refresh
          </Button>
        </header>

        <StatusMessage error={error} notice={notice} retry={() => loadWorkspace()} />

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-zinc-400">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading {meta.title.toLowerCase()}…
          </div>
        ) : section === 'actions' ? (
          <div className="space-y-4">
            {(statusFilter === 'ALL' || statusFilter === 'NEEDS_REVIEW') && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-100">Conversations requiring review</h2>
                  <Badge variant="needsReview" size="sm">{reviewThreads.length}</Badge>
                </div>
                {reviewThreads.length ? reviewThreads.map((thread) => (
                  <div key={thread.id} className="flex flex-col gap-2 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">{thread.subject}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{thread.sender?.name} · {thread.classificationReason || thread.aiReasoning || 'Responsibility is uncertain'}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onOpenConversation(thread.id)}><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Review email</Button>
                  </div>
                )) : <p className="text-xs text-zinc-500">No unresolved conversations require review.</p>}
              </Card>
            )}

            {(statusFilter === 'ALL' || statusFilter === 'DELEGATED') && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-100">Client delegations</h2>
                  <Badge variant="client" size="sm">{delegatedThreads.length}</Badge>
                </div>
                {delegatedThreads.length ? delegatedThreads.map((thread) => (
                  <div key={thread.id} className="flex flex-col gap-2 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">{thread.subject}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{thread.sender?.name} · {thread.priority} priority · Delegated {displayDate(thread.delegatedAt)}</p>
                      {thread.delegationNote && <p className="mt-1 text-xs text-zinc-300">“{thread.delegationNote}”</p>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onOpenConversation(thread.id)}><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open delegation</Button>
                  </div>
                )) : <p className="text-xs text-zinc-500">No active client delegations.</p>}
              </Card>
            )}

            <Card>
              <form onSubmit={createAction} className="grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <FormField label="Related conversation">
                    <select className={controlClass} value={createValues.threadId} onChange={(event) => setCreateValues((value) => ({ ...value, threadId: event.target.value }))} required>
                      <option value="">Select a conversation</option>
                      {threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.subject}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Task">
                    <input className={controlClass} value={createValues.task} onChange={(event) => setCreateValues((value) => ({ ...value, task: event.target.value }))} placeholder="Describe the task" maxLength={1000} required />
                  </FormField>
                </div>
                <FormField label="Assigned to">
                  <select className={controlClass} value={createValues.assignedTo} onChange={(event) => setCreateValues((value) => ({ ...value, assignedTo: event.target.value }))}>
                    <option value="assistant">Assistant</option><option value="client">Client</option><option value="unknown">Unassigned</option>
                  </select>
                </FormField>
                <FormField label="Priority">
                  <select className={controlClass} value={createValues.priority} onChange={(event) => setCreateValues((value) => ({ ...value, priority: event.target.value }))}>
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Due date (optional)">
                    <input type="date" className={controlClass} value={createValues.dueAt} onChange={(event) => setCreateValues((value) => ({ ...value, dueAt: event.target.value }))} />
                  </FormField>
                </div>
                <div className="md:col-span-4 flex items-end justify-end">
                  <Button type="submit" variant="primary" size="sm" disabled={saving || !threads.length}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add task
                  </Button>
                </div>
              </form>
            </Card>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input className={`${controlClass} pl-8`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search task, client, conversation…" />
              </label>
              <select className={`${controlClass} sm:w-40`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">All work</option><option value="OPEN">Incomplete tasks</option><option value="UPCOMING">Upcoming deadlines</option><option value="OVERDUE">Overdue</option><option value="DELEGATED">Client delegations</option><option value="NEEDS_REVIEW">Needs review</option><option value="COMPLETED">Completed tasks</option>
              </select>
              <select className={`${controlClass} sm:w-36`} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="ALL">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
              </select>
            </div>

            {statusFilter === 'NEEDS_REVIEW' ? null : items.length ? <div className="space-y-2">
              {items.map((item) => {
                const editing = editingId === item.id
                const values = editing ? editValues : {}
                return (
                  <Card key={`${item.threadId}-${item.id}`} className={item.isOverdue ? 'border-amber-500/30' : ''}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        {editing ? (
                          <input className={controlClass} value={values.task} onChange={(event) => setEditValues((value) => ({ ...value, task: event.target.value }))} maxLength={1000} />
                        ) : <h2 className={`text-sm font-medium ${item.completed ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{item.title}</h2>}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                          <span>{item.client.name}</span><span>{item.conversation.subject}</span><span>Created {displayDate(item.createdAt)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.completed ? 'neutral' : item.isOverdue ? 'needsReview' : 'assistant'} size="sm">{item.completed ? 'Completed' : item.isOverdue ? 'Overdue' : 'Open'}</Badge>
                          {item.delegated && <Badge variant="client" size="sm">Delegated</Badge>}
                          <Badge variant="neutral" size="sm">{item.source === 'USER' ? 'Assistant task' : 'AI extracted'}</Badge>
                          {item.dateNeedsReview && <Badge variant="needsReview" size="sm">Deadline needs review</Badge>}
                          {!editing ? <span className="text-[11px] text-zinc-500">{item.assignedTo} · {item.priority} · Due {displayDate(item.dueAt || item.deadline)}</span> : null}
                        </div>
                        {editing && (
                          <div className="grid gap-2 sm:grid-cols-4">
                            <FormField label="Assigned"><select className={controlClass} value={values.assignedTo} onChange={(event) => setEditValues((value) => ({ ...value, assignedTo: event.target.value }))}><option value="assistant">Assistant</option><option value="client">Client</option><option value="unknown">Unassigned</option></select></FormField>
                            <FormField label="Priority"><select className={controlClass} value={values.priority} onChange={(event) => setEditValues((value) => ({ ...value, priority: event.target.value }))}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></FormField>
                            <FormField label="Due date"><input type="date" className={controlClass} value={values.dueAt} onChange={(event) => setEditValues((value) => ({ ...value, dueAt: event.target.value }))} /></FormField>
                            <FormField label="Status"><select className={controlClass} value={values.completed ? 'COMPLETED' : 'OPEN'} onChange={(event) => setEditValues((value) => ({ ...value, completed: event.target.value === 'COMPLETED' }))}><option value="OPEN">Incomplete</option><option value="COMPLETED">Completed</option></select></FormField>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => onOpenConversation(item.threadId)}><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Email</Button>
                        {editing ? <>
                          <Button size="sm" variant="primary" disabled={saving} onClick={() => {
                            const updates = { ...values }
                            if (item.dueAt || values.dueAt) updates.dueAt = values.dueAt || null
                            else delete updates.dueAt
                            return saveAction(item, updates)
                          }}><Save className="mr-1.5 h-3.5 w-3.5" /> Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId('')}>Cancel</Button>
                        </> : <Button size="sm" variant="outline" onClick={() => {
                          setEditValues({ task: item.title, assignedTo: item.assignedTo, priority: item.priority, dueAt: dateValue(item.dueAt), completed: item.completed })
                          setEditingId(item.id)
                        }}>Edit</Button>}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div> : <Card><p className="py-8 text-center text-xs text-zinc-500">No action items match these filters.</p></Card>}
          </div>
        ) : section === 'follow-ups' ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <select className={`${controlClass} sm:w-48`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">All follow-ups</option><option value="WAITING">Waiting</option><option value="SCHEDULED">Scheduled</option><option value="OVERDUE">Overdue</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            {items.length ? items.map((item) => (
              <FollowUpRow key={item.threadId} item={item} saving={saving} onOpenConversation={onOpenConversation} onSave={saveFollowUp} />
            )) : <Card><p className="py-8 text-center text-xs text-zinc-500">No conversations are waiting for follow-up.</p></Card>}
          </div>
        ) : section === 'meetings' ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <select className={`${controlClass} sm:w-48`} value={meetingFilter} onChange={(event) => setMeetingFilter(event.target.value)}>
                <option value="ALL">All meetings</option><option value="TODAY">Today's meetings</option><option value="UPCOMING">Upcoming</option><option value="PAST">Past</option><option value="ATTENTION">Needs attention</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            {filteredMeetings.length ? filteredMeetings.map((meeting) => (
              <MeetingRow key={meeting.threadId} meeting={meeting} edits={meetingEdits[meeting.threadId] || {}} setEdits={(changes) => setMeetingEdits((all) => ({ ...all, [meeting.threadId]: { ...all[meeting.threadId], ...changes } }))} onSave={() => saveMeeting(meeting)} onOpenConversation={onOpenConversation} saving={saving} />
            )) : <Card><p className="py-8 text-center text-xs text-zinc-500">No meetings found. Meeting details are shown only when present in conversation data.</p></Card>}
          </div>
        ) : (
          <SettingsView settings={settings} preferences={preferences} setSettings={setSettings} setPreferences={setPreferences} saving={saving} onSave={saveSettings} />
        )}
      </div>
    </main>
  )
}

const FollowUpRow = ({ item, saving, onOpenConversation, onSave }) => {
  const [status, setStatus] = useState(item.status)
  const [dueAt, setDueAt] = useState(dateValue(item.dueAt))
  const [note, setNote] = useState(item.note || '')
  useEffect(() => {
    setStatus(item.status)
    setDueAt(dateValue(item.dueAt))
    setNote(item.note || '')
  }, [item.status, item.dueAt, item.note])
  return (
    <Card className={item.isOverdue ? 'border-amber-500/30' : ''}>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-100">{item.subject}</h2>
          <p className="text-xs text-zinc-500">{item.sender?.name} · {item.client.name} · Due {displayDate(item.dueAt)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.status === 'COMPLETED' ? 'neutral' : item.isOverdue ? 'needsReview' : 'waiting'} size="sm">{item.isOverdue ? 'Overdue' : item.status}</Badge>
            <span className="text-[11px] text-zinc-500">Waiting for a response; no email will be sent automatically.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <FormField label="Status"><select className={controlClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="WAITING">Waiting</option><option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></FormField>
          <FormField label="Follow-up date"><input type="date" className={controlClass} value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></FormField>
          <FormField label="Note"><input className={controlClass} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Optional" /></FormField>
          <Button size="sm" variant="primary" disabled={saving} onClick={() => onSave(item.threadId, { status, dueAt: dueAt || null, note })}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
          <Button size="sm" variant="outline" onClick={() => onOpenConversation(item.threadId)}><ExternalLink className="mr-1 h-3.5 w-3.5" /> Email</Button>
        </div>
      </div>
    </Card>
  )
}

const MeetingRow = ({ meeting, edits, setEdits, onSave, onOpenConversation, saving }) => {
  const [editing, setEditing] = useState(false)
  const value = (key, fallback = '') => edits[key] ?? fallback
  const date = meeting.date && /^\d{4}-\d{2}-\d{2}$/.test(meeting.date) ? meeting.date : ''
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-100"><CalendarDays className="h-4 w-4 text-zinc-500" />{meeting.title || 'Meeting details'}</h2>
            <p className="mt-1 text-xs text-zinc-500">{displayDate(meeting.date)} {meeting.time || ''} {meeting.timezone || ''} · {meeting.client.name}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{meeting.attendees?.length ? meeting.attendees.join(', ') : 'Participants not specified'}{meeting.location ? ` · ${meeting.location}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meeting.status === 'SCHEDULED' ? 'waiting' : 'neutral'} size="sm">{meeting.status || 'SCHEDULED'}</Badge>
            <Badge variant="neutral" size="sm">{meeting.source === 'MANUAL' ? 'Manually edited' : 'AI extracted'}</Badge>
            {meeting.needsAttention && <Badge variant="needsReview" size="sm">Details need review</Badge>}
            <Button size="sm" variant="outline" onClick={() => onOpenConversation(meeting.threadId)}><ExternalLink className="mr-1 h-3.5 w-3.5" /> Email</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing((current) => !current)}>{editing ? 'Close editor' : 'Edit details'}</Button>
          </div>
        </div>
        {safeHttpUrl(meeting.meetingLink) && <a className="text-xs text-sky-300 underline underline-offset-2" href={safeHttpUrl(meeting.meetingLink)} target="_blank" rel="noreferrer">Open meeting link</a>}
        {editing && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Title"><input className={controlClass} value={value('title', meeting.title)} onChange={(event) => setEdits({ title: event.target.value })} maxLength={250} /></FormField>
          <FormField label="Date"><input type="date" className={controlClass} value={value('date', date)} onChange={(event) => setEdits({ date: event.target.value })} /></FormField>
          <FormField label="Time"><input type="time" className={controlClass} value={value('time', meeting.time)} onChange={(event) => setEdits({ time: event.target.value })} /></FormField>
          <FormField label="Timezone"><input className={controlClass} value={value('timezone', meeting.timezone)} onChange={(event) => setEdits({ timezone: event.target.value })} maxLength={200} placeholder="Not specified" /></FormField>
          <FormField label="Participants"><input className={controlClass} value={value('attendees', (meeting.attendees || []).join(', '))} onChange={(event) => setEdits({ attendees: event.target.value })} maxLength={1000} placeholder="Comma-separated names" /></FormField>
          <FormField label="Location"><input className={controlClass} value={value('location', meeting.location)} onChange={(event) => setEdits({ location: event.target.value })} maxLength={500} /></FormField>
          <FormField label="Meeting link"><input className={controlClass} value={value('meetingLink', meeting.meetingLink)} onChange={(event) => setEdits({ meetingLink: event.target.value })} /></FormField>
          <FormField label="Status"><select className={controlClass} value={value('status', meeting.status || 'SCHEDULED')} onChange={(event) => setEdits({ status: event.target.value })}><option value="SCHEDULED">Scheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></FormField>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end"><Button size="sm" variant="primary" disabled={saving} onClick={async () => { if (await onSave()) setEditing(false) }}><Save className="mr-1.5 h-3.5 w-3.5" /> Save meeting</Button></div>
        </div>}
      </div>
    </Card>
  )
}

const SettingsView = ({ settings, preferences, setSettings, setPreferences, saving, onSave }) => {
  if (!settings || !preferences) return <Card><p className="py-8 text-center text-xs text-zinc-500">Settings are not available.</p></Card>
  const accountLabel = (provider) => provider === 'GMAIL' ? 'Gmail' : 'Outlook'
  return (
    <form onSubmit={onSave} className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100">Assistant profile</h2>
        <FormField label="Name"><input className={controlClass} value={settings.profile.name} onChange={(event) => setSettings((current) => ({ ...current, profile: { ...current.profile, name: event.target.value } }))} maxLength={120} required /></FormField>
        <FormField label="Email"><input className={`${controlClass} opacity-70`} value={settings.profile.email} readOnly /></FormField>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-[10px] uppercase text-zinc-500">Role</p><p className="mt-1 text-zinc-300">{settings.profile.role}</p></div>
          <div><p className="text-[10px] uppercase text-zinc-500">Organization</p><p className="mt-1 text-zinc-300">{settings.profile.organization}</p></div>
        </div>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100">Preferences</h2>
        <FormField label="Default inbox">
          <select className={controlClass} value={preferences.defaultInboxSegment || 'PRIMARY_INBOX'} onChange={(event) => setPreferences((current) => ({ ...current, defaultInboxSegment: event.target.value }))}>
            <option value="PRIMARY_INBOX">Primary inbox</option><option value="ASSISTANT_REPLY">Assistant to Reply</option><option value="CLIENT_REPLY">Client to Reply</option><option value="NEEDS_REVIEW">Needs review</option><option value="WAITING_FOR">Waiting for</option><option value="NO_REPLY_NEEDED">No reply needed</option>
          </select>
        </FormField>
        <FormField label="Default reply tone"><select className={controlClass} value={preferences.defaultReplyTone || 'professional'} onChange={(event) => setPreferences((current) => ({ ...current, defaultReplyTone: event.target.value }))}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="concise">Concise</option></select></FormField>
        <PreferenceToggle label="Notifications enabled" checked={preferences.notificationsEnabled} onChange={(value) => setPreferences((current) => ({ ...current, notificationsEnabled: value }))} />
        <PreferenceToggle label="Deadline reminders" checked={preferences.deadlineReminders} onChange={(value) => setPreferences((current) => ({ ...current, deadlineReminders: value }))} />
        <PreferenceToggle label="Concise summaries" checked={preferences.conciseSummaries} onChange={(value) => setPreferences((current) => ({ ...current, conciseSummaries: value }))} />
        <PreferenceToggle label="Compact display" checked={preferences.compactDisplay} onChange={(value) => setPreferences((current) => ({ ...current, compactDisplay: value }))} />
      </Card>
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-100">Email accounts</h2>
        {settings.emailAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
            <div><p className="text-xs font-medium text-zinc-200">{accountLabel(account.provider)}</p><p className="mt-1 text-[11px] text-zinc-500">{account.ownerEmail}</p></div>
            <div className="text-right"><Badge variant="neutral" size="sm">SIMULATED</Badge><p className="mt-1 text-[10px] font-mono text-zinc-500">Not connected · No sync</p></div>
          </div>
        ))}
        <p className="text-[11px] text-zinc-500">Live Gmail and Outlook connections are not configured. No calendar integration is active.</p>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-100">Application information</h2>
        <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Version</span><span className="font-mono text-zinc-300">{settings.application.version}</span></div>
        <div className="flex items-center justify-between gap-3 text-xs"><span className="text-zinc-500">AI mode</span><span className="text-right text-zinc-300">{settings.application.aiProcessingMode}</span></div>
        <p className="text-xs leading-relaxed text-zinc-500">{settings.application.integrations}</p>
      </Card>
      <div className="lg:col-span-2 flex justify-end">
        <Button type="submit" variant="primary" disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" /> Save preferences</Button>
      </div>
    </form>
  )
}

const PreferenceToggle = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-zinc-300">
    <span>{label}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-zinc-100" />
  </label>
)
