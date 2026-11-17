import mongoose from 'mongoose'

const emailAccountSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    ownerEmail: {
      type: String,
      default: 'david.vance@vancecap.com',
      lowercase: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['GMAIL', 'OUTLOOK'],
      default: 'GMAIL',
    },
    connectionStatus: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'ERROR', 'SIMULATED'],
      default: 'SIMULATED',
    },
    syncStatus: {
      type: String,
      enum: ['SYNCED', 'SYNCING', 'ERROR', 'NOT_SYNCED', 'SIMULATED'],
      default: 'SIMULATED',
    },
    lastSynchronizationTime: {
      type: Date,
      default: null,
    },
    integrationMode: {
      type: String,
      enum: ['DEMO', 'LIVE'],
      default: 'DEMO',
    },
  },
  { timestamps: true }
)

emailAccountSchema.index({ ownerEmail: 1, provider: 1 }, { unique: true })

export const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema)
