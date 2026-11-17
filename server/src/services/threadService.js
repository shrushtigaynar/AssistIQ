import fs from 'fs'
import path from 'path'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { shouldUseMongo, getDbFilePath } from '../config/db.js'
import { Thread } from '../models/Thread.js'
import { ActivityLog } from '../models/ActivityLog.js'
import { SEED_THREADS } from './seedData.js'
import {
  analyzeThread,
  analyzeConversation,
  answerConversationQuestion,
  classifyAndPersistThread,
  generateReplyDraft,
} from './aiService.js'

export const VALID_CLASSIFICATIONS = ['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW']
const VALID_BULK_ACTIONS = ['markRead', 'markUnread', 'markImportant', 'archive', 'restore', 'reclassify']

const threadIdentityFilter = (id) => {
  const clauses = [{ threadId: id }]
  if (mongoose.isObjectIdOrHexString(id)) clauses.push({ _id: id })
  return clauses.length === 1 ? clauses[0] : { $or: clauses }
}

const threadIdentitiesFilter = (ids) => {
  const clauses = [{ threadId: { $in: ids } }]
  const objectIds = ids.filter((id) => mongoose.isObjectIdOrHexString(id))
  if (objectIds.length) clauses.push({ _id: { $in: objectIds } })
  return { $or: clauses }
}

// In-Memory & File Store Fallback Helper
const loadFromFile = () => {
  const filePath = getDbFilePath()
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed.threads) && parsed.threads.length > 0) {
        return parsed.threads
      }
    }
  } catch (err) {
    console.error('[threadService] Failed reading DB file, using seed data:', err.message)
  }
  // Initialize with seed data
  saveToFile(SEED_THREADS)
  return JSON.parse(JSON.stringify(SEED_THREADS))
}

const saveToFile = (threads) => {
  const filePath = getDbFilePath()
  try {
    let existing = {}
    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
    fs.writeFileSync(filePath, JSON.stringify({
      ...existing,
      threads,
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8')
  } catch (err) {
    console.error('[threadService] Failed saving to DB file:', err.message)
    throw err
  }
}

const escapedSearchRegex = (search) => {
  const searchText = typeof search === 'string' ? search.trim().slice(0, 100) : ''
  if (!searchText) return null
  return new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

const threadSearchValues = (thread) => [
  thread.subject,
  thread.preview,
  thread.body,
  thread.sender?.name,
  thread.sender?.email,
  thread.sender?.company,
  ...(thread.recipients || []),
  ...(thread.cc || []),
  ...(thread.messages || []).flatMap((message) => [
    message.body,
    message.sender?.name,
    message.sender?.email,
    message.sender?.company,
    ...(message.recipients || []),
    ...(message.cc || []),
  ]),
]

const mongoSearchConditions = (regex) => ({
  $or: [
    { subject: regex },
    { preview: regex },
    { body: regex },
    { 'sender.name': regex },
    { 'sender.email': regex },
    { 'sender.company': regex },
    { recipients: regex },
    { cc: regex },
    { 'messages.body': regex },
    { 'messages.sender.name': regex },
    { 'messages.sender.email': regex },
    { 'messages.sender.company': regex },
    { 'messages.recipients': regex },
    { 'messages.cc': regex },
  ],
})

const enrichAiMetadata = (thread = {}) => {
  if (!thread || typeof thread !== 'object') {
    return thread
  }

  const ai = analyzeThread(thread)
  const hasExistingDraft = thread.suggestedDraft && Object.values(thread.suggestedDraft).some(value => value && String(value).trim())

  return {
    ...thread,
    id: thread.id || thread.threadId || String(thread._id || ''),
    threadId: thread.threadId || thread.id || String(thread._id || ''),
    classification: thread.classification || ai.classification,
    aiConfidence: typeof thread.aiConfidence === 'number' ? thread.aiConfidence : ai.aiConfidence,
    aiReasoning: thread.aiReasoning || ai.aiReasoning,
    classificationReason: thread.classificationReason || ai.classificationReason,
    aiSuggestedClassification: thread.aiSuggestedClassification || ai.aiSuggestedClassification,
    suggestedAction: thread.suggestedAction || ai.suggestedAction,
    summary: thread.summary || ai.summary,
    meeting: thread.meeting || ai.meeting || null,
    actionItems: Array.isArray(thread.actionItems) && thread.actionItems.length ? thread.actionItems : ai.actionItems,
    suggestedDraft: hasExistingDraft ? thread.suggestedDraft : ai.suggestedDraft,
    aiSource: thread.aiSource || ai.aiSource,
    isWaiting: thread.isWaiting ?? ai.isWaiting,
  }
}

const normalizeActionKey = (task) => String(task || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(?:please|could|you|the|a|an|to|of|for|and|with|on|by|we|will|should|need)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const mergeActionItems = (existing = [], extracted = []) => {
  const items = new Map()
  for (const item of existing) {
    const key = normalizeActionKey(item.task) || item.dedupeKey
    if (!key) continue
    items.set(key, { ...item, dedupeKey: key })
  }
  for (const item of extracted) {
    const key = normalizeActionKey(item.task)
    if (!key) continue
    const previous = items.get(key)
    const merged = previous?.source === 'USER'
      ? { ...item, ...previous }
      : { ...previous, ...item }
    items.set(key, {
      ...merged,
      id: previous?.id || `ai-${key.replace(/\s+/g, '-').slice(0, 60)}`,
      dedupeKey: key,
      completed: previous ? previous.completed : Boolean(item.completed),
      createdAt: previous?.createdAt || item.createdAt || (previous ? null : new Date()),
      updatedAt: previous?.updatedAt || item.updatedAt || (previous ? null : new Date()),
      dueAt: previous?.source === 'USER'
        ? previous.dueAt ?? null
        : previous?.dueAt || item.dueAt || null,
      source: previous?.source || item.source || 'AI',
    })
  }
  return [...items.values()]
}

export const mergePersistedAnalysis = (thread, analysis) => {
  const extractedMeeting = analysis.meeting || {
    hasMeeting: false,
    title: '',
    date: '',
    time: '',
    timezone: '',
    attendees: [],
    location: '',
    meetingLink: '',
  }
  const currentMeeting = thread.meeting || {}
  const meeting = currentMeeting.source === 'MANUAL'
    ? currentMeeting
    : {
        ...extractedMeeting,
        status: currentMeeting.status || extractedMeeting.status || 'SCHEDULED',
        source: 'AI',
        updatedAt: currentMeeting.updatedAt || null,
      }

  return {
    aiSuggestedClassification: analysis.aiSuggestedClassification || analysis.classification,
    aiConfidence: analysis.aiConfidence,
    aiReasoning: analysis.aiReasoning,
    classificationReason: thread.classificationManual
      ? thread.classificationReason
      : analysis.classificationReason || analysis.aiReasoning,
    classification: thread.classificationManual ? thread.classification : analysis.classification,
    suggestedAction: analysis.suggestedAction,
    summary: analysis.summary,
    meeting,
    actionItems: mergeActionItems(thread.actionItems || [], analysis.actionItems || []),
    aiSource: analysis.aiSource,
    followUp: thread.followUp || null,
    isWaiting: ['WAITING', 'SCHEDULED'].includes(thread.followUp?.status)
      ? true
      : ['COMPLETED', 'CANCELLED'].includes(thread.followUp?.status)
        ? false
        : analysis.isWaiting,
  }
}

export const analyzeAndPersistThread = async (id) => {
  const thread = shouldUseMongo()
    ? await Thread.findOne(threadIdentityFilter(id))
    : loadFromFile().find((item) => item.id === id || item.threadId === id)
  if (!thread) return null

  const plainThread = typeof thread.toObject === 'function' ? thread.toObject() : thread
  const analysis = await analyzeConversation(plainThread)
  const nextFields = mergePersistedAnalysis(plainThread, analysis)
  const historyEntry = {
    classification: analysis.classification,
    confidence: analysis.aiConfidence,
    source: analysis.aiSource,
    timestamp: new Date(),
  }

  if (shouldUseMongo()) {
    Object.assign(thread, nextFields)
    thread.analysisHistory.push(historyEntry)
    await thread.save()
    return thread.toObject()
  }

  const threads = loadFromFile()
  const index = threads.findIndex((item) => item.id === id || item.threadId === id)
  if (index < 0) return null
  threads[index] = {
    ...threads[index],
    ...nextFields,
    analysisHistory: [...(threads[index].analysisHistory || []), historyEntry],
  }
  saveToFile(threads)
  return threads[index]
}

export const getThreadAnalysis = async (id) => {
  const thread = await getThreadById(id)
  if (!thread) return null
  return {
    classification: thread.classification,
    aiSuggestedClassification: thread.aiSuggestedClassification,
    aiConfidence: thread.aiConfidence,
    aiReasoning: thread.aiReasoning,
    classificationReason: thread.classificationReason,
    summary: thread.summary,
    suggestedAction: thread.suggestedAction,
    actionItems: thread.actionItems || [],
    meeting: thread.meeting || null,
    aiSource: thread.aiSource || 'Rule-Based Demo Processing',
  }
}

export const createThreadReplyDraft = async (id, tone) => {
  const thread = await getThreadById(id)
  if (!thread) return null
  const draft = await generateReplyDraft(thread, tone)
  const saved = await saveDraft(id, draft)
  return saved ? { ...saved, generatedDraft: draft } : null
}

export const answerThreadQuestion = async (id, question) => {
  const thread = await getThreadById(id)
  if (!thread) return null
  return answerConversationQuestion(thread, question)
}

// Service Methods
export const getCounts = async () => {
  if (shouldUseMongo()) {
    const unhandled = await Thread.find({ isHandled: false }).lean()
    const archivedCount = await Thread.countDocuments({ isHandled: true })
    return {
      primary: unhandled.length,
      assistant: unhandled.filter(t => t.classification === 'ASSISTANT_REPLY').length,
      client: unhandled.filter(t => t.classification === 'CLIENT_REPLY').length,
      needsReview: unhandled.filter(t => t.classification === 'NEEDS_REVIEW').length,
      waiting: unhandled.filter(t => t.isWaiting).length,
      noReply: unhandled.filter(t => t.classification === 'NO_REPLY_NEEDED').length,
      important: unhandled.filter(t => t.isImportant || t.isStarred).length,
      general: unhandled.filter(t => t.priority === 'normal' || t.priority === 'low').length,
      archived: archivedCount,
    }
  } else {
    const threads = loadFromFile().map(enrichAiMetadata)
    const unhandled = threads.filter(t => !t.isHandled)
    return {
      primary: unhandled.length,
      assistant: unhandled.filter(t => t.classification === 'ASSISTANT_REPLY').length,
      client: unhandled.filter(t => t.classification === 'CLIENT_REPLY').length,
      needsReview: unhandled.filter(t => t.classification === 'NEEDS_REVIEW').length,
      waiting: unhandled.filter(t => t.isWaiting).length,
      noReply: unhandled.filter(t => t.classification === 'NO_REPLY_NEEDED').length,
      important: unhandled.filter(t => t.isImportant || t.isStarred).length,
      general: unhandled.filter(t => t.priority === 'normal' || t.priority === 'low').length,
      archived: threads.filter(t => t.isHandled).length,
    }
  }
}

export const getAllThreads = async (query = {}) => {
  const { segment = 'PRIMARY_INBOX', priority, unreadOnly, importantOnly, search, sort = 'newest' } = query

  let list = []
  if (shouldUseMongo()) {
    let mongoQuery = {}
    const additionalConditions = []
    if (segment === 'ARCHIVED') {
      mongoQuery.isHandled = true
    } else {
      mongoQuery.isHandled = false
      if (segment === 'ASSISTANT_REPLY') mongoQuery.classification = 'ASSISTANT_REPLY'
      if (segment === 'CLIENT_REPLY') mongoQuery.classification = 'CLIENT_REPLY'
      if (segment === 'NEEDS_REVIEW') mongoQuery.classification = 'NEEDS_REVIEW'
      if (segment === 'NO_REPLY_NEEDED') mongoQuery.classification = 'NO_REPLY_NEEDED'
      if (segment === 'WAITING_FOR') mongoQuery.isWaiting = true
      if (segment === 'IMPORTANT') additionalConditions.push({ $or: [{ isImportant: true }, { isStarred: true }] })
      if (segment === 'GENERAL') mongoQuery.priority = { $in: ['normal', 'low'] }
    }

    if (priority && priority !== 'ALL') mongoQuery.priority = priority
    if (unreadOnly === 'true') mongoQuery.isRead = false
    if (importantOnly === 'true') additionalConditions.push({ $or: [{ isImportant: true }, { isStarred: true }] })

    const searchRegex = escapedSearchRegex(search)
    if (searchRegex) additionalConditions.push(mongoSearchConditions(searchRegex))
    if (additionalConditions.length) mongoQuery.$and = additionalConditions

    let sortObj = { timestamp: -1 }
    if (sort === 'oldest') sortObj = { timestamp: 1 }

    list = await Thread.find(mongoQuery).sort(sortObj).lean()
    list = list.map(enrichAiMetadata)
  } else {
    const all = loadFromFile().map(enrichAiMetadata)
    list = all.filter(t => {
      if (segment === 'ARCHIVED') {
        if (!t.isHandled) return false
      } else {
        if (t.isHandled) return false
        if (segment === 'ASSISTANT_REPLY' && t.classification !== 'ASSISTANT_REPLY') return false
        if (segment === 'CLIENT_REPLY' && t.classification !== 'CLIENT_REPLY') return false
        if (segment === 'NEEDS_REVIEW' && t.classification !== 'NEEDS_REVIEW') return false
        if (segment === 'NO_REPLY_NEEDED' && t.classification !== 'NO_REPLY_NEEDED') return false
        if (segment === 'WAITING_FOR' && !t.isWaiting) return false
        if (segment === 'IMPORTANT' && !(t.isImportant || t.isStarred)) return false
        if (segment === 'GENERAL' && !(t.priority === 'normal' || t.priority === 'low')) return false
      }

      if (priority && priority !== 'ALL' && t.priority !== priority) return false
      if (unreadOnly === 'true' && t.isRead) return false
      if (importantOnly === 'true' && !(t.isImportant || t.isStarred)) return false

      const searchRegex = escapedSearchRegex(search)
      if (searchRegex && !threadSearchValues(t).some((value) => searchRegex.test(String(value || '')))) return false
      return true
    })

    list.sort((a, b) => {
      if (sort === 'newest') return new Date(b.timestamp) - new Date(a.timestamp)
      if (sort === 'oldest') return new Date(a.timestamp) - new Date(b.timestamp)
      if (sort === 'priority') {
        const priorityScore = { urgent: 4, high: 3, normal: 2, low: 1 }
        return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0)
      }
      return 0
    })
  }

  return list
}

export const getThreadById = async (id) => {
  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id)).lean()
    return thread ? enrichAiMetadata(thread) : null
  } else {
    const threads = loadFromFile()
    return threads.find(t => t.id === id || t.threadId === id) ? enrichAiMetadata(threads.find(t => t.id === id || t.threadId === id)) : null
  }
}

export const updateConversation = async (id, updates = {}, user = 'Elena Rostova (PA)') => {
  if (updates.classification) {
    return updateClassification(id, updates.classification, updates.reason || '', user)
  }

  const normalized = { ...updates }
  delete normalized.reason
  delete normalized.user

  if (Object.keys(normalized).length === 0) {
    return getThreadById(id)
  }

  return updateStatus(id, normalized, user)
}

export const updateReadStatus = async (id, isRead, user = 'Elena Rostova (PA)') => updateStatus(id, { isRead }, user)

export const markImportant = async (id, isImportant, user = 'Elena Rostova (PA)') => {
  const updates = { isImportant, isStarred: isImportant }
  return updateStatus(id, updates, user)
}

export const markHandled = async (id, user = 'Elena Rostova (PA)') => updateStatus(id, { isHandled: true }, user)
export const archiveConversation = async (id, user = 'Elena Rostova (PA)') => updateStatus(id, { isHandled: true }, user)
export const restoreConversation = async (id, user = 'Elena Rostova (PA)') => updateStatus(id, { isHandled: false }, user)

export const getMessages = async (id) => {
  const thread = await getThreadById(id)
  return thread?.messages || []
}

export const addMessage = async (id, messageData = {}) => {
  const newMsg = {
    id: `msg-${Date.now()}`,
    sender: messageData.sender || {
      name: 'Elena Rostova',
      email: 'elena.rostova@vancecap.com',
      avatar: 'ER',
      company: 'Vance Capital',
      isMe: true,
    },
    recipients: Array.isArray(messageData.recipients) ? messageData.recipients : [messageData.to || ''],
    cc: Array.isArray(messageData.cc) ? messageData.cc : (messageData.cc ? messageData.cc.split(',').map(s => s.trim()) : []),
    timestamp: new Date(),
    dateStr: 'Just now',
    body: messageData.body || '',
  }

  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id))
    if (!thread) return null
    thread.messages.push(newMsg)
    await thread.save()
    await analyzeAndPersistThread(id)
    return getThreadById(id)
  }

  const threads = loadFromFile()
  const index = threads.findIndex(t => t.id === id || t.threadId === id)
  if (index === -1) return null
  threads[index].messages = [...(threads[index].messages || []), newMsg]
  saveToFile(threads)
  await analyzeAndPersistThread(id)
  return getThreadById(id)
}

export const getDrafts = async (id = null) => {
  let list
  if (shouldUseMongo()) {
    if (id) {
      const thread = await Thread.findOne(threadIdentityFilter(id)).lean()
      list = thread ? [thread] : []
    } else {
      list = await Thread.find({}).lean()
    }
  } else {
    const threads = loadFromFile()
    list = id ? threads.filter(t => t.id === id || t.threadId === id) : threads
  }
  return list
    .filter(t => t.suggestedDraft && (t.suggestedDraft.body || t.suggestedDraft.subject || t.suggestedDraft.to))
    .map(t => ({
      ...t.suggestedDraft,
      threadId: t.threadId || t.id,
      conversationId: t.threadId || t.id,
      id: `${t.threadId || t.id}-draft`,
    }))
}

export const deleteDraft = async (id) => {
  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id))
    if (!thread) return null
    thread.suggestedDraft = { to: '', cc: '', subject: '', body: '', tone: 'Executive Concise' }
    await thread.save()
    return thread.toObject()
  }

  const threads = loadFromFile()
  const index = threads.findIndex(t => t.id === id || t.threadId === id)
  if (index === -1) return null
  threads[index].suggestedDraft = { to: '', cc: '', subject: '', body: '', tone: 'Executive Concise' }
  saveToFile(threads)
  return threads[index]
}

export const getNotes = async (id) => {
  const thread = await getThreadById(id)
  return thread?.internalNotes || []
}

export const getActionItems = async (id = null) => {
  if (shouldUseMongo()) {
    if (id) {
      const thread = await Thread.findOne(threadIdentityFilter(id)).lean()
      return thread?.actionItems || []
    }
    const threads = await Thread.find({}).lean()
    return threads.flatMap(thread => (thread.actionItems || []).map(item => ({ ...item, threadId: thread.threadId || thread.id })))
  }

  const threads = loadFromFile()
  const source = id ? threads.filter(t => t.id === id || t.threadId === id) : threads
  return source.flatMap(thread => (thread.actionItems || []).map(item => ({ ...item, threadId: thread.threadId || thread.id })))
}

export const createActionItem = async (threadId, itemData = {}, user = 'Elena Rostova (PA)') => {
  const task = typeof itemData.task === 'string' ? itemData.task.trim() : ''
  if (!task || task.length > 1000) {
    const error = new Error('Action item task must contain 1 to 1000 characters')
    error.status = 400
    throw error
  }
  if (itemData.assignedTo !== undefined && !['assistant', 'client', 'unknown'].includes(itemData.assignedTo)) {
    const error = new Error('Assigned person is invalid')
    error.status = 400
    throw error
  }
  if (itemData.priority !== undefined && !['low', 'normal', 'high', 'urgent'].includes(itemData.priority)) {
    const error = new Error('Priority is invalid')
    error.status = 400
    throw error
  }
  if (itemData.completed !== undefined && typeof itemData.completed !== 'boolean') {
    const error = new Error('Completed must be a boolean')
    error.status = 400
    throw error
  }
  const dueAt = parseActionDueAt(itemData.dueAt)
  const newItem = {
    id: `act-${randomUUID()}`,
    task,
    assignedTo: itemData.assignedTo || 'assistant',
    completed: itemData.completed ?? false,
    deadline: itemData.deadline || (dueAt ? dueAt.toISOString().slice(0, 10) : ''),
    dueAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    priority: itemData.priority || 'normal',
    needsReview: !!itemData.needsReview,
    source: 'USER',
    dedupeKey: normalizeActionKey(task) || task.toLowerCase(),
  }

  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(threadId))
    if (!thread) return null
    if (thread.actionItems.some((item) => (normalizeActionKey(item.task) || String(item.task || '').trim().toLowerCase()) === newItem.dedupeKey)) {
      const error = new Error('An action item with this description already exists for the conversation')
      error.status = 409
      throw error
    }
    thread.actionItems.push(newItem)
    thread.activityLog.unshift(createActionItemLog('Created action item', threadId, newItem.id, user))
    await thread.save()
    return thread.toObject()
  }

  const threads = loadFromFile()
  const index = threads.findIndex(t => t.id === threadId || t.threadId === threadId)
  if (index === -1) return null
  if ((threads[index].actionItems || []).some((item) => (normalizeActionKey(item.task) || String(item.task || '').trim().toLowerCase()) === newItem.dedupeKey)) {
    const error = new Error('An action item with this description already exists for the conversation')
    error.status = 409
    throw error
  }
  threads[index].actionItems = [...(threads[index].actionItems || []), newItem]
  threads[index].activityLog = [createActionItemLog('Created action item', threadId, newItem.id, user), ...(threads[index].activityLog || [])]
  saveToFile(threads)
  return threads[index]
}

export const updateActionItem = async (threadId, actionId, updates = {}, user = 'Elena Rostova (PA)') => {
  const allowed = ['task', 'assignedTo', 'priority', 'dueAt', 'completed', 'needsReview']
  if (Object.keys(updates).some((key) => !allowed.includes(key))) {
    const error = new Error('Unsupported action item update')
    error.status = 400
    throw error
  }
  const sanitized = { ...updates }
  if (sanitized.task !== undefined) {
    if (typeof sanitized.task !== 'string' || !sanitized.task.trim() || sanitized.task.trim().length > 1000) {
      const error = new Error('Action item task must contain 1 to 1000 characters')
      error.status = 400
      throw error
    }
    sanitized.task = sanitized.task.trim()
    sanitized.dedupeKey = normalizeActionKey(sanitized.task) || sanitized.task.toLowerCase()
  }
  if (sanitized.dueAt !== undefined) {
    sanitized.dueAt = parseActionDueAt(sanitized.dueAt)
    sanitized.deadline = sanitized.dueAt ? sanitized.dueAt.toISOString().slice(0, 10) : ''
  }
  if (sanitized.assignedTo !== undefined && !['assistant', 'client', 'unknown'].includes(sanitized.assignedTo)) {
    const error = new Error('Assigned person is invalid')
    error.status = 400
    throw error
  }
  if (sanitized.priority !== undefined && !['low', 'normal', 'high', 'urgent'].includes(sanitized.priority)) {
    const error = new Error('Priority is invalid')
    error.status = 400
    throw error
  }
  if (sanitized.completed !== undefined && typeof sanitized.completed !== 'boolean') {
    const error = new Error('Completed must be a boolean')
    error.status = 400
    throw error
  }
  if (sanitized.needsReview !== undefined && typeof sanitized.needsReview !== 'boolean') {
    const error = new Error('Needs review must be a boolean')
    error.status = 400
    throw error
  }

  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(threadId))
    if (!thread) return null
    const item = thread.actionItems.find(a => a.id === actionId)
    if (!item) return null
    if (sanitized.dedupeKey && thread.actionItems.some((other) => (
      other.id !== actionId && normalizeActionKey(other.task) === sanitized.dedupeKey
    ))) {
      const error = new Error('An action item with this description already exists for the conversation')
      error.status = 409
      throw error
    }
    Object.assign(item, sanitized, { updatedAt: new Date(), source: 'USER' })
    thread.activityLog.unshift(createActionItemLog('Updated action item', threadId, actionId, user, Object.keys(sanitized)))
    await thread.save()
    return thread.toObject()
  }

  const threads = loadFromFile()
  const index = threads.findIndex(t => t.id === threadId || t.threadId === threadId)
  if (index === -1) return null
  const item = threads[index].actionItems?.find(a => a.id === actionId)
  if (!item) return null
  if (sanitized.dedupeKey && threads[index].actionItems.some((other) => (
    other.id !== actionId && normalizeActionKey(other.task) === sanitized.dedupeKey
  ))) {
    const error = new Error('An action item with this description already exists for the conversation')
    error.status = 409
    throw error
  }
  Object.assign(item, sanitized, { updatedAt: new Date(), source: 'USER' })
  threads[index].activityLog = [createActionItemLog('Updated action item', threadId, actionId, user, Object.keys(sanitized)), ...(threads[index].activityLog || [])]
  saveToFile(threads)
  return threads[index]
}

const parseActionDueAt = (value) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    const error = new Error('Due date must be an ISO date or timestamp')
    error.status = 400
    throw error
  }
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value)
  const datePart = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  if (
    Number.isNaN(datePart.getTime())
    || datePart.toISOString().slice(0, 10) !== value.slice(0, 10)
    || Number.isNaN(date.getTime())
  ) {
    const error = new Error('Due date is invalid')
    error.status = 400
    throw error
  }
  return date
}

const createActionItemLog = (action, threadId, actionItemId, user, changedFields = []) => ({
  id: `log-${randomUUID()}`,
  action,
  timestamp: new Date().toISOString(),
  user,
  metadata: { threadId, actionItemId, changedFields },
})

export const getActivityLogs = async (id = null) => {
  if (shouldUseMongo()) {
    if (id) {
      const thread = await Thread.findOne(threadIdentityFilter(id)).lean()
      return thread?.activityLog || []
    }
    const threads = await Thread.find({}).lean()
    return threads.flatMap(thread => (thread.activityLog || []).map(log => ({ ...log, threadId: thread.threadId || thread.id })))
  }

  const threads = loadFromFile()
  const source = id ? threads.filter(t => t.id === id || t.threadId === id) : threads
  return source.flatMap(thread => (thread.activityLog || []).map(log => ({ ...log, threadId: thread.threadId || thread.id })))
}

const applyManualClassification = (thread, newClassification, reason, user) => {
  const categoryLabels = {
    ASSISTANT_REPLY: 'Assistant to Reply',
    CLIENT_REPLY: 'Client to Reply',
    NEEDS_REVIEW: 'Needs Review',
    NO_REPLY_NEEDED: 'No Reply Needed',
  }
  const previousClassification = thread.classification
  const classificationReason = reason || `Manually reclassified to ${categoryLabels[newClassification]} by ${user}`
  const timestamp = new Date()

  thread.classification = newClassification
  thread.classificationManual = true
  thread.classificationReason = classificationReason
  thread.classificationAudit = [
    ...(thread.classificationAudit || []),
    {
      classification: newClassification,
      previousClassification,
      reason: classificationReason,
      user,
      timestamp,
    },
  ]
  thread.activityLog = [
    {
      id: `log-${randomUUID()}`,
      action: `Manual override to ${categoryLabels[newClassification]} by ${user}`,
      timestamp: 'Just now',
      user,
    },
    ...(thread.activityLog || []),
  ]
  return thread
}

export const updateClassification = async (
  id,
  newClassification,
  reason = '',
  user = 'Elena Rostova (PA)',
  session = null,
) => {
  if (!VALID_CLASSIFICATIONS.includes(newClassification)) {
    throw new Error(`Invalid responsibility classification: ${newClassification}`)
  }

  if (shouldUseMongo()) {
    const threadQuery = Thread.findOne(threadIdentityFilter(id))
    if (session) threadQuery.session(session)
    const thread = await threadQuery
    if (!thread) return null
    applyManualClassification(thread, newClassification, reason, user)
    if (session) await thread.save({ session })
    else await thread.save()
    return thread.toObject()
  } else {
    const threads = loadFromFile()
    const index = threads.findIndex(t => t.id === id || t.threadId === id)
    if (index === -1) return null
    applyManualClassification(threads[index], newClassification, reason, user)
    saveToFile(threads)
    return threads[index]
  }
}

export const updateStatus = async (id, updates = {}, user = 'Elena Rostova (PA)') => {
  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id))
    if (!thread) return null
    Object.assign(thread, updates)
    if (updates.isHandled !== undefined) {
      thread.activityLog.unshift({
        id: `log-${Date.now()}`,
        action: updates.isHandled ? 'Archived / Marked Handled' : 'Restored to Active Inbox',
        timestamp: 'Just now',
        user,
      })
    }
    await thread.save()
    return thread.toObject()
  } else {
    const threads = loadFromFile()
    const index = threads.findIndex(t => t.id === id || t.threadId === id)
    if (index === -1) return null
    Object.assign(threads[index], updates)
    if (updates.isHandled !== undefined) {
      threads[index].activityLog = [
        {
          id: `log-${Date.now()}`,
          action: updates.isHandled ? 'Archived / Marked Handled' : 'Restored to Active Inbox',
          timestamp: 'Just now',
          user,
        },
        ...(threads[index].activityLog || [])
      ]
    }
    saveToFile(threads)
    return threads[index]
  }
}

export const addInternalNote = async (id, text, author = 'Elena Rostova (PA)') => {
  const newNote = {
    id: `note-${Date.now()}`,
    author,
    text,
    timestamp: 'Just now',
  }

  const newLog = {
    id: `log-${Date.now()}`,
    action: `Added internal note by ${author}`,
    timestamp: 'Just now',
    user: author,
  }

  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id))
    if (!thread) return null
    thread.internalNotes.push(newNote)
    thread.activityLog.unshift(newLog)
    await thread.save()
    return thread.toObject()
  } else {
    const threads = loadFromFile()
    const index = threads.findIndex(t => t.id === id || t.threadId === id)
    if (index === -1) return null
    threads[index].internalNotes = [...(threads[index].internalNotes || []), newNote]
    threads[index].activityLog = [newLog, ...(threads[index].activityLog || [])]
    saveToFile(threads)
    return threads[index]
  }
}

export const saveDraft = async (id, draftData) => {
  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id))
    if (!thread) return null
    thread.suggestedDraft = draftData
    await thread.save()
    return thread.toObject()
  } else {
    const threads = loadFromFile()
    const index = threads.findIndex(t => t.id === id || t.threadId === id)
    if (index === -1) return null
    threads[index].suggestedDraft = draftData
    saveToFile(threads)
    return threads[index]
  }
}

export const requestClientDraftApproval = async (id, draftData, user = 'Elena Rostova (PA)') => {
  const draft = {
    to: draftData.to || '',
    cc: draftData.cc || '',
    subject: draftData.subject || '',
    body: draftData.body || '',
    tone: draftData.tone || 'professional',
    aiSource: draftData.aiSource || '',
    fallbackReason: draftData.fallbackReason || '',
    requiresClientApproval: true,
  }
  if (!draft.body.trim()) throw new Error('A non-empty draft is required for client approval')

  const entry = {
    id: `log-${Date.now()}`,
    action: `Assistant requested client approval for draft (${user})`,
    timestamp: new Date().toISOString(),
    user,
  }
  const fields = {
    suggestedDraft: draft,
    draftApprovalStatus: 'PENDING',
    draftApprovedAt: null,
    draftRejectedAt: null,
    draftDecisionBy: '',
    draftRejectionReason: '',
    clientStatus: 'PENDING_CLIENT_ACTION',
    isHandled: false,
  }

  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id))
    if (!thread) return null
    if (thread.classification !== 'CLIENT_REPLY') throw new Error('Only client-response conversations can request client approval')
    Object.assign(thread, fields)
    thread.activityLog.unshift(entry)
    await thread.save()
    return thread.toObject()
  }

  const threads = loadFromFile()
  const index = threads.findIndex((thread) => thread.id === id || thread.threadId === id)
  if (index < 0) return null
  if (threads[index].classification !== 'CLIENT_REPLY') throw new Error('Only client-response conversations can request client approval')
  Object.assign(threads[index], fields)
  threads[index].activityLog = [entry, ...(threads[index].activityLog || [])]
  saveToFile(threads)
  return threads[index]
}

export const sendReply = async (id, replyData, resultingStatus = 'WAITING_FOR', user = 'Elena Rostova (PA)') => {
  const newMsg = {
    id: `reply-${Date.now()}`,
    sender: {
      name: 'David Vance (via Elena Rostova)',
      email: 'david.vance@vancecap.com',
      avatar: 'DV',
      company: 'Vance Capital',
      isMe: true,
    },
    recipients: [replyData.to],
    cc: replyData.cc ? replyData.cc.split(',').map(s => s.trim()) : [],
    timestamp: new Date(),
    dateStr: 'Just now',
    body: replyData.body,
  }

  const updates = {
    suggestedDraft: { ...replyData, body: '' }, // Clear draft on send
    draftApprovalStatus: 'SENT_SIMULATED',
  }

  // Handle resulting status safely per explicit requirements:
  // If resultingStatus is WAITING_FOR: apply isWaiting = true, keep active in inbox
  // If resultingStatus is HANDLED: apply isHandled = true
  if (resultingStatus === 'WAITING_FOR') {
    updates.isWaiting = true
    updates.waitingSince = 'Just now'
    updates.isHandled = false
  } else if (resultingStatus === 'HANDLED') {
    updates.isHandled = true
  }

  const newLog = {
    id: `log-${Date.now()}`,
    action: `Simulated approved reply sent to ${replyData.to} (Status: ${resultingStatus})`,
    timestamp: 'Just now',
    user,
  }

  if (shouldUseMongo()) {
    const thread = await Thread.findOne(threadIdentityFilter(id))
    if (!thread) return null
    thread.messages.push(newMsg)
    Object.assign(thread, updates)
    thread.activityLog.unshift(newLog)
    await thread.save()
    await analyzeAndPersistThread(id)
    return getThreadById(id)
  } else {
    const threads = loadFromFile()
    const index = threads.findIndex(t => t.id === id || t.threadId === id)
    if (index === -1) return null
    threads[index].messages = [...(threads[index].messages || []), newMsg]
    Object.assign(threads[index], updates)
    threads[index].activityLog = [newLog, ...(threads[index].activityLog || [])]
    saveToFile(threads)
    await analyzeAndPersistThread(id)
    return getThreadById(id)
  }
}

export const toggleActionItem = async (threadId, actionId) => {
  const thread = await getThreadById(threadId)
  const action = thread?.actionItems?.find((item) => item.id === actionId)
  if (!action) return null
  return updateActionItem(threadId, actionId, { completed: !action.completed })
}

export const bulkUpdate = async (threadIds, action, value = null, user = 'Elena Rostova (PA)') => {
  if (!Array.isArray(threadIds) || threadIds.length === 0 || threadIds.some((id) => typeof id !== 'string' || !id.trim())) {
    const error = new Error('threadIds must be a non-empty array of non-empty strings')
    error.status = 400
    throw error
  }
  if (!VALID_BULK_ACTIONS.includes(action)) {
    const error = new Error('Unsupported bulk action')
    error.status = 400
    throw error
  }
  if (action === 'reclassify' && !VALID_CLASSIFICATIONS.includes(value)) {
    const error = new Error('A valid classification is required for bulk reclassification')
    error.status = 400
    throw error
  }

  const uniqueThreadIds = [...new Set(threadIds)]
  if (action === 'reclassify') {
    if (shouldUseMongo()) {
      const session = await mongoose.startSession()
      let updated = []
      try {
        await session.withTransaction(async () => {
          updated = []
          for (const id of uniqueThreadIds) {
            const thread = await updateClassification(id, value, '', user, session)
            if (thread) updated.push(thread)
          }
        })
      } finally {
        await session.endSession()
      }
      return updated
    }

    const threads = loadFromFile()
    const selected = []
    for (const thread of threads) {
      if (uniqueThreadIds.includes(thread.id) || uniqueThreadIds.includes(thread.threadId)) {
        selected.push(applyManualClassification(thread, value, '', user))
      }
    }
    saveToFile(threads)
    return selected
  }

  if (shouldUseMongo()) {
    let updateObj = {}
    if (action === 'markRead') updateObj.isRead = true
    if (action === 'markUnread') updateObj.isRead = false
    if (action === 'markImportant') { updateObj.isImportant = true; updateObj.isStarred = true }
    if (action === 'archive') updateObj.isHandled = true
    if (action === 'restore') updateObj.isHandled = false

    const filter = threadIdentitiesFilter(uniqueThreadIds)
    await Thread.updateMany(filter, { $set: updateObj })
    return await Thread.find(filter).lean()
  } else {
    const threads = loadFromFile()
    const updated = threads.map(t => {
      if (uniqueThreadIds.includes(t.id) || uniqueThreadIds.includes(t.threadId)) {
        if (action === 'markRead') t.isRead = true
        if (action === 'markUnread') t.isRead = false
        if (action === 'markImportant') { t.isImportant = true; t.isStarred = true }
        if (action === 'archive') t.isHandled = true
        if (action === 'restore') t.isHandled = false
      }
      return t
    })
    saveToFile(updated)
    return updated.filter(t => uniqueThreadIds.includes(t.id) || uniqueThreadIds.includes(t.threadId))
  }
}

export const injectSimulatedEmail = async (emailData) => {
  const newId = `thread-inject-${Date.now()}`
  const baseThread = {
    threadId: newId,
    id: newId,
    sender: emailData.sender || {
      name: 'Victoria Vance (Family Office Trustee)',
      email: 'victoria@vanceholdings.ch',
      avatar: 'VV',
      company: 'Vance Family Trust Geneva',
      isVIP: true,
    },
    recipients: emailData.recipients || ['david.vance@vancecap.com'],
    cc: emailData.cc || ['elena.rostova@vancecap.com'],
    subject: emailData.subject || 'URGENT: Geneva real estate closing deed signature required',
    preview: emailData.preview || 'David, the notary in Geneva needs your counter-signature on the property deed before 18:00 CET today...',
    body: emailData.body || `David,\n\nThe notary public in Geneva has finalized the conveyance deed for the Rue du Rhône acquisition.\n\nPlease authorize counter-signature via the attached Swiss notary protocol by 18:00 CET today to avoid closing delay penalties.\n\nWarm regards,\nVictoria`,
    timestamp: new Date(),
    dateStr: 'Just now',
    classification: emailData.classification || 'CLIENT_REPLY',
    priority: emailData.priority || 'urgent',
    isHandled: false,
    isStarred: true,
    isImportant: true,
    isRead: false,
    isWaiting: false,
    aiConfidence: 0.97,
    aiReasoning: 'Family office real estate closing document requiring principal signature under strict European notary deadline.',
    suggestedAction: 'Notify David Vance immediately via priority SMS reminder.',
    meeting: null,
    actionItems: [
      { id: `act-${newId}`, task: 'Sign Geneva notary protocol deed', assignedTo: 'client', completed: false, deadline: 'Today 18:00 CET' }
    ],
    attachments: [
      { id: `att-${newId}`, name: 'Rue_du_Rhone_Deed_Protocol.pdf', size: '1.9 MB', type: 'pdf' }
    ],
    internalNotes: [],
    suggestedDraft: {
      to: 'victoria@vanceholdings.ch',
      cc: 'elena.rostova@vancecap.com',
      subject: 'Re: URGENT: Geneva real estate closing deed',
      body: `Victoria,\n\nI have reviewed the notary protocol and authorized the electronic signature deed through our Swiss counsel.\n\nThanks,\nDavid`,
      tone: 'Executive Concise'
    },
    messages: [
      {
        id: `msg-${newId}`,
        sender: emailData.sender || { name: 'Victoria Vance', email: 'victoria@vanceholdings.ch', avatar: 'VV', company: 'Vance Family Trust Geneva', isMe: false },
        recipients: ['david.vance@vancecap.com'],
        cc: ['elena.rostova@vancecap.com'],
        timestamp: new Date(),
        dateStr: 'Just now',
        body: emailData.body || `David,\n\nThe notary public in Geneva has finalized the conveyance deed for the Rue du Rhône acquisition.\n\nPlease authorize counter-signature via the attached Swiss notary protocol by 18:00 CET today to avoid closing delay penalties.\n\nWarm regards,\nVictoria`,
      }
    ],
    activityLog: [
      { id: `log-${newId}`, action: 'Injected new simulated VIP email with urgent priority', timestamp: 'Just now', user: 'Mail Simulator' }
    ]
  }

  const analyzedThread = enrichAiMetadata(classifyAndPersistThread(baseThread))

  if (shouldUseMongo()) {
    const created = await Thread.create(analyzedThread)
    await analyzeAndPersistThread(newId)
    return getThreadById(newId)
  } else {
    const threads = loadFromFile()
    threads.unshift(analyzedThread)
    saveToFile(threads)
    await analyzeAndPersistThread(newId)
    return getThreadById(newId)
  }
}

export const resetDatabase = async () => {
  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_RESET !== 'true') {
    const error = new Error('Demo dataset reset is disabled; explicitly enable it in development to proceed')
    error.status = 403
    throw error
  }

  const processedSeed = SEED_THREADS.map(thread => enrichAiMetadata(thread))

  if (shouldUseMongo()) {
    await Thread.deleteMany({})
    await Thread.insertMany(processedSeed)
    return processedSeed
  } else {
    saveToFile(processedSeed)
    return JSON.parse(JSON.stringify(processedSeed))
  }
}