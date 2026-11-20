import mongoose from 'mongoose'

// A live email provider connection for a user. OAuth tokens are stored
// encrypted (see services/cryptoService.js) and never exposed to clients.
const emailAccountSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['GMAIL'],
      default: 'GMAIL',
    },
    providerAccountId: {
      type: String,
      default: '',
      index: true,
    },
    providerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    connectionStatus: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'ERROR'],
      default: 'CONNECTED',
    },
    scopes: { type: String, default: '' },
    accessTokenEnc: { type: String, default: '' },
    refreshTokenEnc: { type: String, default: '' },
    tokenExpiry: { type: Date, default: null },
    lastSynchronizationTime: { type: Date, default: null },
    lastSyncedMessageId: { type: String, default: '' },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
)

emailAccountSchema.index({ owner: 1, provider: 1 }, { unique: true })

export const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema)
