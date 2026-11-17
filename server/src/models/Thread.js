import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sender: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String, default: '' },
    company: { type: String, default: '' },
    isVIP: { type: Boolean, default: false },
    isMe: { type: Boolean, default: false },
  },
  recipients: [{ type: String }],
  cc: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  dateStr: { type: String, default: '' },
  body: { type: String, required: true },
})

const actionItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  task: { type: String, required: true },
  assignedTo: { type: String, enum: ['assistant', 'client', 'unknown', ''], default: 'unknown' },
  completed: { type: Boolean, default: false },
  deadline: { type: String, default: '' },
  dueAt: { type: Date, default: null },
  createdAt: { type: Date, default: null },
  updatedAt: { type: Date, default: null },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  needsReview: { type: Boolean, default: false },
  source: { type: String, enum: ['AI', 'USER'], default: 'AI' },
  dedupeKey: { type: String, default: '' },
})

const followUpSchema = new mongoose.Schema({
  status: { type: String, enum: ['WAITING', 'SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'WAITING' },
  dueAt: { type: Date, default: null },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: null },
  updatedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { _id: false })

const meetingSchema = new mongoose.Schema({
  hasMeeting: { type: Boolean, default: false },
  title: { type: String, default: '' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  timezone: { type: String, default: '' },
  attendees: [{ type: String }],
  location: { type: String, default: '' },
  meetingLink: { type: String, default: '' },
  status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
  source: { type: String, enum: ['AI', 'MANUAL'], default: 'AI' },
  updatedAt: { type: Date, default: null },
}, { _id: false })

const internalNoteSchema = new mongoose.Schema({
  id: { type: String, required: true },
  author: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: String, default: 'Just now' },
})

const attachmentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: String, default: '' },
  type: { type: String, default: 'pdf' },
})

const threadSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    clientOwnerEmail: { type: String, lowercase: true, trim: true, default: '', index: true },
    sender: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      avatar: { type: String, default: '' },
      company: { type: String, default: '' },
      isVIP: { type: Boolean, default: false },
    },
    recipients: [{ type: String }],
    cc: [{ type: String }],
    subject: { type: String, required: true },
    preview: { type: String, default: '' },
    body: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
    dateStr: { type: String, default: '' },

    // Primary Mutually Exclusive Responsibility Taxonomy
    classification: {
      type: String,
      enum: ['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'],
      default: 'NEEDS_REVIEW',
      index: true,
    },

    // Independent Status Flags
    priority: {
      type: String,
      enum: ['urgent', 'high', 'normal', 'low'],
      default: 'normal',
      index: true,
    },
    clientStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING_CLIENT_ACTION', 'HANDLED_BY_CLIENT', 'DELEGATED_TO_ASSISTANT'],
      default: 'NOT_APPLICABLE',
    },
    delegatedAt: { type: Date, default: null },
    delegatedBy: { type: String, default: '' },
    delegationNote: { type: String, default: '' },
    handledAt: { type: Date, default: null },
    handledBy: { type: String, default: '' },
    draftApprovalStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'SENT_SIMULATED'],
      default: 'NOT_REQUIRED',
    },
    draftApprovedAt: { type: Date, default: null },
    draftRejectedAt: { type: Date, default: null },
    draftDecisionBy: { type: String, default: '' },
    draftRejectionReason: { type: String, default: '' },
    isHandled: { type: Boolean, default: false, index: true },
    isStarred: { type: Boolean, default: false, index: true },
    isImportant: { type: Boolean, default: false, index: true },
    isRead: { type: Boolean, default: false, index: true },
    isWaiting: { type: Boolean, default: false, index: true },
    waitingSince: { type: String, default: '' },
    followUp: { type: followUpSchema, default: null },

    // AI Metadata
    aiConfidence: { type: Number, min: 0, max: 1, default: 0.8 },
    aiReasoning: { type: String, default: '' },
    classificationReason: { type: String, default: '' },
    aiSuggestedClassification: { type: String, enum: ['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'], default: 'NEEDS_REVIEW' },
    aiSource: { type: String, default: 'Rule-Based Demo Processing' },
    summary: { type: String, default: '' },
    suggestedAction: { type: String, default: '' },
    classificationManual: { type: Boolean, default: false },
    classificationAudit: [{
      classification: { type: String, enum: ['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'] },
      previousClassification: { type: String, enum: ['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'] },
      reason: { type: String, default: '' },
      user: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now },
    }],
    analysisHistory: [{
      classification: { type: String, enum: ['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'] },
      confidence: { type: Number, min: 0, max: 1 },
      source: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now },
    }],

    meeting: { type: meetingSchema, default: null },

    actionItems: [actionItemSchema],
    internalNotes: [internalNoteSchema],
    attachments: [attachmentSchema],

    suggestedDraft: {
      to: { type: String, default: '' },
      cc: { type: String, default: '' },
      subject: { type: String, default: '' },
      body: { type: String, default: '' },
      tone: { type: String, default: 'Executive Concise' },
      aiSource: { type: String, default: '' },
      fallbackReason: { type: String, default: '' },
      requiresClientApproval: { type: Boolean, default: false },
    },

    messages: [messageSchema],

    activityLog: [
      {
        id: { type: String },
        action: { type: String },
        timestamp: { type: String },
        user: { type: String },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
  },
  {
    timestamps: true,
  }
)

export const Thread = mongoose.model('Thread', threadSchema)
