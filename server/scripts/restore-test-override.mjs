// Reverts the classification override applied by verify-strict-ai.mjs.
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import { Thread } from '../src/models/Thread.js'

await connectDB()
const thread = await Thread.findOneAndUpdate(
  { 'classificationAudit.user': 'Dev Test' },
  {
    $set: { classificationManual: false, classificationReason: 'Restored to genuine Gemini classification after dev test.', },
  },
  { new: true }
)
if (thread) {
  thread.classification = 'UNCLASSIFIED'
  await thread.save()
  // re-run genuine analysis
  const { analyzeAndPersistThread } = await import('../src/services/threadService.js')
  const result = await analyzeAndPersistThread(thread.clientOwnerEmail, thread.threadId)
  console.log('restored:', result.ok, result.thread.classification, result.thread.aiAnalysisStatus, result.thread.aiSource)
} else {
  console.log('no test override found')
}
await mongoose.disconnect()
process.exit(0)
