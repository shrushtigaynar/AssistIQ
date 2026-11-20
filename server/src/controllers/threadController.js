import * as threadService from '../services/threadService.js'
import { getConnectedAccount, getFreshAccessToken } from '../services/emailAccountService.js'
import { sendGmailMessage } from '../services/gmailService.js'

export const getThreads = async (req, res, next) => {
  try {
    const [threads, counts] = await Promise.all([
      threadService.listThreads(req.user.email, req.query),
      threadService.getCounts(req.user.email),
    ])
    res.json({ success: true, data: threads, counts })
  } catch (error) {
    next(error)
  }
}

export const getThreadCounts = async (req, res, next) => {
  try {
    const counts = await threadService.getCounts(req.user.email)
    res.json({ success: true, counts })
  } catch (error) {
    next(error)
  }
}

export const getThreadById = async (req, res, next) => {
  try {
    const thread = await threadService.getThreadById(req.user.email, req.params.id)
    if (!thread) return res.status(404).json({ success: false, message: 'Email not found' })
    res.json({ success: true, data: thread })
  } catch (error) {
    next(error)
  }
}

export const overrideClassification = async (req, res, next) => {
  try {
    const { classification, reason } = req.body || {}
    if (!threadService.VALID_CLASSIFICATIONS.includes(classification)) {
      return res.status(400).json({ success: false, message: 'A valid classification is required' })
    }
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
      return res.status(400).json({ success: false, message: 'reason must be a string of 500 characters or fewer' })
    }
    const updated = await threadService.updateClassification(req.user.email, req.params.id, classification, reason, req.user.name)
    if (!updated) return res.status(404).json({ success: false, message: 'Email not found' })
    res.json({ success: true, data: updated })
  } catch (error) {
    next(error)
  }
}

export const updateStatus = async (req, res, next) => {
  try {
    const updated = await threadService.updateStatus(req.user.email, req.params.id, req.body || {}, req.user.name)
    if (!updated) return res.status(404).json({ success: false, message: 'Email not found' })
    res.json({ success: true, data: updated })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message })
    next(error)
  }
}

export const analyze = async (req, res, next) => {
  try {
    const thread = await threadService.analyzeAndPersistThread(req.user.email, req.params.id)
    if (!thread) return res.status(404).json({ success: false, message: 'Email not found' })
    res.json({ success: true, data: thread })
  } catch (error) {
    next(error)
  }
}

export const generateDraft = async (req, res, next) => {
  try {
    const tone = String(req.body?.tone || 'professional').toLowerCase()
    if (!['professional', 'friendly', 'concise'].includes(tone)) {
      return res.status(400).json({ success: false, message: 'Tone must be professional, friendly, or concise' })
    }
    const result = await threadService.generateDraft(req.user.email, req.params.id, tone)
    if (!result) return res.status(404).json({ success: false, message: 'Email not found' })
    res.json({ success: true, data: { draft: result.draft, thread: result.thread } })
  } catch (error) {
    next(error)
  }
}

export const saveDraft = async (req, res, next) => {
  try {
    const { to, cc, subject, body, tone, aiSource, fallbackReason } = req.body || {}
    const updated = await threadService.saveDraft(req.user.email, req.params.id, { to, cc, subject, body, tone, aiSource, fallbackReason })
    if (!updated) return res.status(404).json({ success: false, message: 'Email not found' })
    res.json({ success: true, data: updated })
  } catch (error) {
    next(error)
  }
}

/**
 * Send a reply through the user's connected Gmail account.
 * Requires explicitApproval === true — replies are never sent automatically.
 */
export const sendReply = async (req, res, next) => {
  try {
    const { to, cc, subject, body, explicitApproval } = req.body || {}
    if (explicitApproval !== true) {
      return res.status(400).json({ success: false, message: 'Explicit human approval is required before sending' })
    }
    if (typeof body !== 'string' || !body.trim() || body.length > 20000) {
      return res.status(400).json({ success: false, message: 'Reply body must contain 1 to 20000 characters' })
    }
    if (typeof to !== 'string' || !to.trim()) {
      return res.status(400).json({ success: false, message: 'A recipient is required' })
    }

    const account = await getConnectedAccount(String(req.user.id))
    if (!account) {
      return res.status(409).json({ success: false, message: 'Connect your Gmail account before sending replies. No email was sent.' })
    }

    const accessToken = await getFreshAccessToken(account)
    const ccList = typeof cc === 'string'
      ? cc.split(',').map((value) => value.trim()).filter(Boolean)
      : Array.isArray(cc) ? cc : []

    const sent = await sendGmailMessage(accessToken, { to: to.trim(), cc: ccList, subject, body })

    const updated = await threadService.markThreadSent(req.user.email, req.params.id, {
      to: to.trim(),
      cc: ccList,
      body,
      recipients: [to.trim(), ...ccList],
    }, req.user.name)

    res.json({
      success: true,
      data: { gmailMessageId: sent.id, thread: updated },
      message: 'Reply sent via Gmail.',
    })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message })
    next(error)
  }
}
