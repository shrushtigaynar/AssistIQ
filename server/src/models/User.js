import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['ASSISTANT', 'CLIENT', 'ADMIN'],
      default: 'ASSISTANT',
    },
    avatar: {
      type: String,
      default: '',
    },
    organization: {
      type: String,
      default: 'Vance Capital',
    },
    assistantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    preferences: {
      conciseSummaries: { type: Boolean, default: true },
      deadlineReminders: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
      defaultReplyTone: { type: String, enum: ['professional', 'friendly', 'concise'], default: 'professional' },
      defaultInboxSegment: {
        type: String,
        enum: ['PRIMARY_INBOX', 'ASSISTANT_REPLY', 'CLIENT_REPLY', 'NEEDS_REVIEW', 'WAITING_FOR', 'NO_REPLY_NEEDED'],
        default: 'PRIMARY_INBOX',
      },
      compactDisplay: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
)

export const User = mongoose.model('User', userSchema)
