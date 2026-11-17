import mongoose from 'mongoose'

const draftSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    to: {
      type: String,
      default: '',
    },
    cc: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    tone: {
      type: String,
      default: 'Executive Concise',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'READY_FOR_APPROVAL', 'PENDING_CLIENT_APPROVAL', 'APPROVED', 'REJECTED', 'SENT_SIMULATED'],
      default: 'DRAFT',
    },
    approvalDecisionBy: { type: String, default: '' },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
)

export const Draft = mongoose.model('Draft', draftSchema)
