import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { Thread } from '../models/Thread.js'
import { analyzeConversation, generateReplyDraft, GeminiError } from './aiService.js'

export const VALID_CLASSIFICATIONS = ['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW']
export const CLASSIFICATION_LABELS = {
  ASSISTANT_REPLY: 'Assistant to Reply',
  CLIENT_REPLY: 'Client to Reply',
  NO_REPLY_NEEDED: 'No Reply Needed',
  NEEDS_REVIEW: 'Needs Review',
}

const ownerFilter = (userEmail) => ({
  clientOwnerEmail: String(userEmail || '').toLowerCase().trim(),
})

const threadIdentityFilter = (userEmail, id) => ({
  ...ownerFilter(userEmail),
  $or: [{ threadId: id }, ...(mongoose.isObjectIdOrHexString(id) ? [{ _id: id }] : [])],
})

const escapedSearchRegex = (search) => {
  const searchText = typeof search === 'string' ? search.trim().slice(0, 100) : ''
  if (!searchText) return null
  return new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

const publicThread = (thread) => {
  const object = typeof thread.toObject === 'function' ? thread.toObject() : thread
  return {
    ...object,
    id: object.threadId || String(object._id || ''),
    aiAnalysisStatus: object.aiAnalysisStatus || (object.classification && object.classification !== 'UNCLASSIFIED' ? 'LEGACY' : 'PENDING'),
  }
}

/**
 * Apply a genuine Gemini analysis to a thread document.
 * On provider failure the thread keeps its existing state, is marked
 * aiAnalysisStatus=FAILED with the error, and no classification is written.
 */
const runAnalysis = async (doc, plainThread) => {
  try {
    const analysis = await analyzeConversation(plainThread)
    doc.aiSuggestedClassification = analysis.aiSuggestedClassification
    doc.aiConfidence = analysis.aiConfidence
    doc.aiReasoning = analysis.aiReasoning
    doc.classificationReason = doc.classificationManual
      ? doc.classificationReason
      : analysis.classificationReason
    if (!doc.classificationManual) doc.classification = analysis.classification
    doc.suggestedAction = analysis.suggestedAction
    doc.summary = analysis.summary
    doc.aiSource = 'Gemini'
    doc.meeting = analysis.meeting
      ? { ...analysis.meeting, source: 'AI' }
      : (doc.meeting && doc.meeting.source === 'MANUAL' ? doc.meeting : { hasMeeting: false, title: '', date: '', time: '', timezone: '', attendees: [], location: '', meetingLink: '' })
    doc.actionItems = analysis.actionItems?.length ? analysis.actionItems : (doc.actionItems || [])
    doc.isWaiting = analysis.isWaiting ?? Boolean(doc.isWaiting)
    doc.aiAnalysisStatus = 'ANALYZED'
    doc.aiError = ''
    doc.lastAnalysisAt = new Date()
    doc.analysisHistory = [
      ...(doc.analysisHistory || []),
      { classification: analysis.classification, confidence: analysis.aiConfidence, source: 'Gemini', timestamp: new Date() },
    ]
    return { ok: true }
  } catch (error) {
    const isGeminiError = error instanceof GeminiError
    doc.aiAnalysisStatus = 'FAILED'
    doc.aiError = error.message
    doc.lastAnalysisAt = new Date()
    if (!doc.classificationManual && doc.classification !== 'UNCLASSIFIED' && isGeminiError) {
      // A previously genuine classification stays valid; the failure only
      // blocks this attempt from writing anything new.
    }
    if (!doc.classificationManual && doc.aiAnalysisStatus !== 'ANALYZED' && doc.lastAnalysisAt) {
      // No genuine classification has ever been produced for this thread:
      // ensure it is not mistaken for a classified one.
      const everAnalyzed = (doc.analysisHistory || []).some((entry) => entry.source === 'Gemini')
      if (!everAnalyzed) doc.classification = 'UNCLASSIFIED'
    }
    if (!isGeminiError) {
      console.error('[threadService] unexpected analysis error', { name: error.name, code: error.aiErrorCode || '' })
    }
    return { ok: false, error: error.message, code: error.aiErrorCode || 'UNKNOWN' }
  }
}

// ---------- Queries ----------

export const listThreads = async (userEmail, query = {}) => {
  const { category = 'ALL', search, unreadOnly, limit = 500 } = query
  const filter = ownerFilter(userEmail)
  filter.isHandled = false
  if (VALID_CLASSIFICATIONS.includes(category)) filter.classification = category
  if (category === 'UNCLASSIFIED') filter.classification = 'UNCLASSIFIED'

  const searchRegex = escapedSearchRegex(search)
  let threads = (await Thread.find(filter).sort({ timestamp: -1 }).limit(Number(limit) || 500).lean())
    .map(publicThread)

  if (searchRegex) {
    threads = threads.filter((thread) => [
      thread.subject,
      thread.preview,
      thread.body,
      thread.sender?.name,
      thread.sender?.email,
      ...(thread.messages || []).map((message) => message.body),
    ].some((value) => searchRegex.test(String(value || ''))))
  }
  return threads
}

export const getCounts = async (userEmail) => {
  const threads = await Thread.find({ ...ownerFilter(userEmail), isHandled: false })
    .select('classification aiAnalysisStatus')
    .lean()
  const counts = { all: threads.length, assistant: 0, client: 0, needsReview: 0, noReply: 0, unclassified: 0, failed: 0 }
  for (const thread of threads) {
    if (thread.classification === 'ASSISTANT_REPLY') counts.assistant += 1
    else if (thread.classification === 'CLIENT_REPLY') counts.client += 1
    else if (thread.classification === 'NO_REPLY_NEEDED') counts.noReply += 1
    else if (thread.classification === 'NEEDS_REVIEW') counts.needsReview += 1
    else counts.unclassified += 1
    if (thread.aiAnalysisStatus === 'FAILED') counts.failed += 1
  }
  return counts
}

export const getThreadById = async (userEmail, id) => {
  const thread = await Thread.findOne(threadIdentityFilter(userEmail, id)).lean()
  return thread ? publicThread(thread) : null
}

// ---------- Mutations ----------

const applyManualClassification = (thread, newClassification, reason, user) => {
  const previousClassification = thread.classification
  const classificationReason = reason?.trim() || `Manually reclassified to ${CLASSIFICATION_LABELS[newClassification]} by ${user}`
  thread.classification = newClassification
  thread.classificationManual = true
  thread.classificationReason = classificationReason
  thread.classificationAudit = [
    ...(thread.classificationAudit || []),
    { classification: newClassification, previousClassification, reason: classificationReason, user, timestamp: new Date() },
  ]
  thread.activityLog = [
    { id: `log-${randomUUID()}`, action: `Manual override to ${CLASSIFICATION_LABELS[newClassification]} by ${user}`, timestamp: new Date().toISOString(), user },
    ...(thread.activityLog || []),
  ]
  return thread
}

export const updateClassification = async (userEmail, id, newClassification, reason = '', user = '') => {
  if (!VALID_CLASSIFICATIONS.includes(newClassification)) {
    const error = new Error(`Invalid responsibility classification: ${newClassification}`)
    error.status = 400
    throw error
  }
  const thread = await Thread.findOne(threadIdentityFilter(userEmail, id))
  if (!thread) return null
  applyManualClassification(thread, newClassification, reason, user)
  await thread.save()
  return publicThread(thread)
}

export const updateStatus = async (userEmail, id, updates = {}, user = '') => {
  const allowed = ['isRead', 'isStarred', 'isImportant', 'isHandled']
  const patch = {}
  for (const [field, value] of Object.entries(updates)) {
    if (!allowed.includes(field)) {
      const error = new Error(`Unsupported status field: ${field}`)
      error.status = 400
      throw error
    }
    if (typeof value !== 'boolean') {
      const error = new Error(`${field} must be a boolean`)
      error.status = 400
      throw error
    }
    patch[field] = value
  }
  if (!Object.keys(patch).length) {
    const error = new Error('At least one valid status field is required')
    error.status = 400
    throw error
  }
  const thread = await Thread.findOneAndUpdate(
    threadIdentityFilter(userEmail, id),
    { $set: patch },
    { new: true }
  ).lean()
  return thread ? publicThread(thread) : null
}

/** Retry/analyze a single thread. Returns { ok, thread, error }. */
export const analyzeAndPersistThread = async (userEmail, id) => {
  const thread = await Thread.findOne(threadIdentityFilter(userEmail, id))
  if (!thread) return null
  const result = runAnalysis(thread, publicThread(thread))
  // runAnalysis never throws; await its promise result assignment
  const outcome = await result
  await thread.save()
  return { ...outcome, thread: publicThread(thread) }
}

/** Re-run analysis for every thread not successfully analyzed. */
export const reanalyzeFailedThreads = async (userEmail) => {
  const candidates = await Thread.find({
    ...ownerFilter(userEmail),
    isHandled: false,
    $or: [
      { aiAnalysisStatus: { $ne: 'ANALYZED' } },
      { classification: 'UNCLASSIFIED' },
    ],
  }).limit(200)

  let analyzed = 0
  let failed = 0
  let lastError = ''
  for (const thread of candidates) {
    const outcome = await runAnalysis(thread, publicThread(thread))
    await thread.save()
    if (outcome.ok) analyzed += 1
    else { failed += 1; lastError = outcome.error }
  }
  return { attempted: candidates.length, analyzed, failed, lastError }
}

// ---------- Drafts & replies ----------

export const saveDraft = async (userEmail, id, draft = {}) => {
  const thread = await Thread.findOne(threadIdentityFilter(userEmail, id))
  if (!thread) return null
  thread.suggestedDraft = {
    to: String(draft.to || '').slice(0, 300),
    cc: String(draft.cc || '').slice(0, 500),
    subject: String(draft.subject || '').slice(0, 300),
    body: String(draft.body || '').slice(0, 20000),
    tone: String(draft.tone || 'professional'),
    aiSource: String(draft.aiSource || ''),
    fallbackReason: '',
  }
  await thread.save()
  return publicThread(thread)
}

export const generateDraft = async (userEmail, id, tone = 'professional') => {
  const thread = await Thread.findOne(threadIdentityFilter(userEmail, id))
  if (!thread) return null
  const draft = await generateReplyDraft(publicThread(thread), tone)
  thread.suggestedDraft = {
    to: draft.to,
    cc: draft.cc,
    subject: draft.subject,
    body: draft.body,
    tone: draft.tone,
    aiSource: 'Gemini',
    fallbackReason: '',
  }
  await thread.save()
  return { draft, thread: publicThread(thread) }
}

export const markThreadSent = async (userEmail, id, sentMessage, user = '') => {
  const thread = await Thread.findOne(threadIdentityFilter(userEmail, id))
  if (!thread) return null
  thread.messages = [
    ...(thread.messages || []),
    {
      id: `sent-${randomUUID()}`,
      sender: { name: user || 'You', email: String(userEmail).toLowerCase(), isMe: true },
      recipients: Array.isArray(sentMessage.recipients) ? sentMessage.recipients : [sentMessage.to].filter(Boolean),
      cc: Array.isArray(sentMessage.cc) ? sentMessage.cc : [],
      timestamp: new Date(),
      body: String(sentMessage.body || ''),
    },
  ]
  thread.draftApprovalStatus = 'SENT'
  thread.draftApprovedAt = new Date()
  thread.suggestedDraft = { to: '', cc: '', subject: '', body: '', tone: 'professional' }
  thread.activityLog = [
    { id: `log-${randomUUID()}`, action: `Reply sent to ${sentMessage.to} with explicit approval`, timestamp: new Date().toISOString(), user },
    ...(thread.activityLog || []),
  ]
  await thread.save()
  return publicThread(thread)
}

// ---------- Gmail sync ingestion ----------

/**
 * Create or update a Thread from a synchronized Gmail conversation.
 * Email content is always preserved. Classification is written only after a
 * genuine Gemini response (unless the AI is known-unavailable, in which case
 * the thread is stored UNCLASSIFIED/FAILED with the provider error).
 */
export const upsertSyncedThread = async (userEmail, gmailThread, { aiAvailable = true, aiError = '' } = {}) => {
  const owner = String(userEmail).toLowerCase().trim()
  const { gmailThreadId, messages } = gmailThread
  if (!messages?.length) return null

  const incoming = messages.filter((message) => !message.sender.isMe)
  const latest = messages[messages.length - 1]
  const primarySender = (incoming[incoming.length - 1] || latest).sender
  const subject = (incoming[incoming.length - 1] || latest).subject

  const existing = await Thread.findOne({ ...ownerFilter(owner), gmailThreadId })
  const everAnalyzed = existing
    ? (existing.analysisHistory || []).some((entry) => entry.source === 'Gemini')
    : false

  const doc = existing || new Thread({ threadId: `gmail-${gmailThreadId}`, clientOwnerEmail: owner })
  doc.gmailThreadId = gmailThreadId
  doc.externalSource = 'GMAIL'
  doc.lastExternalSyncAt = new Date()
  doc.gmailMessageIds = messages.map((message) => message.gmailMessageId)
  doc.sender = { name: primarySender.name, email: primarySender.email }
  doc.recipients = latest.recipients
  doc.cc = latest.cc
  doc.subject = subject
  doc.preview = (latest.snippet || latest.body || '').slice(0, 300)
  doc.body = incoming[incoming.length - 1]?.body || latest.body || ''
  doc.timestamp = latest.timestamp
  doc.messages = messages.map((message) => ({
    id: message.id,
    sender: { name: message.sender.name, email: message.sender.email, isMe: message.sender.isMe },
    recipients: message.recipients,
    cc: message.cc,
    timestamp: message.timestamp,
    body: message.body,
  }))

  if (aiAvailable) {
    await runAnalysis(doc, publicThread(doc))
  } else {
    // AI provider down: preserve the email, mark the failure, classify nothing.
    doc.aiAnalysisStatus = 'FAILED'
    doc.aiError = aiError || 'AI provider unavailable; classification was not attempted.'
    doc.lastAnalysisAt = new Date()
    if (!doc.classificationManual && !everAnalyzed) doc.classification = 'UNCLASSIFIED'
  }
  await doc.save()
  return publicThread(doc)
}
