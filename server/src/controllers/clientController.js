import * as clientService from '../services/clientService.js'

export const getProfile = async (req, res, next) => {
  try {
    const data = await clientService.getClientProfile(req.user)
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const updatePreferences = async (req, res, next) => {
  try {
    const incoming = req.body?.preferences
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({ success: false, message: 'preferences object is required' })
    }
    const allowed = ['conciseSummaries', 'deadlineReminders', 'defaultReplyTone']
    if (Object.keys(incoming).some((key) => !allowed.includes(key))) {
      return res.status(400).json({ success: false, message: 'Unsupported preference field' })
    }
    const preferences = {}
    for (const key of ['conciseSummaries', 'deadlineReminders']) {
      if (incoming[key] !== undefined) {
        if (typeof incoming[key] !== 'boolean') return res.status(400).json({ success: false, message: `${key} must be a boolean` })
        preferences[key] = incoming[key]
      }
    }
    if (incoming.defaultReplyTone !== undefined) {
      if (!['professional', 'friendly', 'concise'].includes(incoming.defaultReplyTone)) {
        return res.status(400).json({ success: false, message: 'defaultReplyTone must be professional, friendly, or concise' })
      }
      preferences.defaultReplyTone = incoming.defaultReplyTone
    }
    const data = await clientService.updateClientPreferences(req.user, preferences)
    if (!data) return res.status(404).json({ success: false, message: 'Client profile not found' })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const getInbox = async (req, res, next) => {
  try {
    const includeHandled = req.query.handled === 'true'
    const data = await clientService.getClientInbox(req.user, includeHandled)
    res.json({ success: true, data, total: data.length })
  } catch (error) {
    next(error)
  }
}

export const getConversation = async (req, res, next) => {
  try {
    const data = await clientService.getClientConversation(req.params.id, req.user)
    if (!data) return res.status(404).json({ success: false, message: 'Conversation not found' })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const markHandled = async (req, res, next) => {
  try {
    if (req.body?.handled !== undefined && typeof req.body.handled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'handled must be a boolean' })
    }
    const handled = req.body?.handled !== false
    const data = await clientService.markClientHandled(req.params.id, req.user, handled)
    if (!data) return res.status(409).json({ success: false, message: 'Conversation is no longer available for this action' })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const delegate = async (req, res, next) => {
  try {
    const instruction = req.body?.instruction
    if (instruction !== undefined && typeof instruction !== 'string') {
      return res.status(400).json({ success: false, message: 'instruction must be a string' })
    }
    if (instruction && instruction.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'instruction must be 500 characters or fewer' })
    }
    const data = await clientService.delegateClientConversation(req.params.id, req.user, instruction || '')
    if (!data) return res.status(409).json({ success: false, message: 'Conversation is no longer available for delegation' })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const submitResponse = async (req, res, next) => {
  try {
    const body = req.body?.body
    if (req.body?.explicitApproval !== true) {
      return res.status(400).json({ success: false, message: 'Explicit client confirmation is required for simulated sending' })
    }
    if (typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Response body cannot be empty' })
    }
    if (body.length > 20000) return res.status(400).json({ success: false, message: 'Response must be 20000 characters or fewer' })
    const data = await clientService.submitClientResponse(req.params.id, req.user, body)
    if (!data) return res.status(409).json({ success: false, message: 'Conversation is no longer available for a client response' })
    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

export const getDrafts = async (req, res, next) => {
  try {
    const data = await clientService.getDraftsAwaitingClientApproval(req.user)
    res.json({ success: true, data, total: data.length })
  } catch (error) {
    next(error)
  }
}

export const decideDraft = async (req, res, next) => {
  try {
    const decision = req.body?.decision
    const reason = req.body?.reason === undefined ? '' : req.body.reason
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be APPROVED or REJECTED' })
    }
    if (typeof reason !== 'string' || reason.length > 500) {
      return res.status(400).json({ success: false, message: 'reason must be a string of 500 characters or fewer' })
    }
    const data = await clientService.decideClientDraft(req.params.id, req.user, decision, reason.trim())
    if (!data) return res.status(409).json({ success: false, message: 'No pending client-approval draft was found' })
    res.json({ success: true, data, message: decision === 'APPROVED'
      ? 'Draft approved. The assistant must still explicitly confirm simulated sending.'
      : 'Draft rejected and returned for revision.' })
  } catch (error) {
    next(error)
  }
}
