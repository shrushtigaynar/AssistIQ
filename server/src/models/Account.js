import mongoose from 'mongoose'

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    provider: {
      type: String,
      enum: ['GMAIL_SIMULATED', 'OUTLOOK_SIMULATED', 'GOOGLE_WORKSPACE'],
      default: 'GMAIL_SIMULATED',
    },
    emailAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      default: '',
    },
    syncStatus: {
      type: String,
      enum: ['SYNCED', 'SYNCING', 'ERROR'],
      default: 'SYNCED',
    },
    lastSyncTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

export const Account = mongoose.model('Account', accountSchema)
