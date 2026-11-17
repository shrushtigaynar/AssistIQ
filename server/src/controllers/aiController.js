import {
  analyzeConversation,
} from '../services/aiService.js'
import {
  analyzeAndPersistThread,
  answerThreadQuestion,
  createThreadReplyDraft,
  getThreadAnalysis,
} from '../services/threadService.js'

export const analyzeSingleThread = async (req, res, next) => {
  try {
    const payload = req.body?.thread || req.body || {}
    const analysis = await analyzeConversation(payload)
    res.json({ success: true, data: analysis })
  } catch (error) {
    next(error)
  }
}

export const classifySingleThread = async (req, res, next) => {
  try {
    const payload = req.body?.thread || req.body || {}
    const analysis = await analyzeConversation(payload)
    const classified = {
      ...payload,
      ...analysis,
      classification: payload.classificationManual ? payload.classification : analysis.classification,
    }
    res.json({ success: true, data: classified })
  } catch (error) {
    next(error)
  }
}

export const analyzeConversationById = async (req, res, next) => {
  try {
    const data = await analyzeAndPersistThread(req.params.id)
    if (!data) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({ success: true, data: await getThreadAnalysis(req.params.id) })
  } catch (error) {
    next(error)
  }
}

export const getConversationAnalysis = async (req, res, next) => {
  try {
    const data = await getThreadAnalysis(req.params.id)
    if (!data) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const generateConversationSummary = async (req, res, next) => {
  try {
    const analysis = await analyzeAndPersistThread(req.params.id)
    if (!analysis) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({
      success: true,
      data: { summary: analysis.summary, suggestedAction: analysis.suggestedAction, aiSource: analysis.aiSource },
    })
  } catch (error) {
    next(error)
  }
}

export const extractConversationActions = async (req, res, next) => {
  try {
    const analysis = await analyzeAndPersistThread(req.params.id)
    if (!analysis) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({ success: true, data: analysis.actionItems || [], aiSource: analysis.aiSource })
  } catch (error) {
    next(error)
  }
}

export const extractConversationMeeting = async (req, res, next) => {
  try {
    const analysis = await analyzeAndPersistThread(req.params.id)
    if (!analysis) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({ success: true, data: analysis.meeting || null, aiSource: analysis.aiSource })
  } catch (error) {
    next(error)
  }
}

export const generateConversationDraft = async (req, res, next) => {
  try {
    const tone = String(req.body?.tone || 'professional').toLowerCase()
    if (!['professional', 'friendly', 'concise'].includes(tone)) {
      return res.status(400).json({ success: false, message: 'Tone must be professional, friendly, or concise' })
    }
    const data = await createThreadReplyDraft(req.params.id, tone)
    if (!data) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({ success: true, data: data.generatedDraft })
  } catch (error) {
    next(error)
  }
}

export const askConversationQuestion = async (req, res, next) => {
  try {
    const question = String(req.body?.question || '').trim()
    if (!question) return res.status(400).json({ success: false, message: 'Question is required' })
    if (question.length > 1000) return res.status(400).json({ success: false, message: 'Question must be 1000 characters or fewer' })
    const data = await answerThreadQuestion(req.params.id, question)
    if (!data) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}
