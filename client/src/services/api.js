const configuredApiBase = (import.meta.env.VITE_API_URL || '').trim()
const API_BASE = (configuredApiBase || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/$/, '')

const TOKEN_KEY = 'assistiq.token'

export const getStoredToken = () =>
  (typeof window !== 'undefined' && window.localStorage.getItem(TOKEN_KEY)) || ''

export const storeToken = (token) => {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  window.localStorage.removeItem(TOKEN_KEY)
}

async function apiRequest(path, options = {}) {
  if (!API_BASE) {
    throw new Error('VITE_API_URL must be configured for production.')
  }

  const { method = 'GET', body, headers = {} } = options
  const token = getStoredToken()

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

// ---------- Auth ----------

export const register = async ({ name, email, password }) => {
  const response = await apiRequest('/api/auth/register', { method: 'POST', body: { name, email, password } })
  return response.data || null
}

export const login = async ({ email, password }) => {
  const response = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } })
  return response.data || null
}

export const logout = async () => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' })
  } catch {
    // Session cleanup is best-effort; the local token is cleared regardless.
  }
  clearToken()
}

export const fetchCurrentUser = async () => {
  const response = await apiRequest('/api/auth/me')
  return response.data?.user || null
}

// ---------- Threads ----------

export const fetchThreads = async (query = {}) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      params.set(key, String(value))
    }
  })
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const response = await apiRequest(`/api/threads${suffix}`)
  return { threads: response.data || [], counts: response.counts || {} }
}

export const getThread = async (threadId) => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}`)
  return response.data || null
}

export const updateThreadClassification = async (threadId, classification, reason = '') => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}/classification`, {
    method: 'PATCH',
    body: { classification, reason },
  })
  return response.data || null
}

export const updateThreadStatus = async (threadId, updates = {}) => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}/status`, {
    method: 'PATCH',
    body: updates,
  })
  return response.data || null
}

export const analyzeThread = async (threadId) => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}/analyze`, { method: 'POST' })
  return response.data || null
}

export const generateThreadDraft = async (threadId, tone = 'professional') => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}/draft/generate`, {
    method: 'POST',
    body: { tone },
  })
  return response.data || null
}

export const saveThreadDraft = async (threadId, draft) => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}/draft`, {
    method: 'PUT',
    body: draft,
  })
  return response.data || null
}

export const sendThreadReply = async (threadId, reply) => {
  const response = await apiRequest(`/api/threads/${encodeURIComponent(threadId)}/send`, {
    method: 'POST',
    body: { ...reply, explicitApproval: true },
  })
  return response.data || null
}

// ---------- Email accounts ----------

export const fetchEmailAccounts = async () => {
  const response = await apiRequest('/api/email-accounts')
  return response.data || []
}

export const getGmailConnectUrl = async () => {
  const response = await apiRequest('/api/email-accounts/google/connect-url')
  return response.data?.url || ''
}

export const syncEmailAccount = async (maxMessages = 60) => {
  const response = await apiRequest('/api/email-accounts/google/sync', {
    method: 'POST',
    body: { maxMessages },
  })
  return response.data || null
}

export const disconnectEmailAccount = async (accountId) => {
  const response = await apiRequest(`/api/email-accounts/${encodeURIComponent(accountId)}`, { method: 'DELETE' })
  return response.data || null
}
