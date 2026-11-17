import * as threadService from '../services/threadService.js'

export const getThreads = async (req, res, next) => {
  try {
    const threads = await threadService.getAllThreads(req.query)
    const counts = await threadService.getCounts()
    res.json({
      success: true,
      data: threads,
      counts,
      total: threads.length,
    })
  } catch (err) {
    next(err)
  }
}

export const getCounts = async (req, res, next) => {
  try {
    const counts = await threadService.getCounts()
    res.json({ success: true, counts })
  } catch (err) {
    next(err)
  }
}

export const getThreadById = async (req, res, next) => {
  try {
    const thread = await threadService.getThreadById(req.params.id)
    if (!thread) {
      return res.status(404).json({ success: false, message: 'Thread not found' })
    }
    res.json({ success: true, data: thread })
  } catch (err) {
    next(err)
  }
}

export const overrideClassification = async (req, res, next) => {
  try {
    const { classification, reason, user } = req.body
    if (!['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'].includes(classification)) {
      return res.status(400).json({ success: false, message: 'A valid classification is required' })
    }
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
      return res.status(400).json({ success: false, message: 'reason must be a string of 500 characters or fewer' })
    }

    const updated = await threadService.updateClassification(
      req.params.id,
      classification,
      reason,
      req.user.name
    )

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Thread not found' })
    }

    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const updateStatus = async (req, res, next) => {
  try {
    const { isHandled, isStarred, isImportant, isRead, isWaiting } = req.body
    const updates = {}
    for (const [field, value] of Object.entries({ isHandled, isStarred, isImportant, isRead, isWaiting })) {
      if (value !== undefined && typeof value !== 'boolean') {
        return res.status(400).json({ success: false, message: `${field} must be a boolean` })
      }
      if (value !== undefined) updates[field] = value
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'At least one valid status field is required' })
    }
    const updated = await threadService.updateStatus(req.params.id, updates, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Thread not found' })
    }

    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const addNote = async (req, res, next) => {
  try {
    const { text } = req.body
    if (typeof text !== 'string' || !text.trim() || text.length > 5000) {
      return res.status(400).json({ success: false, message: 'Note text must contain 1 to 5000 characters' })
    }

    const updated = await threadService.addInternalNote(req.params.id, text.trim(), req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Thread not found' })
    }

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const saveDraft = async (req, res, next) => {
  try {
    const { to, cc, subject, body, tone, aiSource, fallbackReason } = req.body
    const updated = await threadService.saveDraft(req.params.id, { to, cc, subject, body, tone, aiSource, fallbackReason })
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Thread not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const requestDraftApproval = async (req, res, next) => {
  try {
    const updated = await threadService.requestClientDraftApproval(req.params.id, req.body, req.user.email)
    if (!updated) return res.status(404).json({ success: false, message: 'Thread not found' })
    res.json({ success: true, data: updated })
  } catch (error) {
    if (error.message === 'A non-empty draft is required for client approval'
      || error.message === 'Only client-response conversations can request client approval') {
      return res.status(400).json({ success: false, message: error.message })
    }
    next(error)
  }
}

export const sendReply = async (req, res, next) => {
  try {
    const { to, cc, subject, body, tone, resultingStatus = 'WAITING_FOR', explicitApproval } = req.body
    if (explicitApproval !== true) {
      return res.status(400).json({ success: false, message: 'Explicit human approval is required for simulated sending' })
    }
    if (typeof body !== 'string' || !body.trim() || body.length > 20000) {
      return res.status(400).json({ success: false, message: 'Reply body must contain 1 to 20000 characters' })
    }
    if (!['WAITING_FOR', 'HANDLED'].includes(resultingStatus)) {
      return res.status(400).json({ success: false, message: 'resultingStatus must be WAITING_FOR or HANDLED' })
    }

    const updated = await threadService.sendReply(
      req.params.id,
      { to, cc, subject, body, tone },
      resultingStatus,
      req.user.name
    )

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Thread not found' })
    }

    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const toggleAction = async (req, res, next) => {
  try {
    const updated = await threadService.toggleActionItem(req.params.id, req.params.actionId)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Thread or action item not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const bulkUpdate = async (req, res, next) => {
  try {
    const { threadIds, action, value } = req.body
    if (!Array.isArray(threadIds) || threadIds.length === 0
      || threadIds.some((id) => typeof id !== 'string' || !id.trim())) {
      return res.status(400).json({ success: false, message: 'threadIds must be a non-empty array of non-empty strings' })
    }
    if (!['markRead', 'markUnread', 'markImportant', 'archive', 'restore', 'reclassify'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Unsupported bulk action' })
    }
    if (action === 'reclassify' && !threadService.VALID_CLASSIFICATIONS.includes(value)) {
      return res.status(400).json({ success: false, message: 'A valid classification is required for bulk reclassification' })
    }

    const updated = await threadService.bulkUpdate(threadIds, action, value, req.user.name)
    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const injectEmail = async (req, res, next) => {
  try {
    const newThread = await threadService.injectSimulatedEmail(req.body)
    const counts = await threadService.getCounts()
    res.status(201).json({ success: true, data: newThread, counts })
  } catch (err) {
    next(err)
  }
}
