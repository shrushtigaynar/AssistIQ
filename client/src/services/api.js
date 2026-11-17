const configuredApiBase = (import.meta.env.VITE_API_URL || '').trim()
const API_BASE = (configuredApiBase || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/$/, '')

async function apiRequest(path, options = {}) {
  if (!API_BASE) {
    throw new Error('VITE_API_URL must be configured for production.')
  }

  const { method = 'GET', body, headers = {} } = options
  const isPublicSession = path === '/api/auth/session'
  const portal = path.startsWith('/api/client') ? 'client' : 'assistant'
  const token = !isPublicSession && typeof window !== 'undefined'
    ? window.localStorage.getItem(`assistiq.${portal}.token`)
    : ''

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed (${response.status})`)
  }

  return payload
}

export const createPortalSession = async (token) => {
  const response = await apiRequest('/api/auth/session', {
    method: 'POST',
    body: { token },
  })
  return response.data || null
}

export const getStoredPortalToken = (portal) =>
  typeof window === 'undefined' ? '' : window.localStorage.getItem(`assistiq.${portal}.token`) || ''

export const storePortalToken = (portal, token) => {
  window.localStorage.setItem(`assistiq.${portal}.token`, token)
}

export const clearPortalToken = (portal) => {
  window.localStorage.removeItem(`assistiq.${portal}.token`)
}

export const fetchThreads = async (query = {}) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  const path = params.toString() ? `/api/threads?${params.toString()}` : '/api/threads'
  const response = await apiRequest(path)
  return response.data || []
}

export const fetchCounts = async () => {
  const response = await apiRequest('/api/threads/counts')
  return response.counts || {}
}

export const getThreadById = async (threadId) => {
  const response = await apiRequest(`/api/threads/${threadId}`)
  return response.data || null
}

export const updateThreadStatus = async (threadId, updates = {}) => {
  const response = await apiRequest(`/api/threads/${threadId}/status`, {
    method: 'PATCH',
    body: updates,
  })
  return response.data || null
}

export const updateThreadClassification = async (threadId, classification, reason = '', user = 'Elena Rostova (PA)') => {
  const response = await apiRequest(`/api/threads/${threadId}/classification`, {
    method: 'PATCH',
    body: { classification, reason, user },
  })
  return response.data || null
}

export const addThreadNote = async (threadId, noteData = {}) => {
  const response = await apiRequest(`/api/threads/${threadId}/notes`, {
    method: 'POST',
    body: noteData,
  })
  return response.data || null
}

export const saveThreadDraft = async (threadId, draftData = {}) => {
  const response = await apiRequest(`/api/threads/${threadId}/draft`, {
    method: 'PUT',
    body: draftData,
  })
  return response.data || null
}

export const sendThreadReply = async (threadId, replyData = {}) => {
  const response = await apiRequest(`/api/threads/${threadId}/reply`, {
    method: 'POST',
    body: replyData,
  })
  return response.data || null
}

export const toggleThreadAction = async (threadId, actionId) => {
  const response = await apiRequest(`/api/threads/${threadId}/actions/${actionId}`, {
    method: 'PATCH',
  })
  return response.data || null
}

export const createConversationActionItem = async (threadId, itemData = {}) => {
  const response = await apiRequest(`/api/conversations/${encodeURIComponent(threadId)}/action-items`, {
    method: 'POST',
    body: itemData,
  })
  return response.data || null
}

export const fetchWorkspaceOverview = async () => {
  const response = await apiRequest('/api/workspace/overview')
  return response.data || null
}

export const fetchWorkspaceActionItems = async (query = {}) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const suffix = params.toString() ? `?${params}` : ''
  const response = await apiRequest(`/api/workspace/action-items${suffix}`)
  return response.data || []
}

export const updateWorkspaceActionItem = async (threadId, actionId, updates = {}) => {
  const response = await apiRequest(`/api/workspace/action-items/${encodeURIComponent(threadId)}/${encodeURIComponent(actionId)}`, {
    method: 'PATCH',
    body: updates,
  })
  return response.data || null
}

export const fetchWorkspaceFollowUps = async (status = 'ALL') => {
  const response = await apiRequest(`/api/workspace/follow-ups?status=${encodeURIComponent(status)}`)
  return response.data || []
}

export const updateWorkspaceFollowUp = async (threadId, updates = {}) => {
  const response = await apiRequest(`/api/workspace/follow-ups/${encodeURIComponent(threadId)}`, {
    method: 'PATCH',
    body: updates,
  })
  return response.data || null
}

export const fetchWorkspaceMeetings = async (status = 'ALL') => {
  const response = await apiRequest(`/api/workspace/meetings?status=${encodeURIComponent(status)}`)
  return response.data || []
}

export const updateWorkspaceMeeting = async (threadId, updates = {}) => {
  const response = await apiRequest(`/api/workspace/meetings/${encodeURIComponent(threadId)}`, {
    method: 'PATCH',
    body: updates,
  })
  return response.data || null
}

export const fetchAssistantSettings = async () => {
  const response = await apiRequest('/api/workspace/settings')
  return response.data || null
}

export const updateAssistantProfile = async (updates = {}) => {
  const response = await apiRequest('/api/workspace/settings/profile', {
    method: 'PATCH',
    body: updates,
  })
  return response.data || null
}

export const bulkThreadUpdate = async (threadIds, action, value = null, user = 'Elena Rostova (PA)') => {
  const response = await apiRequest('/api/threads/bulk', {
    method: 'POST',
    body: { threadIds, action, value, user },
  })
  return response.data || []
}

export const injectThread = async (threadData = {}) => {
  const response = await apiRequest('/api/threads/inject', {
    method: 'POST',
    body: threadData,
  })
  return response.data || null
}

export const resetThreadData = async () => {
  const response = await apiRequest('/api/seed/reset', {
    method: 'POST',
  })
  return response.data || []
}

export const analyzeThreadData = async (threadData = {}) => {
  const response = await apiRequest('/api/ai/analyze', {
    method: 'POST',
    body: threadData,
  })
  return response.data || null
}

export const classifyThreadData = async (threadData = {}) => {
  const response = await apiRequest('/api/ai/classify', {
    method: 'POST',
    body: threadData,
  })
  return response.data || null
}

export const getConversationAnalysis = async (threadId) => {
  const response = await apiRequest(`/api/ai/conversations/${encodeURIComponent(threadId)}/analysis`)
  return response.data || null
}

export const analyzeConversationById = async (threadId) => {
  const response = await apiRequest(`/api/ai/conversations/${encodeURIComponent(threadId)}/reanalyze`, {
    method: 'POST',
  })
  return response.data || null
}

export const generateConversationReplyDraft = async (threadId, tone) => {
  const response = await apiRequest(`/api/ai/conversations/${encodeURIComponent(threadId)}/draft`, {
    method: 'POST',
    body: { tone },
  })
  return response.data || null
}

export const askConversationQuestion = async (threadId, question) => {
  const response = await apiRequest(`/api/ai/conversations/${encodeURIComponent(threadId)}/questions`, {
    method: 'POST',
    body: { question },
  })
  return response.data || null
}

export const requestClientDraftApproval = async (threadId, draft) => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}/draft/request-approval`, {
    method: 'POST',
    body: draft,
  })
  return response.data || null
}

export const fetchClientProfile = async () => {
  const response = await apiRequest('/api/client/profile')
  return response.data || null
}

export const updateClientPreferences = async (preferences) => {
  const response = await apiRequest('/api/client/profile/preferences', {
    method: 'PATCH',
    body: { preferences },
  })
  return response.data || null
}

export const fetchClientInbox = async (handled = false) => {
  const params = handled ? '?handled=true' : ''
  const response = await apiRequest(`/api/client/inbox${params}`)
  return response.data || []
}

export const fetchClientDrafts = async () => {
  const response = await apiRequest('/api/client/drafts')
  return response.data || []
}

export const fetchClientConversation = async (threadId) => {
  const response = await apiRequest(`/api/client/conversations/${encodeURIComponent(threadId)}`)
  return response.data || null
}

export const markClientConversationHandled = async (threadId, handled = true) => {
  const response = await apiRequest(`/api/client/conversations/${encodeURIComponent(threadId)}/handled`, {
    method: 'PATCH',
    body: { handled },
  })
  return response.data || null
}

export const delegateClientConversation = async (threadId, instruction = '') => {
  const response = await apiRequest(`/api/client/conversations/${encodeURIComponent(threadId)}/delegate`, {
    method: 'POST',
    body: { instruction },
  })
  return response.data || null
}

export const submitClientResponse = async (threadId, body) => {
  const response = await apiRequest(`/api/client/conversations/${encodeURIComponent(threadId)}/response`, {
    method: 'POST',
    body: { body, explicitApproval: true },
  })
  return response.data || null
}

export const decideClientDraft = async (threadId, decision, reason = '') => {
  const response = await apiRequest(`/api/client/conversations/${encodeURIComponent(threadId)}/draft`, {
    method: 'PATCH',
    body: { decision, reason },
  })
  return response.data || null
}

export const getEmailAccounts = async () => {
  const response = await apiRequest('/api/email-accounts')
  return response.data || []
}
