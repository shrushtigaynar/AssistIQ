import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { isMongoConnected } from '../config/db.js'
import { EmailAccount } from '../models/EmailAccount.js'
import { Thread } from '../models/Thread.js'
import { User } from '../models/User.js'

const ACTION_PRIORITIES = ['low', 'normal', 'high', 'urgent']
const FOLLOW_UP_STATUSES = ['WAITING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']
const MEETING_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED']
const INBOX_SEGMENTS = ['PRIMARY_INBOX', 'ASSISTANT_REPLY', 'CLIENT_REPLY', 'NEEDS_REVIEW', 'WAITING_FOR', 'NO_REPLY_NEEDED']
const PREFERENCE_KEYS = [
  'conciseSummaries',
  'deadlineReminders',
  'notificationsEnabled',
  'defaultReplyTone',
  'defaultInboxSegment',
  'compactDisplay',
]
const ASSISTANT_EMAIL = (process.env.ASSISTANT_EMAIL || 'elena.rostova@vancecap.com').toLowerCase()

const fail = (status, message) => {
  const error = new Error(message)
  error.status = status
  throw error
}

const assertMongo = () => {
  if (!isMongoConnected()) fail(503, 'MongoDB is unavailable; workspace data requires the configured database')
}

const threadIdentityFilter = (id) => {
  const clauses = [{ threadId: id }]
  if (mongoose.isObjectIdOrHexString(id)) clauses.push({ _id: id })
  return clauses.length === 1 ? clauses[0] : { $or: clauses }
}

const createLog = (action, user, metadata = {}) => ({
  id: `log-${randomUUID()}`,
  action,
  timestamp: new Date().toISOString(),
  user,
  metadata,
})

const normalizeActionKey = (task) => String(task || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(?:please|could|you|the|a|an|to|of|for|and|with|on|by|we|will|should|need)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const parseDate = (value, label, { endOfDay = true } = {}) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    fail(400, `${label} must be an ISO date or timestamp`)
  }
  const datePart = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) && endOfDay ? `${value}T23:59:59.999Z` : value)
  if (
    Number.isNaN(datePart.getTime())
    || datePart.toISOString().slice(0, 10) !== value.slice(0, 10)
    || Number.isNaN(date.getTime())
  ) {
    fail(400, `${label} is invalid`)
  }
  return date
}

const dateOnly = (value) => parseDate(value, 'Date', { endOfDay: false })
const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const usersById = (users) => {
  const index = new Map()
  for (const user of users) {
    index.set(String(user._id), user)
    if (user.email) index.set(user.email.toLowerCase(), user)
  }
  return index
}

const resolveClient = async (thread, users) => {
  const ownerEmail = String(thread.clientOwnerEmail || '').toLowerCase()
  const recipientEmail = (thread.recipients || [])
    .map((recipient) => String(recipient).toLowerCase())
    .find((email) => users.has(email))
  const client = (thread.clientId ? users.get(String(thread.clientId)) : null)
    || (ownerEmail ? users.get(ownerEmail) : null)
    || (recipientEmail ? users.get(recipientEmail) : null)
  const email = thread.clientOwnerEmail || client?.email || recipientEmail || ''
  return {
    id: client ? String(client._id) : null,
    name: client?.name || email || 'Unassigned client',
    email,
  }
}

const allThreads = async () => {
  assertMongo()
  return Thread.find({}).sort({ timestamp: -1 }).lean()
}

const actionDueDate = (action) => {
  if (action.dueAt) {
    const date = new Date(action.dueAt)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (action.deadline && /^\d{4}-\d{2}-\d{2}$/.test(action.deadline)) {
    try {
      return parseDate(action.deadline, 'Deadline')
    } catch {
      return null
    }
  }
  return null
}

const timezoneOffset = (timezone) => {
  const zone = String(timezone || '').trim()
  if (/^(?:UTC|GMT|Z)$/i.test(zone)) return 0
  const offset = zone.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!offset) return null
  const hours = Number(offset[2])
  const minutes = Number(offset[3])
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) return null
  return (offset[1] === '-' ? -1 : 1) * (hours * 60 + minutes)
}

const localDateAt = (instant, timezone) => {
  const offset = timezoneOffset(timezone)
  if (offset !== null) return new Date(instant.getTime() + offset * 60000).toISOString().slice(0, 10)
  if (!String(timezone || '').includes('/')) return null
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return null
  }
}

const meetingDate = (meeting) => {
  if (!meeting?.date || !/^\d{4}-\d{2}-\d{2}$/.test(meeting.date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(meeting.time || '')) return null
  if (!isValidDateOnly(meeting.date)) return null

  const [year, month, day] = meeting.date.split('-').map(Number)
  const [hour, minute] = meeting.time.split(':').map(Number)
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  const zone = String(meeting.timezone || '').trim()
  const offset = timezoneOffset(zone)
  if (offset !== null) return new Date(localAsUtc - offset * 60000)
  if (!zone.includes('/')) return null

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    const offsets = [-36, -12, 0, 12, 36].map((delta) => {
      const probe = localAsUtc + delta * 3600000
      const parts = Object.fromEntries(formatter.formatToParts(new Date(probe)).map((part) => [part.type, part.value]))
      const representedAsUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
      )
      return representedAsUtc - probe
    })
    const candidates = [...new Set(offsets)]
      .map((offsetMilliseconds) => new Date(localAsUtc - offsetMilliseconds))
      .filter((candidate) => {
        const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]))
        return Number(parts.year) === year
          && Number(parts.month) === month
          && Number(parts.day) === day
          && Number(parts.hour) === hour
          && Number(parts.minute) === minute
      })
    return candidates.length === 1 ? candidates[0] : null
  } catch {
    return null
  }
}

export const getMeetingSchedule = (meeting, now = new Date()) => {
  const validDate = isValidDateOnly(meeting?.date)
  const localToday = meeting?.timezone ? localDateAt(now, meeting.timezone) : null
  const dateTime = meetingDate(meeting)
  const hasTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(meeting?.time || '')
  const needsAttention = !meeting?.title || !validDate || !hasTime || !localToday || !dateTime
  let temporalStatus = null

  if (validDate && localToday && !(hasTime && !dateTime)) {
    if (meeting.date < localToday) temporalStatus = 'PAST'
    else if (meeting.date > localToday) temporalStatus = 'UPCOMING'
    else if (dateTime) temporalStatus = dateTime >= now ? 'UPCOMING' : 'PAST'
    else temporalStatus = 'TODAY'
  }

  return {
    dateTime: dateTime?.toISOString() || null,
    temporalStatus,
    needsAttention,
  }
}

const actionRecord = (thread, action, client) => {
  const dueAt = actionDueDate(action)
  return {
    id: action.id,
    threadId: thread.threadId,
    title: action.task,
    description: action.task,
    client,
    assignedTo: action.assignedTo || 'unknown',
    priority: action.priority || 'normal',
    dueAt: dueAt?.toISOString() || null,
    deadline: action.deadline || '',
    dateNeedsReview: Boolean(action.deadline && !dueAt),
    status: action.completed ? 'COMPLETED' : 'OPEN',
    completed: Boolean(action.completed),
    createdAt: action.createdAt || thread.createdAt || thread.timestamp,
    updatedAt: action.updatedAt || null,
    source: action.source || 'AI',
    delegated: thread.clientStatus === 'DELEGATED_TO_ASSISTANT',
    conversation: {
      subject: thread.subject,
      sender: thread.sender,
      classification: thread.classification,
    },
    isOverdue: !action.completed && Boolean(dueAt && dueAt < new Date()),
  }
}

const followUpRecord = (thread, client) => ({
  threadId: thread.threadId,
  subject: thread.subject,
  sender: thread.sender,
  client,
  status: thread.followUp?.status || 'WAITING',
  dueAt: thread.followUp?.dueAt || null,
  note: thread.followUp?.note || '',
  createdAt: thread.followUp?.createdAt || null,
  updatedAt: thread.followUp?.updatedAt || null,
  completedAt: thread.followUp?.completedAt || null,
  isOverdue: ['WAITING', 'SCHEDULED'].includes(thread.followUp?.status || 'WAITING')
    && Boolean(thread.followUp?.dueAt && new Date(thread.followUp.dueAt) < new Date()),
})

const meetingRecord = (thread, client) => ({
  ...thread.meeting,
  threadId: thread.threadId,
  client,
  conversation: { subject: thread.subject, sender: thread.sender },
  ...getMeetingSchedule(thread.meeting),
})

export const getWorkspaceOverview = async () => {
  const [threads, users] = await Promise.all([allThreads(), User.find({ role: 'CLIENT' }).lean()])
  const userIndex = usersById(users)
  const now = new Date()
  const actionItems = []
  const followUps = []
  const meetings = []
  let delegated = 0
  let review = 0

  for (const thread of threads) {
    const client = await resolveClient(thread, userIndex)
    for (const action of thread.actionItems || []) actionItems.push(actionRecord(thread, action, client))
    if (thread.followUp || thread.isWaiting) followUps.push(followUpRecord(thread, client))
    if (thread.meeting?.hasMeeting) meetings.push(meetingRecord(thread, client))
    if (thread.clientStatus === 'DELEGATED_TO_ASSISTANT' && !thread.isHandled) delegated += 1
    if (thread.classification === 'NEEDS_REVIEW' && !thread.isHandled) review += 1
  }

  return {
    actionItems: {
      pending: actionItems.filter((item) => item.status !== 'COMPLETED').length,
      overdue: actionItems.filter((item) => item.isOverdue).length,
      delegated,
      review,
    },
    followUps: {
      waiting: followUps.filter((item) => ['WAITING', 'SCHEDULED'].includes(item.status)).length,
      overdue: followUps.filter((item) => item.isOverdue).length,
      completed: followUps.filter((item) => item.status === 'COMPLETED').length,
    },
    meetings: {
      upcoming: meetings.filter((meeting) => meeting.status === 'SCHEDULED' && meeting.temporalStatus === 'UPCOMING').length,
      today: meetings.filter((meeting) => meeting.status === 'SCHEDULED' && meeting.temporalStatus === 'TODAY').length,
    },
  }
}

export const listActionItems = async (filters = {}) => {
  const [threads, users] = await Promise.all([allThreads(), User.find({ role: 'CLIENT' }).lean()])
  const userIndex = usersById(users)
  const items = []
  for (const thread of threads) {
    const client = await resolveClient(thread, userIndex)
    for (const action of thread.actionItems || []) items.push(actionRecord(thread, action, client))
  }

  const status = filters.status
  const query = String(filters.search || '').trim().toLowerCase()
  const priority = filters.priority
  return items.filter((item) => {
    if (status === 'OPEN' && item.status !== 'OPEN') return false
    if (status === 'COMPLETED' && item.status !== 'COMPLETED') return false
    if (status === 'OVERDUE' && !item.isOverdue) return false
    if (status === 'UPCOMING' && (item.status !== 'OPEN' || !item.dueAt || new Date(item.dueAt) < new Date())) return false
    if (status === 'DELEGATED' && !item.delegated) return false
    if (priority && priority !== 'ALL' && item.priority !== priority) return false
    if (!query) return true
    return [item.title, item.client.name, item.client.email, item.conversation.subject, item.assignedTo]
      .some((value) => String(value || '').toLowerCase().includes(query))
  })
}

export const updateWorkspaceActionItem = async (threadId, actionId, updates, user) => {
  assertMongo()
  const allowed = ['task', 'assignedTo', 'priority', 'dueAt', 'completed']
  const keys = Object.keys(updates || {})
  if (!keys.length || keys.some((key) => !allowed.includes(key))) fail(400, 'Unsupported action item update')

  const thread = await Thread.findOne(threadIdentityFilter(threadId))
  if (!thread) return null
  const item = thread.actionItems.find((action) => action.id === actionId)
  if (!item) return null

  if (updates.task !== undefined) {
    if (typeof updates.task !== 'string' || !updates.task.trim() || updates.task.trim().length > 1000) fail(400, 'Task must contain 1 to 1000 characters')
    const dedupeKey = normalizeActionKey(updates.task) || updates.task.trim().toLowerCase()
    const duplicate = thread.actionItems.some((action) => (
      action.id !== actionId && (normalizeActionKey(action.task) || String(action.task || '').trim().toLowerCase()) === dedupeKey
    ))
    if (duplicate) fail(409, 'An action item with this description already exists for the conversation')
    item.task = updates.task.trim()
    item.dedupeKey = dedupeKey
  }
  if (updates.assignedTo !== undefined) {
    if (!['assistant', 'client', 'unknown'].includes(updates.assignedTo)) fail(400, 'Assigned person is invalid')
    item.assignedTo = updates.assignedTo
  }
  if (updates.priority !== undefined) {
    if (!ACTION_PRIORITIES.includes(updates.priority)) fail(400, 'Priority is invalid')
    item.priority = updates.priority
  }
  if (updates.dueAt !== undefined) {
    item.dueAt = parseDate(updates.dueAt, 'Due date')
    item.deadline = item.dueAt ? item.dueAt.toISOString().slice(0, 10) : ''
  }
  if (updates.completed !== undefined) {
    if (typeof updates.completed !== 'boolean') fail(400, 'Completed must be a boolean')
    item.completed = updates.completed
  }
  item.source = 'USER'
  item.updatedAt = new Date()
  thread.activityLog.unshift(createLog(
    updates.completed === true ? 'Completed action item' : updates.completed === false ? 'Reopened action item' : 'Updated action item',
    user,
    { actionItemId: actionId, changedFields: keys },
  ))
  await thread.save()
  return item.toObject()
}

export const listFollowUps = async (statusFilter = 'ALL') => {
  if (statusFilter !== 'ALL' && !FOLLOW_UP_STATUSES.includes(statusFilter) && statusFilter !== 'OVERDUE') {
    fail(400, 'Follow-up status is invalid')
  }
  const [threads, users] = await Promise.all([allThreads(), User.find({ role: 'CLIENT' }).lean()])
  const userIndex = usersById(users)
  const records = []
  for (const thread of threads) {
    if (!thread.followUp && !thread.isWaiting) continue
    const record = followUpRecord(thread, await resolveClient(thread, userIndex))
    if (statusFilter === 'OVERDUE' && !record.isOverdue) continue
    if (statusFilter !== 'ALL' && statusFilter !== 'OVERDUE' && record.status !== statusFilter) continue
    records.push(record)
  }
  return records
}

export const updateFollowUp = async (threadId, updates, user) => {
  assertMongo()
  const allowed = ['status', 'dueAt', 'note']
  const keys = Object.keys(updates || {})
  if (!keys.length || keys.some((key) => !allowed.includes(key))) fail(400, 'Unsupported follow-up update')
  const thread = await Thread.findOne(threadIdentityFilter(threadId))
  if (!thread) return null

  const status = updates.status ?? thread.followUp?.status ?? 'WAITING'
  if (!FOLLOW_UP_STATUSES.includes(status)) fail(400, 'Follow-up status is invalid')
  if (updates.note !== undefined && (typeof updates.note !== 'string' || updates.note.length > 500)) {
    fail(400, 'Follow-up note must be 500 characters or fewer')
  }
  const dueAt = updates.dueAt === undefined
    ? thread.followUp?.dueAt || null
    : parseDate(updates.dueAt, 'Follow-up date')
  if (status === 'SCHEDULED' && !dueAt) fail(400, 'A scheduled follow-up requires a due date')

  const now = new Date()
  thread.followUp = {
    status,
    dueAt,
    note: updates.note === undefined ? thread.followUp?.note || '' : updates.note.trim(),
    createdAt: thread.followUp?.createdAt || now,
    updatedAt: now,
    completedAt: status === 'COMPLETED' ? now : null,
  }
  thread.isWaiting = ['WAITING', 'SCHEDULED'].includes(status)
  if (thread.isWaiting && !thread.waitingSince) thread.waitingSince = now.toISOString()
  thread.activityLog.unshift(createLog(`Follow-up ${status.toLowerCase()}`, user, { status, dueAt }))
  await thread.save()
  return followUpRecord(thread.toObject(), {
    id: thread.clientId ? String(thread.clientId) : null,
    name: thread.clientOwnerEmail || 'Unassigned client',
    email: thread.clientOwnerEmail || '',
  })
}

export const listMeetings = async (statusFilter = 'ALL') => {
  if (statusFilter !== 'ALL' && !MEETING_STATUSES.includes(statusFilter)) fail(400, 'Meeting status is invalid')
  const [threads, users] = await Promise.all([allThreads(), User.find({ role: 'CLIENT' }).lean()])
  const userIndex = usersById(users)
  const meetings = []
  for (const thread of threads) {
    if (!thread.meeting?.hasMeeting) continue
    const meeting = meetingRecord(thread, await resolveClient(thread, userIndex))
    if (statusFilter !== 'ALL' && meeting.status !== statusFilter) continue
    meetings.push(meeting)
  }
  return meetings.sort((a, b) => (a.dateTime || '').localeCompare(b.dateTime || ''))
}

export const updateMeeting = async (threadId, updates, user) => {
  assertMongo()
  const allowed = ['title', 'date', 'time', 'timezone', 'attendees', 'location', 'meetingLink', 'status']
  const keys = Object.keys(updates || {})
  if (!keys.length || keys.some((key) => !allowed.includes(key))) fail(400, 'Unsupported meeting update')
  const thread = await Thread.findOne(threadIdentityFilter(threadId))
  if (!thread?.meeting?.hasMeeting) return null

  for (const key of ['title', 'date', 'time', 'timezone', 'location', 'meetingLink']) {
    if (updates[key] === undefined) continue
    if (typeof updates[key] !== 'string') fail(400, `${key} must be a string`)
    const maxLength = key === 'title' ? 250 : key === 'location' ? 500 : 200
    if (updates[key].length > maxLength) fail(400, `${key} is too long`)
    if (key === 'date' && updates[key] && !dateOnly(updates[key])) fail(400, 'Meeting date is invalid')
    if (key === 'time' && updates[key] && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(updates[key])) fail(400, 'Meeting time must use HH:MM')
    if (key === 'meetingLink' && updates[key]) {
      let parsed
      try {
        parsed = new URL(updates[key])
      } catch {
        fail(400, 'Meeting link must be a valid HTTP or HTTPS URL')
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) fail(400, 'Meeting link must be a valid HTTP or HTTPS URL')
    }
    thread.meeting[key] = updates[key].trim()
  }
  if (updates.attendees !== undefined) {
    if (!Array.isArray(updates.attendees) || updates.attendees.length > 50 || updates.attendees.some((person) => typeof person !== 'string' || person.length > 200)) {
      fail(400, 'Meeting attendees must be a list of up to 50 names')
    }
    thread.meeting.attendees = updates.attendees.map((person) => person.trim()).filter(Boolean)
  }
  if (updates.status !== undefined) {
    if (!MEETING_STATUSES.includes(updates.status)) fail(400, 'Meeting status is invalid')
    thread.meeting.status = updates.status
  }
  thread.meeting.source = 'MANUAL'
  thread.meeting.updatedAt = new Date()
  thread.activityLog.unshift(createLog('Updated meeting details', user, { meetingFields: keys }))
  await thread.save()
  const client = thread.clientId
    ? await User.findById(thread.clientId).lean()
    : null
  return meetingRecord(thread.toObject(), {
    id: client ? String(client._id) : null,
    name: client?.name || thread.clientOwnerEmail || 'Unassigned client',
    email: client?.email || thread.clientOwnerEmail || '',
  })
}

export const getProfile = async (userId) => {
  assertMongo()
  const user = await User.findById(userId).select('name email role organization preferences').lean()
  if (!user) fail(404, 'User profile not found')
  return user
}

export const updateProfile = async (userId, updates = {}) => {
  assertMongo()
  const allowed = ['name', 'preferences']
  if (Object.keys(updates).some((key) => !allowed.includes(key))) fail(400, 'Unsupported profile update')
  const user = await User.findById(userId)
  if (!user) fail(404, 'User profile not found')
  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || !updates.name.trim() || updates.name.trim().length > 120) fail(400, 'Name must contain 1 to 120 characters')
    user.name = updates.name.trim()
  }
  if (updates.preferences !== undefined) {
    if (!updates.preferences || typeof updates.preferences !== 'object' || Array.isArray(updates.preferences)) fail(400, 'Preferences must be an object')
    const keys = Object.keys(updates.preferences)
    if (keys.some((key) => !PREFERENCE_KEYS.includes(key))) fail(400, 'Unsupported preference')
    for (const [key, value] of Object.entries(updates.preferences)) {
      if (key === 'defaultReplyTone' && !['professional', 'friendly', 'concise'].includes(value)) fail(400, 'Default reply tone is invalid')
      if (key === 'defaultInboxSegment' && !INBOX_SEGMENTS.includes(value)) fail(400, 'Default inbox segment is invalid')
      if (key !== 'defaultReplyTone' && key !== 'defaultInboxSegment' && typeof value !== 'boolean') fail(400, `${key} must be a boolean`)
      user.preferences[key] = value
    }
  }
  await user.save()
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    organization: user.organization,
    preferences: user.preferences,
  }
}

export const getEmailAccounts = async (userId, email) => {
  assertMongo()
  const user = await User.findById(userId).select('email').lean()
  if (!user) fail(404, 'User profile not found')
  const ownerEmail = (email || user.email || ASSISTANT_EMAIL).toLowerCase()
  const providers = ['GMAIL', 'OUTLOOK']
  const accounts = await Promise.all(providers.map((provider) => EmailAccount.findOneAndUpdate(
    { ownerEmail, provider },
    {
      $setOnInsert: {
        owner: user._id,
      },
      $set: {
        integrationMode: 'DEMO',
        connectionStatus: 'SIMULATED',
        syncStatus: 'SIMULATED',
        lastSynchronizationTime: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).select('_id ownerEmail provider connectionStatus syncStatus lastSynchronizationTime integrationMode updatedAt').lean()))
  return accounts.map((account) => ({
    id: String(account._id),
    ownerEmail: account.ownerEmail,
    provider: account.provider,
    connectionStatus: account.connectionStatus,
    syncStatus: account.syncStatus,
    lastSynchronizationTime: account.lastSynchronizationTime,
    integrationMode: account.integrationMode,
    updatedAt: account.updatedAt,
  }))
}

export const getAssistantSettings = async (userId, email) => {
  const [profile, emailAccounts] = await Promise.all([getProfile(userId), getEmailAccounts(userId, email)])
  return {
    profile,
    emailAccounts,
    application: {
      version: '0.1.0',
      aiProcessingMode: process.env.GEMINI_API_KEY ? 'Gemini (with rule-based demo fallback)' : 'Rule-Based Demo Processing',
      integrations: 'Gmail and Outlook are simulated; no live email or calendar integrations are active.',
    },
  }
}
