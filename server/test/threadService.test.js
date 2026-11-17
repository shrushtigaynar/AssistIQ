import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, beforeEach, test } from 'node:test'

const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'assistiq-threads-')), 'store.json')
process.env.ASSISTIQ_DATA_FILE = dataFile
process.env.MONGODB_REQUIRED = 'false'
process.env.ASSISTANT_PORTAL_TOKEN = 'assistant-test-token'
process.env.CLIENT_PORTAL_TOKEN = 'client-test-token'
process.env.ASSISTANT_EMAIL = 'assistant@example.test'
process.env.CLIENT_EMAIL = 'client@example.test'
delete process.env.GEMINI_API_KEY

const makeThread = (id, overrides = {}) => ({
  id,
  threadId: id,
  sender: { name: 'Sender', email: 'sender@example.test', company: 'Example Co' },
  recipients: ['client@example.test'],
  cc: [],
  subject: 'Project status update',
  preview: 'A short latest-message preview',
  body: 'Current body without a unique marker',
  timestamp: '2025-01-03T12:00:00.000Z',
  classification: 'ASSISTANT_REPLY',
  priority: 'normal',
  isHandled: false,
  isImportant: false,
  isStarred: false,
  isRead: false,
  isWaiting: false,
  classificationManual: false,
  classificationReason: 'AI classification',
  classificationAudit: [],
  messages: [],
  actionItems: [],
  internalNotes: [{ id: `${id}-note`, author: 'Assistant', text: 'internalneedle' }],
  activityLog: [],
  ...overrides,
})

const initialThreads = () => [
  makeThread('bulk-target', {
    body: 'bodyonlyneedle sharedfilterneedle',
    isImportant: true,
    clientOwnerEmail: 'client@example.test',
    messages: [
      {
        id: 'bulk-target-old',
        sender: { name: 'Sender', email: 'sender@example.test' },
        recipients: ['client@example.test'],
        body: 'olderhistoryneedle sharedfilterneedle',
        timestamp: '2025-01-01T12:00:00.000Z',
      },
      {
        id: 'bulk-target-new',
        sender: { name: 'Sender', email: 'sender@example.test' },
        recipients: ['client@example.test'],
        body: 'Latest reply',
        timestamp: '2025-01-02T12:00:00.000Z',
      },
    ],
  }),
  makeThread('bulk-target-2', {
    classification: 'CLIENT_REPLY',
    clientOwnerEmail: 'client@example.test',
    body: 'sharedfilterneedle in another conversation',
  }),
  makeThread('unimportant-target', {
    classification: 'CLIENT_REPLY',
    body: 'sharedfilterneedle in an unimportant conversation',
  }),
  makeThread('archived-target', {
    classification: 'CLIENT_REPLY',
    isHandled: true,
    isImportant: true,
    body: 'archivedneedle',
  }),
]

const writeStore = (threads = initialThreads()) => {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true })
  fs.writeFileSync(dataFile, JSON.stringify({ threads, users: [] }), 'utf8')
}
const readStore = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'))

const threadService = await import('../src/services/threadService.js')
const clientService = await import('../src/services/clientService.js')
const { requirePortalRole } = await import('../src/services/portalAuthService.js')
const { Thread } = await import('../src/models/Thread.js')

const clientIdentity = {
  id: 'client@example.test',
  email: 'client@example.test',
  name: 'Test Client',
  role: 'CLIENT',
}

beforeEach(() => writeStore())
after(() => fs.rmSync(path.dirname(dataFile), { recursive: true, force: true }))

test('single-item manual classification records its previous value, actor, and timestamp', async () => {
  const updated = await threadService.updateClassification(
    'bulk-target',
    'CLIENT_REPLY',
    'Client decision required',
    'Test Assistant',
  )

  assert.equal(updated.classification, 'CLIENT_REPLY')
  assert.equal(updated.classificationManual, true)
  assert.deepEqual(updated.classificationAudit.at(-1), {
    classification: 'CLIENT_REPLY',
    previousClassification: 'ASSISTANT_REPLY',
    reason: 'Client decision required',
    user: 'Test Assistant',
    timestamp: updated.classificationAudit.at(-1).timestamp,
  })
  assert.ok(Number.isFinite(new Date(updated.classificationAudit.at(-1).timestamp).getTime()))
})

test('bulk reclassification uses the manual override audit path for every selected thread', async () => {
  const updated = await threadService.bulkUpdate(
    ['bulk-target', 'bulk-target-2', 'bulk-target'],
    'reclassify',
    'NO_REPLY_NEEDED',
    'Verified Assistant',
  )

  assert.equal(updated.length, 2)
  for (const thread of updated) {
    assert.equal(thread.classification, 'NO_REPLY_NEEDED')
    assert.equal(thread.classificationManual, true)
    assert.equal(thread.classificationAudit.at(-1).classification, 'NO_REPLY_NEEDED')
    assert.equal(thread.classificationAudit.at(-1).user, 'Verified Assistant')
    assert.ok(Number.isFinite(new Date(thread.classificationAudit.at(-1).timestamp).getTime()))
    assert.match(thread.activityLog[0].action, /Manual override/)
  }
  assert.equal(updated.find((thread) => thread.id === 'bulk-target').classificationAudit.at(-1).previousClassification, 'ASSISTANT_REPLY')
  assert.equal(updated.find((thread) => thread.id === 'bulk-target-2').classificationAudit.at(-1).previousClassification, 'CLIENT_REPLY')
})

test('bulk reclassification surfaces local persistence failures instead of reporting success', async () => {
  const originalWriteFileSync = fs.writeFileSync
  const originalClassification = readStore().threads.find((thread) => thread.id === 'bulk-target').classification
  fs.writeFileSync = (file, ...args) => {
    if (file === dataFile) throw new Error('Injected local-store write failure')
    return originalWriteFileSync(file, ...args)
  }

  try {
    await assert.rejects(
      threadService.bulkUpdate(['bulk-target'], 'reclassify', 'CLIENT_REPLY', 'Test Assistant'),
      /Injected local-store write failure/,
    )
  } finally {
    fs.writeFileSync = originalWriteFileSync
  }

  assert.equal(readStore().threads.find((thread) => thread.id === 'bulk-target').classification, originalClassification)
})

test('AI reanalysis preserves a bulk manual classification and its reason', async () => {
  writeStore([
    makeThread('bulk-target', {
      subject: 'Signature needed',
      body: 'David, please approve and sign the term sheet by Friday at 5 PM.',
    }),
  ])
  await threadService.bulkUpdate(['bulk-target'], 'reclassify', 'NO_REPLY_NEEDED', 'Test Assistant')
  const updated = await threadService.analyzeAndPersistThread('bulk-target')

  assert.equal(updated.classification, 'NO_REPLY_NEEDED')
  assert.equal(updated.classificationManual, true)
  assert.equal(updated.classificationReason, 'Manually reclassified to No Reply Needed by Test Assistant')
  assert.equal(updated.aiSuggestedClassification, 'CLIENT_REPLY')
})

test('search finds current body text and text from an older message', async () => {
  const bodyMatches = await threadService.getAllThreads({ search: 'bodyonlyneedle' })
  const historyMatches = await threadService.getAllThreads({ search: 'olderhistoryneedle' })
  const senderMatches = await threadService.getAllThreads({ search: 'sender@example.test' })
  const recipientMatches = await threadService.getAllThreads({ search: 'client@example.test' })

  assert.deepEqual(bodyMatches.map((thread) => thread.id), ['bulk-target'])
  assert.deepEqual(historyMatches.map((thread) => thread.id), ['bulk-target'])
  assert.equal(senderMatches.length, 3)
  assert.equal(recipientMatches.length, 3)
})

test('search composes with classification, importance, archived, and handled filters', async () => {
  const classified = await threadService.getAllThreads({
    segment: 'CLIENT_REPLY',
    search: 'sharedfilterneedle',
  })
  const important = await threadService.getAllThreads({
    segment: 'IMPORTANT',
    search: 'sharedfilterneedle',
  })
  const importantOnly = await threadService.getAllThreads({
    importantOnly: 'true',
    search: 'sharedfilterneedle',
  })
  const archived = await threadService.getAllThreads({
    segment: 'ARCHIVED',
    search: 'archivedneedle',
  })
  const activeForArchivedText = await threadService.getAllThreads({
    segment: 'PRIMARY_INBOX',
    search: 'archivedneedle',
  })

  assert.deepEqual(classified.map((thread) => thread.id).sort(), ['bulk-target-2', 'unimportant-target'])
  assert.deepEqual(important.map((thread) => thread.id), ['bulk-target'])
  assert.deepEqual(importantOnly.map((thread) => thread.id), ['bulk-target'])
  assert.deepEqual(archived.map((thread) => thread.id), ['archived-target'])
  assert.deepEqual(activeForArchivedText, [])
})

test('Mongo search clauses preserve active filters and escape user text', async () => {
  const originalRequired = process.env.MONGODB_REQUIRED
  const originalFind = Thread.find
  let capturedQuery
  process.env.MONGODB_REQUIRED = 'true'
  Thread.find = (query) => {
    capturedQuery = query
    return {
      sort() { return this },
      async lean() { return [] },
    }
  }

  try {
    await threadService.getAllThreads({
      segment: 'IMPORTANT',
      importantOnly: 'true',
      search: 'safe (query)',
    })
  } finally {
    Thread.find = originalFind
    process.env.MONGODB_REQUIRED = originalRequired
  }

  assert.equal(capturedQuery.isHandled, false)
  assert.equal(capturedQuery.$and.length, 3)
  assert.equal(capturedQuery.$and[0].$or[0].isImportant, true)
  assert.equal(capturedQuery.$and[1].$or[0].isImportant, true)
  const searchClause = capturedQuery.$and[2].$or.find((condition) => condition['messages.body'])
  assert.ok(searchClause)
  assert.equal(searchClause['messages.body'].source, 'safe \\(query\\)')
})

test('search excludes internal notes and client views omit private audit data', async () => {
  const privateSearch = await threadService.getAllThreads({ search: 'internalneedle' })
  const clientView = await clientService.getClientConversation('bulk-target-2', clientIdentity)

  assert.deepEqual(privateSearch, [])
  assert.ok(clientView)
  assert.equal('internalNotes' in clientView, false)
  assert.equal('activityLog' in clientView, false)
})

test('client credentials cannot access the assistant search route', async () => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
  let nextCalled = false
  await requirePortalRole('ASSISTANT')(
    { get: () => 'Bearer client-test-token' },
    response,
    (error) => { if (error) throw error; nextCalled = true },
  )

  assert.equal(response.statusCode, 403)
  assert.equal(nextCalled, false)
})
