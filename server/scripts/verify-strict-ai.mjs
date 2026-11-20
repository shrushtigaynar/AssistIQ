// Dev verification of strict AI-only failure behavior.
// No mock classification, no fallback of any kind.
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import { analyzeConversation, healthCheck } from '../src/services/aiService.js'
import { listThreads, updateClassification } from '../src/services/threadService.js'

const OWNER = 'srushtigayanar@gmail.com'
const sampleThread = {
  subject: 'Test conversation',
  sender: { name: 'Someone', email: 'someone@example.com' },
  recipients: [OWNER],
  messages: [{ sender: { name: 'Someone', email: 'someone@example.com' }, body: 'Please confirm the meeting.', timestamp: new Date() }],
}

await connectDB()

console.log('--- 1. invalid model ---')
process.env.GEMINI_MODEL = 'gemini-does-not-exist'
try { await analyzeConversation(sampleThread); console.log('UNEXPECTED SUCCESS') }
catch (e) { console.log('error code:', e.aiErrorCode, '| status:', e.status, '| message snippet:', e.message.slice(0, 80)) }

console.log('--- 2. timeout (1ms) ---')
process.env.GEMINI_MODEL = 'gemini-2.5-flash'
process.env.GEMINI_TIMEOUT_MS = '1'
try { await analyzeConversation(sampleThread); console.log('UNEXPECTED SUCCESS') }
catch (e) { console.log('error code:', e.aiErrorCode, '| status:', e.status) }
process.env.GEMINI_TIMEOUT_MS = '20000'

console.log('--- 3. invalid API key ---')
const realKey = process.env.GEMINI_API_KEY
process.env.GEMINI_API_KEY = 'AQ.invalidkey'
try { await analyzeConversation(sampleThread); console.log('UNEXPECTED SUCCESS') }
catch (e) { console.log('error code:', e.aiErrorCode, '| status:', e.status, '| message snippet:', e.message.slice(0, 80)) }
process.env.GEMINI_API_KEY = realKey

console.log('--- 4. missing API key ---')
delete process.env.GEMINI_API_KEY
try { await analyzeConversation(sampleThread); console.log('UNEXPECTED SUCCESS') }
catch (e) { console.log('error code:', e.aiErrorCode, '| status:', e.status, '| message snippet:', e.message.slice(0, 80)) }
process.env.GEMINI_API_KEY = realKey

console.log('--- 5. health + genuine success with low-confidence forcing ---')
const health = await healthCheck()
console.log('health:', JSON.stringify({ available: health.available, model: health.model }))
process.env.AI_CONFIDENCE_THRESHOLD = '0.99'
const lowConf = await analyzeConversation(sampleThread)
console.log('low-confidence classification:', lowConf.classification, '| confidence:', lowConf.aiConfidence, '| reason:', lowConf.classificationReason.slice(0, 100))
process.env.AI_CONFIDENCE_THRESHOLD = '0.75'

const normal = await analyzeConversation(sampleThread)
console.log('normal classification:', normal.classification, '| confidence:', normal.aiConfidence, '| source:', normal.aiSource)

console.log('--- 6. manual override preserved ---')
const threads = await listThreads(OWNER, {})
if (threads.length) {
  const target = threads[0]
  const updated = await updateClassification(OWNER, target.id, 'NEEDS_REVIEW', 'dev test override', 'Dev Test')
  console.log('override applied:', updated.classificationManual, '->', updated.classification)
}

await mongoose.disconnect()
process.exit(0)
