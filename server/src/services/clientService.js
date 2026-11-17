import fs from 'node:fs'
import path from 'node:path'
import { shouldUseMongo, getDbFilePath } from '../config/db.js'
import { Thread } from '../models/Thread.js'
import { User } from '../models/User.js'

const pendingClientStatuses = ['HANDLED_BY_CLIENT', 'DELEGATED_TO_ASSISTANT']

const loadLocalStore = () => {
  const file = getDbFilePath()
  if (!fs.existsSync(file)) return { threads: [], users: [] }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  return {
    ...parsed,
    threads: Array.isArray(parsed.threads) ? parsed.threads : [],
    users: Array.isArray(parsed.users) ? parsed.users : [],
  }
}

const saveLocalStore = (store) => {
  const file = getDbFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({
    ...store,
    updatedAt: new Date().toISOString(),
  }, null, 2), 'utf8')
}

const ownershipFilter = (identity) => ({
  $or: [
    {
      $and: [
        { clientId: identity.id },
        { $or: [{ clientOwnerEmail: identity.email }, { clientOwnerEmail: { $exists: false } }, { clientOwnerEmail: null }, { clientOwnerEmail: '' }] },
      ],
    },
    {
      $and: [
        { clientOwnerEmail: identity.email },
        { $or: [{ clientId: { $exists: false } }, { clientId: null }] },
      ],
    },
    {
      $and: [
        { $or: [{ clientId: { $exists: false } }, { clientId: null }] },
        { $or: [{ clientOwnerEmail: { $exists: false } }, { clientOwnerEmail: null }, { clientOwnerEmail: '' }] },
        { recipients: identity.email },
      ],
    },
  ],
})

const includesClient = (thread, identity) => {
  const email = identity.email.toLowerCase()
  const ownerEmail = String(thread.clientOwnerEmail || '').toLowerCase()
  const ownerId = thread.clientId ? String(thread.clientId) : ''
  if (ownerEmail || ownerId) {
    return (!ownerEmail || ownerEmail === email) && (!ownerId || ownerId === String(identity.id))
  }
  return Array.isArray(thread.recipients)
    && thread.recipients.some((recipient) => String(recipient).toLowerCase() === email)
}

const sortMessages = (messages = []) => [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

const toClientConversation = (thread) => {
  const source = typeof thread.toObject === 'function' ? thread.toObject() : thread
  return {
    id: source.threadId || source.id || String(source._id),
    sender: source.sender,
    recipients: source.recipients || [],
    cc: source.cc || [],
    subject: source.subject,
    preview: source.preview || source.body?.slice(0, 180) || '',
    body: source.body || '',
    timestamp: source.timestamp,
    dateStr: source.dateStr || '',
    classification: source.classification,
    priority: source.priority,
    isHandled: Boolean(source.isHandled),
    clientStatus: source.clientStatus || 'NOT_APPLICABLE',
    handledAt: source.handledAt || null,
    delegationNote: source.delegationNote || '',
    summary: source.summary || '',
    aiSource: source.aiSource || 'Rule-Based Demo Processing',
    aiConfidence: source.aiConfidence,
    classificationReason: source.classificationReason || source.aiReasoning || '',
    suggestedAction: source.suggestedAction || '',
    actionItems: source.actionItems || [],
    meeting: source.meeting || null,
    messages: sortMessages(source.messages || []),
    suggestedDraft: source.draftApprovalStatus === 'PENDING'
      ? source.suggestedDraft
      : null,
    draftApprovalStatus: source.draftApprovalStatus || 'NOT_REQUIRED',
    draftRejectionReason: source.draftRejectionReason || '',
  }
}

const logEntry = (action, identity, metadata = {}) => ({
  id: `client-log-${Date.now()}`,
  action,
  timestamp: new Date().toISOString(),
  user: identity.name,
  metadata,
})

const findOwnedThread = async (threadId, identity) => {
  if (shouldUseMongo()) {
    return Thread.findOne({ threadId, ...ownershipFilter(identity) })
  }
  const store = loadLocalStore()
  return store.threads.find((thread) => (
    (thread.id === threadId || thread.threadId === threadId) && includesClient(thread, identity)
  )) || null
}

export const getClientProfile = async (identity) => {
  if (shouldUseMongo()) {
    const user = await User.findOne({ email: identity.email, role: 'CLIENT' }).lean()
    return {
      id: user?._id ? String(user._id) : identity.id,
      name: user?.name || identity.name,
      email: identity.email,
      organization: user?.organization || 'Vance Capital',
      preferences: user?.preferences || identity.preferences,
    }
  }
  const store = loadLocalStore()
  const saved = store.users.find((user) => user.email === identity.email)
  return {
    id: saved?.id || identity.id,
    name: saved?.name || identity.name,
    email: identity.email,
    organization: saved?.organization || 'Vance Capital',
    preferences: saved?.preferences || identity.preferences,
  }
}

export const updateClientPreferences = async (identity, preferences) => {
  if (shouldUseMongo()) {
    const preferenceUpdates = Object.fromEntries(
      Object.entries(preferences).map(([key, value]) => [`preferences.${key}`, value]),
    )
    const user = await User.findOneAndUpdate(
      { email: identity.email, role: 'CLIENT' },
      { $set: preferenceUpdates },
      { new: true, runValidators: true },
    ).lean()
    if (!user) return null
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      organization: user.organization,
      preferences: user.preferences,
    }
  }
  const store = loadLocalStore()
  let user = store.users.find((entry) => entry.email === identity.email)
  if (!user) {
    user = { id: identity.id, email: identity.email, name: identity.name, role: 'CLIENT', organization: 'Vance Capital' }
    store.users.push(user)
  }
  user.preferences = { ...user.preferences, ...preferences }
  saveLocalStore(store)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organization: user.organization,
    preferences: user.preferences,
  }
}

export const getClientInbox = async (identity, includeHandled = false) => {
  let threads
  if (shouldUseMongo()) {
    const statusQuery = includeHandled
      ? { clientStatus: 'HANDLED_BY_CLIENT' }
      : { isHandled: false, clientStatus: { $nin: pendingClientStatuses } }
    threads = await Thread.find({
      classification: 'CLIENT_REPLY',
      ...statusQuery,
      ...ownershipFilter(identity),
    }).sort({ timestamp: -1 }).lean()
  } else {
    const store = loadLocalStore()
    threads = store.threads.filter((thread) => {
      if (thread.classification !== 'CLIENT_REPLY' || !includesClient(thread, identity)) return false
      if (includeHandled) return thread.clientStatus === 'HANDLED_BY_CLIENT'
      return !thread.isHandled && !pendingClientStatuses.includes(thread.clientStatus)
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }
  return threads.map(toClientConversation)
}

export const getClientConversation = async (threadId, identity) => {
  const thread = await findOwnedThread(threadId, identity)
  return thread?.classification === 'CLIENT_REPLY' ? toClientConversation(thread) : null
}

export const markClientHandled = async (threadId, identity, handled = true) => {
  const now = new Date()
  const update = handled
    ? {
        $set: {
          clientOwnerEmail: identity.email,
          clientId: shouldUseMongo() ? identity.id : null,
          isHandled: true,
          clientStatus: 'HANDLED_BY_CLIENT',
          handledAt: now,
          handledBy: identity.email,
        },
        $push: { activityLog: logEntry('Client marked conversation handled', identity) },
      }
    : {
        $set: {
          clientOwnerEmail: identity.email,
          clientId: shouldUseMongo() ? identity.id : null,
          isHandled: false,
          clientStatus: 'PENDING_CLIENT_ACTION',
          handledAt: null,
          handledBy: '',
        },
        $push: { activityLog: logEntry('Client reopened conversation', identity) },
      }

  if (shouldUseMongo()) {
    const thread = await Thread.findOneAndUpdate({
      threadId,
      classification: 'CLIENT_REPLY',
      ...ownershipFilter(identity),
      ...(handled ? { isHandled: false, clientStatus: { $nin: pendingClientStatuses } } : { clientStatus: 'HANDLED_BY_CLIENT' }),
    }, update, { new: true, runValidators: true })
    return thread ? toClientConversation(thread) : null
  }
  const store = loadLocalStore()
  const thread = store.threads.find((entry) => entry.threadId === threadId || entry.id === threadId)
  if (!thread || thread.classification !== 'CLIENT_REPLY' || !includesClient(thread, identity)) return null
  if (handled && (thread.isHandled || pendingClientStatuses.includes(thread.clientStatus))) return null
  if (!handled && thread.clientStatus !== 'HANDLED_BY_CLIENT') return null
  Object.assign(thread, update.$set)
  thread.activityLog = [update.$push.activityLog, ...(thread.activityLog || [])]
  saveLocalStore(store)
  return toClientConversation(thread)
}

export const delegateClientConversation = async (threadId, identity, instruction = '') => {
  const previous = await findOwnedThread(threadId, identity)
  if (!previous || previous.classification !== 'CLIENT_REPLY' || previous.isHandled || pendingClientStatuses.includes(previous.clientStatus)) return null
  const reason = `Delegated to assistant by ${identity.name}`
  const now = new Date()
  const entry = logEntry('Client delegated conversation to assistant', identity, { instruction })
  const audit = {
    classification: 'ASSISTANT_REPLY',
    previousClassification: 'CLIENT_REPLY',
    reason,
    user: identity.email,
    timestamp: now,
  }
  const fields = {
    classification: 'ASSISTANT_REPLY',
    classificationManual: true,
    classificationReason: reason,
    clientStatus: 'DELEGATED_TO_ASSISTANT',
    clientOwnerEmail: identity.email,
    clientId: shouldUseMongo() ? identity.id : null,
    delegatedAt: now,
    delegatedBy: identity.email,
    delegationNote: instruction.trim(),
    isHandled: false,
  }

  if (shouldUseMongo()) {
    const thread = await Thread.findOneAndUpdate({
      threadId,
      classification: 'CLIENT_REPLY',
      isHandled: false,
      clientStatus: { $nin: pendingClientStatuses },
      ...ownershipFilter(identity),
    }, {
      $set: fields,
      $push: { activityLog: entry, classificationAudit: audit },
    }, { new: true, runValidators: true })
    return thread ? toClientConversation(thread) : null
  }

  const store = loadLocalStore()
  const thread = store.threads.find((entry) => (entry.id === threadId || entry.threadId === threadId) && includesClient(entry, identity))
  if (!thread || thread.classification !== 'CLIENT_REPLY' || thread.isHandled || pendingClientStatuses.includes(thread.clientStatus)) return null
  Object.assign(thread, fields)
  thread.activityLog = [entry, ...(thread.activityLog || [])]
  thread.classificationAudit = [...(thread.classificationAudit || []), audit]
  saveLocalStore(store)
  return toClientConversation(thread)
}

export const submitClientResponse = async (threadId, identity, body) => {
  const existing = await findOwnedThread(threadId, identity)
  if (!existing || existing.classification !== 'CLIENT_REPLY' || existing.isHandled || pendingClientStatuses.includes(existing.clientStatus)) return null
  const message = {
    id: `client-reply-${Date.now()}`,
    sender: { name: identity.name, email: identity.email, avatar: identity.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2), isMe: true },
    recipients: existing.sender?.email ? [existing.sender.email] : [],
    cc: [],
    timestamp: new Date(),
    dateStr: 'Just now',
    body: body.trim(),
  }
  const entry = logEntry('Client submitted an explicitly approved simulated response', identity)
  const fields = {
    clientOwnerEmail: identity.email,
    clientId: shouldUseMongo() ? identity.id : null,
    isHandled: true,
    clientStatus: 'HANDLED_BY_CLIENT',
    handledAt: new Date(),
    handledBy: identity.email,
    preview: body.trim().slice(0, 180),
    body: body.trim(),
  }
  if (shouldUseMongo()) {
    const thread = await Thread.findOneAndUpdate({
      threadId,
      classification: 'CLIENT_REPLY',
      isHandled: false,
      clientStatus: { $nin: pendingClientStatuses },
      ...ownershipFilter(identity),
    }, {
      $set: fields,
      $push: { messages: message, activityLog: entry },
    }, { new: true, runValidators: true })
    return thread ? toClientConversation(thread) : null
  }
  const store = loadLocalStore()
  const thread = store.threads.find((item) => (item.id === threadId || item.threadId === threadId) && includesClient(item, identity))
  if (!thread || thread.classification !== 'CLIENT_REPLY' || thread.isHandled || pendingClientStatuses.includes(thread.clientStatus)) return null
  Object.assign(thread, fields)
  thread.messages = [...(thread.messages || []), message]
  thread.activityLog = [entry, ...(thread.activityLog || [])]
  saveLocalStore(store)
  return toClientConversation(thread)
}

export const getDraftsAwaitingClientApproval = async (identity) => {
  let threads
  if (shouldUseMongo()) {
    threads = await Thread.find({
      draftApprovalStatus: 'PENDING',
      isHandled: false,
      classification: 'CLIENT_REPLY',
      ...ownershipFilter(identity),
    }).sort({ timestamp: -1 }).lean()
  } else {
    const store = loadLocalStore()
    threads = store.threads.filter((thread) => (
      thread.draftApprovalStatus === 'PENDING'
      && !thread.isHandled
      && thread.classification === 'CLIENT_REPLY'
      && includesClient(thread, identity)
    ))
  }
  return threads.map(toClientConversation)
}

export const decideClientDraft = async (threadId, identity, decision, reason = '') => {
  const approved = decision === 'APPROVED'
  const now = new Date()
  const entry = logEntry(`Client ${approved ? 'approved' : 'rejected'} assistant draft`, identity, { reason })
  const fields = {
    draftApprovalStatus: decision,
    draftDecisionBy: identity.email,
    draftApprovedAt: approved ? now : null,
    draftRejectedAt: approved ? null : now,
    draftRejectionReason: approved ? '' : reason,
    clientStatus: approved ? 'HANDLED_BY_CLIENT' : 'PENDING_CLIENT_ACTION',
    clientOwnerEmail: identity.email,
    clientId: shouldUseMongo() ? identity.id : null,
  }
  if (shouldUseMongo()) {
    const thread = await Thread.findOneAndUpdate({
      threadId,
      draftApprovalStatus: 'PENDING',
      classification: 'CLIENT_REPLY',
      isHandled: false,
      ...ownershipFilter(identity),
    }, {
      $set: fields,
      $push: { activityLog: entry },
    }, { new: true, runValidators: true })
    return thread ? toClientConversation(thread) : null
  }
  const store = loadLocalStore()
  const thread = store.threads.find((item) => (item.id === threadId || item.threadId === threadId) && includesClient(item, identity))
  if (!thread || thread.draftApprovalStatus !== 'PENDING' || thread.classification !== 'CLIENT_REPLY' || thread.isHandled) return null
  Object.assign(thread, fields)
  thread.activityLog = [entry, ...(thread.activityLog || [])]
  saveLocalStore(store)
  return toClientConversation(thread)
}