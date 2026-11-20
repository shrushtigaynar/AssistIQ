// Dev-only inspection of sync state. Prints NO message content, NO tokens.
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import { EmailAccount } from '../src/models/EmailAccount.js'
import { Thread } from '../src/models/Thread.js'

await connectDB()

const accounts = await EmailAccount.find({}).lean()
console.log('EmailAccounts:', accounts.map((a) => ({
  owner: String(a.owner),
  provider: a.provider,
  providerEmail: a.providerEmail,
  connectionStatus: a.connectionStatus,
  hasAccess: Boolean(a.accessTokenEnc),
  hasRefresh: Boolean(a.refreshTokenEnc),
  tokenExpiry: a.tokenExpiry,
  tokenExpiryIsPast: a.tokenExpiry ? a.tokenExpiry < new Date() : null,
  lastSync: a.lastSynchronizationTime,
  lastError: a.lastError,
  createdAt: a.createdAt,
})))

const threads = await Thread.find({}).sort({ createdAt: -1 }).limit(10).lean()
console.log('Threads (latest 10):', threads.map((t) => ({
  threadId: t.threadId,
  owner: t.clientOwnerEmail,
  classification: t.classification,
  aiAnalysisStatus: t.aiAnalysisStatus,
  aiError: (t.aiError || '').slice(0, 120),
  hasBody: Boolean(t.body),
  messageCount: (t.messages || []).length,
  createdAt: t.createdAt,
})))

const counts = await Thread.countDocuments({})
console.log('Total threads:', counts)

await mongoose.disconnect()
process.exit(0)
