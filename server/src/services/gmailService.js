// Google OAuth 2.0 + Gmail API integration (REST, no SDK dependency).
// Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and a redirect URI
// registered in the Google Cloud Console. Tokens are exchanged server-side
// and stored encrypted; they are never sent to the frontend.

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
]

export const isGmailConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())

export const getRedirectUri = () =>
  (process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 5000}/api/email-accounts/google/callback`).trim()

const assertConfigured = () => {
  if (!isGmailConfigured()) {
    const error = new Error('Gmail integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend.')
    error.status = 501
    throw error
  }
}

/** Build the Google consent-screen URL. `state` carries the session token. */
export const buildGoogleAuthUrl = (state) => {
  assertConfigured()
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID.trim(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
  })
  if (state) params.set('state', state)
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`
}

/** Exchange an authorization code for access + refresh tokens. */
export const exchangeCodeForTokens = async (code) => {
  assertConfigured()
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(code),
      client_id: process.env.GOOGLE_CLIENT_ID.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET.trim(),
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error_description || 'Google rejected the authorization code')
    error.status = 502
    throw error
  }
  if (!payload.access_token) {
    const error = new Error('Google did not return an access token')
    error.status = 502
    throw error
  }
  return payload
}

/** Refresh an access token using the stored refresh token. */
export const refreshAccessToken = async (refreshToken) => {
  assertConfigured()
  if (!refreshToken) {
    const error = new Error('No refresh token available; reconnect your Gmail account.')
    error.status = 401
    throw error
  }
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET.trim(),
      grant_type: 'refresh_token',
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error_description || 'Gmail access could not be refreshed')
    error.status = 401
    throw error
  }
  return {
    access_token: payload.access_token,
    expires_in: payload.expires_in,
  }
}

/** Revoke stored credentials with Google. */
export const revokeToken = async (token) => {
  if (!token) return
  try {
    await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: 'POST' })
  } catch {
    // Revocation is best-effort; local credentials are deleted regardless.
  }
}

/** Mailbox profile (email address + history id). */
export const fetchGmailProfile = async (accessToken) => {
  const response = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Unable to read the Gmail profile')
  return response.json()
}

// ---------- Gmail message parsing helpers ----------

const decodeBase64Url = (data) => {
  const normalized = String(data || '').replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf8')
}

const collectBodyText = (payload) => {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  if (Array.isArray(payload.parts) && payload.parts.length) {
    const plain = payload.parts.find((part) => part.mimeType === 'text/plain')
    if (plain) return collectBodyText(plain)
    const html = payload.parts.find((part) => part.mimeType === 'text/html')
    if (html) return collectBodyText(html)
    return payload.parts.map((part) => collectBodyText(part)).join('\n')
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data)
  return ''
}

const htmlToText = (html) => String(html || '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const headerValue = (headers, name) =>
  headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || ''

/** Parse "Name <email@host>" into { name, email }. */
const parseEmailAddress = (raw) => {
  const value = String(raw || '').trim()
  const match = value.match(/^(.*?)\s*<([^>]+)>\s*$/)
  if (match) {
    return { name: match[1].replace(/^"|"$/g, '').trim() || match[2], email: match[2].trim().toLowerCase() }
  }
  return { name: value, email: value.toLowerCase() }
}

const parseAddressList = (raw) =>
  String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => parseEmailAddress(entry).email)

export const fetchGmailMessage = async (accessToken, messageId) => {
  const response = await fetch(`${GMAIL_API}/messages/${encodeURIComponent(messageId)}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    if (response.status === 401) {
      const error = new Error('Gmail access was revoked or expired')
      error.status = 401
      throw error
    }
    throw new Error(`Gmail message ${messageId} could not be loaded (${response.status})`)
  }
  return response.json()
}

/** Convert a raw Gmail message into our normalized shape. */
export const normalizeGmailMessage = (message, ownerEmail) => {
  const headers = message.payload?.headers || []
  const from = parseEmailAddress(headerValue(headers, 'From'))
  const to = parseAddressList(headerValue(headers, 'To'))
  const cc = parseAddressList(headerValue(headers, 'Cc'))
  const rawBody = collectBodyText(message.payload)
  const body = /<html|<div|<p[\s>]/i.test(rawBody.slice(0, 500)) ? htmlToText(rawBody) : rawBody
  const timestamp = message.internalDate
    ? new Date(Number(message.internalDate))
    : new Date(Date.parse(headerValue(headers, 'Date')) || Date.now())
  const snippet = String(message.snippet || body || '').slice(0, 300)

  return {
    id: `gm-${message.id}`,
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    sender: {
      name: from.name,
      email: from.email,
      isMe: from.email === String(ownerEmail || '').toLowerCase(),
    },
    recipients: to,
    cc,
    subject: headerValue(headers, 'Subject') || '(no subject)',
    body: body.trim(),
    snippet: snippet.trim(),
    timestamp,
  }
}

/**
 * List recent inbox messages and group them by Gmail thread.
 * Returns [{ gmailThreadId, messages: [normalized...] }] oldest-first.
 */
export const fetchInboxThreads = async (accessToken, ownerEmail, { maxMessages = 60 } = {}) => {
  const listResponse = await fetch(
    `${GMAIL_API}/messages?maxResults=${maxMessages}&q=${encodeURIComponent('in:inbox')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!listResponse.ok) {
    if (listResponse.status === 401) {
      const error = new Error('Gmail access was revoked or expired')
      error.status = 401
      throw error
    }
    throw new Error(`Gmail messages could not be listed (${listResponse.status})`)
  }
  const listPayload = await listResponse.json()
  const messageIds = (listPayload.messages || []).map((item) => item.id)

  const groups = new Map()
  for (const messageId of messageIds) {
    const raw = await fetchGmailMessage(accessToken, messageId)
    const normalized = normalizeGmailMessage(raw, ownerEmail)
    if (!groups.has(normalized.gmailThreadId)) groups.set(normalized.gmailThreadId, [])
    groups.get(normalized.gmailThreadId).push(normalized)
  }
  return [...groups.values()].map((messages) => ({
    gmailThreadId: messages[0].gmailThreadId,
    messages: messages.sort((a, b) => a.timestamp - b.timestamp),
  }))
}

/** Send an email via the Gmail API. Returns the Gmail message id. */
export const sendGmailMessage = async (accessToken, { to, cc = [], subject, body }) => {
  const recipients = [to, ...(Array.isArray(cc) ? cc : String(cc || '').split(',').map((v) => v.trim()).filter(Boolean))]
    .filter(Boolean)
    .filter((address, index, all) => all.indexOf(address) === index)

  const headerBlock = [
    `To: ${recipients[0]}`,
    recipients.length > 1 ? `Cc: ${recipients.slice(1).join(', ')}` : '',
    `Subject: ${String(subject || '').replace(/[\r\n]+/g, ' ')}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
  ].filter(Boolean).join('\r\n')

  const raw = Buffer.from(`${headerBlock}\r\n\r\n${body}\r\n`, 'utf8').toString('base64url')
  const response = await fetch(`${GMAIL_API}/messages/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Gmail rejected the send request')
    error.status = 502
    throw error
  }
  return payload
}
