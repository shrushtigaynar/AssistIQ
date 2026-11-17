import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeConversation, analyzeThread, answerConversationQuestion, generateReplyDraft } from '../src/services/aiService.js'
import { mergeActionItems, mergePersistedAnalysis } from '../src/services/threadService.js'
import { sendReply } from '../src/controllers/threadController.js'

const originalApiKey = process.env.GEMINI_API_KEY
const originalThreshold = process.env.AI_CONFIDENCE_THRESHOLD
const originalFetch = globalThis.fetch

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY
  else process.env.GEMINI_API_KEY = originalApiKey
  if (originalThreshold === undefined) delete process.env.AI_CONFIDENCE_THRESHOLD
  else process.env.AI_CONFIDENCE_THRESHOLD = originalThreshold
  globalThis.fetch = originalFetch
})

test('fallback classifies assistant, client, informational, and ambiguous examples', () => {
  delete process.env.GEMINI_API_KEY
  const examples = [
    [{ subject: 'Scheduling request', body: 'Could you schedule a call with our team next week?' }, 'ASSISTANT_REPLY'],
    [{ subject: 'Signature needed', body: 'David, please approve and sign the term sheet by Friday at 5 PM.' }, 'CLIENT_REPLY'],
    [{ subject: 'Shipping notification', body: 'Automated shipping notification: package delivered.' }, 'NO_REPLY_NEEDED'],
    [{ subject: 'Checking in', body: 'Checking in on the matter; let me know when convenient.' }, 'NEEDS_REVIEW'],
  ]

  for (const [thread, expected] of examples) {
    assert.equal(analyzeThread(thread).classification, expected)
  }
})

test('fallback uses earlier conversation messages and sends uncertain confidence to review', () => {
  delete process.env.GEMINI_API_KEY
  const thread = {
    subject: 'Follow-up',
    messages: [
      { sender: { name: 'Customer', email: 'c@example.test' }, body: 'David, please approve the proposed budget.' },
      { sender: { name: 'David', email: 'd@example.test', isMe: true }, body: 'Thanks, I will review this.' },
      { sender: { name: 'Customer', email: 'c@example.test' }, body: 'Following up on this request.' },
    ],
  }
  assert.equal(analyzeThread(thread).classification, 'CLIENT_REPLY')

  const ambiguous = analyzeThread({ subject: 'Follow-up', body: 'Checking in on the matter; let me know when convenient.' })
  assert.equal(ambiguous.classification, 'NEEDS_REVIEW')
  assert.ok(ambiguous.aiConfidence < Number(process.env.AI_CONFIDENCE_THRESHOLD || 0.75))
})

test('Gemini JSON responses are normalized and low confidence becomes needs review', async () => {
  process.env.GEMINI_API_KEY = 'test-key'
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.method, 'POST')
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                classification: 'CLIENT_REPLY',
                aiConfidence: 0.6,
                aiReasoning: 'A personal decision is requested.',
                summary: 'A decision is requested.',
                suggestedAction: 'Review the request.',
                actionItems: [{ task: 'Approve the request', assignedTo: 'client', deadline: '', priority: 'high' }],
                meeting: null,
              }),
            }],
          },
        }],
      }),
    }
  }

  const result = await analyzeConversation({ subject: 'Decision', body: 'Please approve this.' })
  assert.equal(result.aiSource, 'Gemini')
  assert.equal(result.aiSuggestedClassification, 'CLIENT_REPLY')
  assert.equal(result.classification, 'NEEDS_REVIEW')
  assert.equal(result.actionItems[0].assignedTo, 'client')
  assert.match(result.classificationReason, /review threshold/)
})

test('failed provider calls use explicitly labelled fallback and do not invent deadlines', async () => {
  process.env.GEMINI_API_KEY = 'test-key'
  globalThis.fetch = async () => { throw new Error('offline') }
  const thread = { subject: 'A general question', body: 'Could you share your thoughts?' }
  const analysis = await analyzeConversation(thread)
  assert.equal(analysis.aiSource, 'Rule-Based Demo Processing')
  const answer = await answerConversationQuestion(thread, 'What deadline was mentioned?')
  assert.match(answer.answer, /No explicit deadline/i)
  assert.equal(answer.aiSource, 'Rule-Based Demo Processing')
})

test('draft fallback is conservative and labels rule-based output', async () => {
  delete process.env.GEMINI_API_KEY
  const draft = await generateReplyDraft({
    subject: 'Project update',
    sender: { name: 'Taylor', email: 'taylor@example.test' },
    body: 'Could you respond?',
  }, 'friendly')
  assert.equal(draft.aiSource, 'Rule-Based Demo Processing')
  assert.equal(draft.tone, 'friendly')
  assert.match(draft.body, /Could you share any additional context/)
  assert.doesNotMatch(draft.body, /approved|signed|confirmed/i)
})

test('reanalysis merges duplicate actions while preserving completion state', () => {
  const result = mergeActionItems(
    [{ id: 'existing', task: 'Review contract', completed: true, assignedTo: 'client' }],
    [{ task: 'Please review the contract', completed: false, assignedTo: 'client', deadline: '' }],
  )
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'existing')
  assert.equal(result[0].completed, true)
})

test('reanalysis preserves assistant-edited action details and provenance', () => {
  const result = mergeActionItems(
    [{
      id: 'existing',
      task: 'Review final contract',
      assignedTo: 'assistant',
      completed: false,
      dueAt: '2026-11-20T23:59:59.999Z',
      priority: 'urgent',
      source: 'USER',
    }],
    [{
      task: 'Please review the final contract',
      assignedTo: 'client',
      completed: false,
      dueAt: null,
      priority: 'normal',
      source: 'AI',
    }],
  )
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'existing')
  assert.equal(result[0].task, 'Review final contract')
  assert.equal(result[0].assignedTo, 'assistant')
  assert.equal(result[0].priority, 'urgent')
  assert.equal(result[0].dueAt, '2026-11-20T23:59:59.999Z')
  assert.equal(result[0].source, 'USER')

  const clearedDate = mergeActionItems(
    [{ id: 'cleared', task: 'Review final contract', dueAt: null, source: 'USER' }],
    [{ task: 'Please review the final contract', dueAt: '2026-11-30T23:59:59.999Z', source: 'AI' }],
  )
  assert.equal(clearedDate[0].dueAt, null)
})

test('persisting new analysis never replaces a manual classification', () => {
  const result = mergePersistedAnalysis(
    {
      classification: 'CLIENT_REPLY',
      classificationManual: true,
      classificationReason: 'Confirmed by assistant.',
      actionItems: [],
    },
    {
      classification: 'ASSISTANT_REPLY',
      aiSuggestedClassification: 'ASSISTANT_REPLY',
      aiConfidence: 0.9,
      aiReasoning: 'Routine request.',
      classificationReason: 'Routine request.',
      suggestedAction: 'Prepare a response.',
      summary: 'The sender requests a response.',
      actionItems: [],
      meeting: null,
      aiSource: 'Gemini',
      isWaiting: false,
    },
  )
  assert.equal(result.classification, 'CLIENT_REPLY')
  assert.equal(result.aiSuggestedClassification, 'ASSISTANT_REPLY')
  assert.equal(result.classificationReason, 'Confirmed by assistant.')
})

test('reanalysis preserves manually edited meetings and scheduled follow-up state', () => {
  const result = mergePersistedAnalysis(
    {
      classification: 'ASSISTANT_REPLY',
      classificationManual: false,
      actionItems: [],
      meeting: {
        hasMeeting: true,
        title: 'Manually corrected title',
        date: '2026-11-20',
        source: 'MANUAL',
        status: 'SCHEDULED',
      },
      followUp: { status: 'SCHEDULED', dueAt: '2026-11-18T23:59:59.999Z' },
      isWaiting: true,
    },
    {
      classification: 'ASSISTANT_REPLY',
      aiConfidence: 0.9,
      aiReasoning: 'Routine request.',
      classificationReason: 'Routine request.',
      suggestedAction: 'Prepare a response.',
      summary: 'The sender requests a response.',
      actionItems: [],
      meeting: { hasMeeting: true, title: 'Different AI title', date: '2026-11-21' },
      aiSource: 'Gemini',
      isWaiting: false,
    },
  )
  assert.equal(result.meeting.title, 'Manually corrected title')
  assert.equal(result.meeting.source, 'MANUAL')
  assert.equal(result.followUp.status, 'SCHEDULED')
  assert.equal(result.isWaiting, true)
})

test('simulated sending is rejected without explicit approval', async () => {
  let statusCode
  let payload
  const response = {
    status(code) {
      statusCode = code
      return this
    },
    json(value) {
      payload = value
      return this
    },
  }
  await sendReply(
    { params: { id: 'not-used' }, body: { body: 'Reply body' } },
    response,
    (error) => { throw error },
  )
  assert.equal(statusCode, 400)
  assert.match(payload.message, /Explicit human approval/)
})
