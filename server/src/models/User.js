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
    passwordHash: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['ASSISTANT', 'CLIENT', 'ADMIN'],
      default: 'CLIENT',
    },
    avatar: {
      type: String,
      default: '',
    },
    organization: {
      type: String,
      default: '',
      trim: true,
    },
    preferences: {
      conciseSummaries: { type: Boolean, default: true },
      deadlineReminders: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
      defaultReplyTone: { type: String, enum: ['professional', 'friendly', 'concise'], default: 'professional' },
      compactDisplay: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
)

export const User = mongoose.model('User', userSchema)
