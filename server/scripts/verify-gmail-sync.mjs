// Dev verification: runs the exact sync service path used by
// POST /api/email-accounts/google/sync for the connected Gmail account.
// Prints statuses and counts only — never email contents or tokens.
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import { User } from '../src/models/User.js'
import { syncGmailAccount } from '../src/services/emailAccountService.js'
import { listThreads, getCounts } from '../src/services/threadService.js'
import { healthCheck } from '../src/services/aiService.js'

await connectDB()

const user = await User.findById('6b001913e92dec6cede036c4').lean()
if (!user) {
  console.error('Owner user not found')
  process.exit(1)
}
console.log('owner assistiq account:', user.email)

const health = await healthCheck()
console.log('gemini health:', JSON.stringify(health))

const result = await syncGmailAccount(String(user._id), user.email, { maxMessages: 15 })
console.log('sync result:', JSON.stringify({
  conversationsSynced: result.conversationsSynced,
  classified: result.classified,
  counts: result.counts,
  lastSync: result.account.lastSynchronizationTime,
}, null, 2))

const threads = await listThreads(user.email, {})
console.log(`threads for owner: ${threads.length}`)
for (const thread of threads.slice(0, 15)) {
  console.log(`- [${thread.aiAnalysisStatus}] ${thread.classification} conf=${thread.aiConfidence ?? '-'} source=${thread.aiSource || '-'} aiError=${(thread.aiError || '').slice(0, 100) || 'none'}`)
}

const counts = await getCounts(user.email)
console.log('counts:', JSON.stringify(counts))

await mongoose.disconnect()
process.exit(0)
