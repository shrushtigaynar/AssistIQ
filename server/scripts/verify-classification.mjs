// Development-only verification: simulates the Gmail sync path (without
// touching the Gmail API) to confirm classification + persistence.
// Usage: node scripts/verify-classification.mjs
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import { upsertSyncedThread } from '../src/services/threadService.js'
import { listThreads, updateClassification } from '../src/services/threadService.js'

const OWNER = 'test.user@example.com'

const mk = (id, subject, fromName, fromEmail, body) => ({
  gmailThreadId: id,
  messages: [
    {
      id: `gm-${id}-1`,
      gmailMessageId: `${id}-m1`,
      gmailThreadId: id,
      sender: { name: fromName, email: fromEmail, isMe: false },
      recipients: [OWNER],
      cc: [],
      subject,
      body,
      snippet: body.slice(0, 120),
      timestamp: new Date(Date.now() - 3600_000),
    },
  ],
})

const scenarios = [
  mk('t-newsletter', 'Weekly Product Digest', 'Acme News', 'news@acme.io', 'Your weekly digest is ready. No reply is needed — this is an automated newsletter. Unsubscribe here.'),
  mk('t-approval', 'Contract approval needed', 'Alice Legal', 'alice@lawfirm.com', 'Hi, we need your approval and signature on the revised contract before Friday. Please review and sign personally.'),
  mk('t-schedule', 'Schedule a call next week', 'Bob Partner', 'bob@corp.com', 'Hi, could you please help me schedule a call with the team next week to coordinate logistics and confirm availability?'),
  mk('t-ambiguous', 'Re: matter', 'Unknown Sender', 'unknown@random.org', 'It is what it is.'),
]

const exit = async (code) => { await mongoose.disconnect?.(); process.exit(code) }

await connectDB()
for (const scenario of scenarios) {
  const result = await upsertSyncedThread(OWNER, scenario)
  console.log(`${scenario.gmailThreadId} => ${result.classification} (confidence ${result.aiConfidence}, source: ${result.aiSource})`)
}

const threads = await listThreads(OWNER, {})
console.log(`\nPersisted threads: ${threads.length}`)
for (const thread of threads) {
  console.log(`- ${thread.subject}: ${thread.classification}`)
}

// Manual override + preservation check
const target = threads.find((t) => t.subject === 'Weekly Product Digest')
const overridden = await updateClassification(OWNER, target.id, 'NEEDS_REVIEW', 'test override', 'Test User')
console.log(`\nManual override applied: ${overridden.classificationManual ? 'yes' : 'no'} -> ${overridden.classification}`)

// Re-run the same sync: manual override must survive re-analysis
await upsertSyncedThread(OWNER, scenarios[0])
const after = (await listThreads(OWNER, {})).find((t) => t.subject === 'Weekly Product Digest')
console.log(`After re-sync, classification: ${after.classification} (manual=${after.classificationManual})`)

console.log('\nOK')
await exit(0)
