import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, beforeEach, test } from 'node:test'

const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'assistiq-client-')), 'store.json')
process.env.ASSISTIQ_DATA_FILE = dataFile
process.env.MONGODB_REQUIRED = 'false'
process.env.CLIENT_PORTAL_TOKEN = 'client-test-token'
process.env.ASSISTANT_PORTAL_TOKEN = 'assistant-test-token'
process.env.CLIENT_EMAIL = 'client@example.test'
process.env.ASSISTANT_EMAIL = 'assistant@example.test'

const clientIdentity = {
  id: 'client@example.test',
  email: 'client@example.test',
  name: 'Test Client',
  role: 'CLIENT',
  preferences: {
    conciseSummaries: true,
    deadlineReminders: true,
    defaultReplyTone: 'professional',
  },
}

const makeThread = (id, classification, overrides = {}) => ({
  id,
  threadId: id,
  sender: { name: 'Sender', email: 'sender@example.test' },
  recipients: ['client@example.test'],
  subject: `Subject ${id}`,
  body: `Body ${id}`,
  preview: `Preview ${id}`,
  timestamp: '2025-05-01T10:00:00.000Z',
  classification,
  priority: 'normal',
  clientStatus: 'PENDING_CLIENT_ACTION',
  isHandled: false,
  summary: `Summary ${id}`,
  classificationReason: 'Client decision requested',
  actionItems: [],
  meeting: null,
  messages: [{
    id: `${id}-message`,
    sender: { name: 'Sender', email: 'sender@example.test' },
    recipients: ['client@example.test'],
    timestamp: '2025-05-01T10:00:00.000Z',
    body: `Message ${id}`,
  }],
  internalNotes: [{ id: `${id}-note`, author: 'Assistant', text: 'Confidential internal note' }],
  activityLog: [{ id: `${id}-activity`, action: 'Assistant-only activity', user: 'Assistant' }],
  ...overrides,
})

const initialStore = () => ({
  threads: [
    makeThread('pending', 'CLIENT_REPLY'),
    makeThread('assistant-only', 'ASSISTANT_REPLY'),
    makeThread('no-reply', 'NO_REPLY_NEEDED'),
    makeThread('review', 'NEEDS_REVIEW'),
    makeThread('handled', 'CLIENT_REPLY', { isHandled: true, clientStatus: 'HANDLED_BY_CLIENT' }),
    makeThread('delegated', 'ASSISTANT_REPLY', {
      clientId: 'another-client-id',
      clientOwnerEmail: 'other@example.test',
      clientStatus: 'DELEGATED_TO_ASSISTANT',
      delegationNote: 'Do not expose to this client',
    }),
    makeThread('owned-by-other', 'CLIENT_REPLY', {
      clientId: 'another-client-id',
      clientOwnerEmail: 'other@example.test',
    }),
    makeThread('awaiting-draft', 'CLIENT_REPLY', {
      draftApprovalStatus: 'PENDING',
      suggestedDraft: { to: 'sender@example.test', subject: 'Re: Subject', body: 'Please review this response.' },
    }),
  ],
  users: [],
})

const writeStore = (store = initialStore()) => fs.writeFileSync(dataFile, JSON.stringify(store), 'utf8')
const readStore = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'))

const clientService = await import('../src/services/clientService.js')
const threadService = await import('../src/services/threadService.js')
const { requirePortalRole } = await import('../src/services/portalAuthService.js')
const clientController = await import('../src/controllers/clientController.js')

beforeEach(() => writeStore())
after(() => fs.rmSync(path.dirname(dataFile), { recursive: true, force: true }))

test('client inbox filters categories, handled/delegated threads, and explicit other-client ownership', async () => {
  const inbox = await clientService.getClientInbox(clientIdentity)
  assert.deepEqual(inbox.map((thread) => thread.id).sort(), ['awaiting-draft', 'pending'])
})

test('client conversation access is restricted and omits internal-only data', async () => {
  const own = await clientService.getClientConversation('pending', clientIdentity)
  assert.equal(own.id, 'pending')
  assert.equal('internalNotes' in own, false)
  assert.equal('activityLog' in own, false)
  assert.equal(await clientService.getClientConversation('owned-by-other', clientIdentity), null)
  assert.equal(await clientService.getClientConversation('assistant-only', clientIdentity), null)
})

test('handled status persists, is queryable, and can be reopened', async () => {
  const handled = await clientService.markClientHandled('pending', clientIdentity)
  assert.equal(handled.clientStatus, 'HANDLED_BY_CLIENT')
  assert.equal((await clientService.getClientInbox(clientIdentity)).some((item) => item.id === 'pending'), false)
  assert.equal((await clientService.getClientInbox(clientIdentity, true)).some((item) => item.id === 'pending'), true)
  assert.equal(readStore().threads.find((thread) => thread.id === 'pending').activityLog[0].action, 'Client marked conversation handled')

  const reopened = await clientService.markClientHandled('pending', clientIdentity, false)
  assert.equal(reopened.clientStatus, 'PENDING_CLIENT_ACTION')
  assert.equal((await clientService.getClientInbox(clientIdentity)).some((item) => item.id === 'pending'), true)
})

test('delegation updates responsibility, removes the client inbox item, and preserves the instruction', async () => {
  const delegated = await clientService.delegateClientConversation('pending', clientIdentity, 'Please arrange a suitable time.')
  assert.equal(delegated.classification, 'ASSISTANT_REPLY')
  assert.equal(delegated.clientStatus, 'DELEGATED_TO_ASSISTANT')
  assert.equal(delegated.delegationNote, 'Please arrange a suitable time.')
  assert.equal((await clientService.getClientInbox(clientIdentity)).some((item) => item.id === 'pending'), false)
  const stored = readStore().threads.find((thread) => thread.id === 'pending')
  assert.equal(stored.classificationAudit.at(-1).previousClassification, 'CLIENT_REPLY')
  assert.equal(stored.activityLog[0].action, 'Client delegated conversation to assistant')
})

test('simulated client response appends a message and requires explicit confirmation', async () => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
  await clientController.submitResponse({
    params: { id: 'pending' },
    user: clientIdentity,
    body: { body: 'I approve the proposed date.', explicitApproval: false },
  }, response, (error) => { throw error })
  assert.equal(response.statusCode, 400)
  assert.equal(readStore().threads.find((thread) => thread.id === 'pending').messages.length, 1)

  const updated = await clientService.submitClientResponse('pending', clientIdentity, 'I approve the proposed date.')
  assert.equal(updated.messages.at(-1).body, 'I approve the proposed date.')
  assert.equal(updated.clientStatus, 'HANDLED_BY_CLIENT')
  assert.equal(readStore().threads.find((thread) => thread.id === 'pending').messages.length, 2)
})

test('draft approval is scoped to the client and does not send automatically', async () => {
  assert.deepEqual((await clientService.getDraftsAwaitingClientApproval(clientIdentity)).map((thread) => thread.id), ['awaiting-draft'])
  const approved = await clientService.decideClientDraft('awaiting-draft', clientIdentity, 'APPROVED')
  assert.equal(approved.draftApprovalStatus, 'APPROVED')
  assert.equal(approved.clientStatus, 'HANDLED_BY_CLIENT')
  assert.equal((await clientService.getDraftsAwaitingClientApproval(clientIdentity)).length, 0)
  const persisted = readStore().threads.find((thread) => thread.id === 'awaiting-draft')
  assert.equal(persisted.draftApprovalStatus, 'APPROVED')
  assert.equal(persisted.suggestedDraft.body, 'Please review this response.')
})

test('assistant approval request is visible to the client and synchronizes back without sending', async () => {
  await threadService.requestClientDraftApproval('pending', {
    to: 'sender@example.test',
    subject: 'Re: Subject pending',
    body: 'I can confirm the proposed appointment.',
    tone: 'professional',
  }, 'Test Assistant')
  const pendingDrafts = await clientService.getDraftsAwaitingClientApproval(clientIdentity)
  const requestedDraft = pendingDrafts.find((thread) => thread.id === 'pending')
  assert.ok(requestedDraft)
  assert.equal(requestedDraft.suggestedDraft.body, 'I can confirm the proposed appointment.')

  await clientService.decideClientDraft('pending', clientIdentity, 'APPROVED')
  const assistantView = await threadService.getThreadById('pending')
  assert.equal(assistantView.draftApprovalStatus, 'APPROVED')
  assert.equal(assistantView.suggestedDraft.body, 'I can confirm the proposed appointment.')
})

test('draft rejection records the decision and returns the conversation to the client queue', async () => {
  const rejected = await clientService.decideClientDraft('awaiting-draft', clientIdentity, 'REJECTED', 'Please revise the proposed date.')
  assert.equal(rejected.draftApprovalStatus, 'REJECTED')
  assert.equal(rejected.draftRejectionReason, 'Please revise the proposed date.')
  assert.equal(rejected.clientStatus, 'PENDING_CLIENT_ACTION')
  assert.equal((await clientService.getClientInbox(clientIdentity)).some((thread) => thread.id === 'awaiting-draft'), true)
})

test('client preferences persist and are returned by the profile endpoint', async () => {
  await clientService.updateClientPreferences(clientIdentity, { conciseSummaries: false })
  const profile = await clientService.getClientProfile(clientIdentity)
  assert.equal(profile.preferences.conciseSummaries, false)
  assert.equal(readStore().users[0].preferences.conciseSummaries, false)
})

test('role middleware rejects cross-portal and missing credentials', async () => {
  const invoke = async (token) => {
    const result = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(payload) { this.payload = payload; return this } }
    let nextCalled = false
    await requirePortalRole('ASSISTANT')(
      { get: () => token ? `Bearer ${token}` : '' },
      result,
      (error) => { if (error) throw error; nextCalled = true },
    )
    return { result, nextCalled }
  }

  const wrongRole = await invoke('client-test-token')
  assert.equal(wrongRole.result.statusCode, 403)
  assert.equal(wrongRole.nextCalled, false)
  const missing = await invoke('')
  assert.equal(missing.result.statusCode, 401)
  assert.equal(missing.nextCalled, false)
  const assistant = await invoke('assistant-test-token')
  assert.equal(assistant.nextCalled, true)
})

test('handled action rejects non-boolean input', async () => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
  await clientController.markHandled({
    params: { id: 'pending' },
    user: clientIdentity,
    body: { handled: 'false' },
  }, response, (error) => { throw error })
  assert.equal(response.statusCode, 400)
  assert.equal(readStore().threads.find((thread) => thread.id === 'pending').isHandled, false)
})
