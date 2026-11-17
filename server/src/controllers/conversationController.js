import * as threadService from '../services/threadService.js'

export const getConversations = async (req, res, next) => {
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

export const getConversationById = async (req, res, next) => {
  try {
    const thread = await threadService.getThreadById(req.params.id)
    if (!thread) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: thread })
  } catch (err) {
    next(err)
  }
}

export const createConversation = async (req, res, next) => {
  try {
    const thread = await threadService.injectSimulatedEmail(req.body)
    const counts = await threadService.getCounts()
    res.status(201).json({ success: true, data: thread, counts })
  } catch (err) {
    next(err)
  }
}

export const updateConversation = async (req, res, next) => {
  try {
    const updated = await threadService.updateConversation(req.params.id, req.body, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const updateStatus = async (req, res, next) => {
  try {
    const { isHandled, isRead, isImportant, isStarred, isWaiting } = req.body
    const updates = {}
    for (const [field, value] of Object.entries({ isHandled, isRead, isImportant, isStarred, isWaiting })) {
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
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const updateReadStatus = async (req, res, next) => {
  try {
    if (typeof req.body?.isRead !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isRead must be a boolean' })
    }
    const updated = await threadService.updateReadStatus(req.params.id, req.body.isRead, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const markImportant = async (req, res, next) => {
  try {
    if (typeof req.body?.isImportant !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isImportant must be a boolean' })
    }
    const updated = await threadService.markImportant(req.params.id, req.body.isImportant, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const archiveConversation = async (req, res, next) => {
  try {
    const updated = await threadService.archiveConversation(req.params.id, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const restoreConversation = async (req, res, next) => {
  try {
    const updated = await threadService.restoreConversation(req.params.id, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const markHandled = async (req, res, next) => {
  try {
    const updated = await threadService.markHandled(req.params.id, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const overrideClassification = async (req, res, next) => {
  try {
    if (!['ASSISTANT_REPLY', 'CLIENT_REPLY', 'NO_REPLY_NEEDED', 'NEEDS_REVIEW'].includes(req.body?.classification)) {
      return res.status(400).json({ success: false, message: 'A valid classification is required' })
    }
    if (req.body?.reason !== undefined && (typeof req.body.reason !== 'string' || req.body.reason.length > 500)) {
      return res.status(400).json({ success: false, message: 'reason must be a string of 500 characters or fewer' })
    }
    const updated = await threadService.updateClassification(
      req.params.id,
      req.body.classification,
      req.body.reason,
      req.user.name
    )
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    const counts = await threadService.getCounts()
    res.json({ success: true, data: updated, counts })
  } catch (err) {
    next(err)
  }
}

export const getMessages = async (req, res, next) => {
  try {
    const messages = await threadService.getMessages(req.params.id)
    res.json({ success: true, data: messages })
  } catch (err) {
    next(err)
  }
}

export const addMessage = async (req, res, next) => {
  try {
    const updated = await threadService.addMessage(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const getNotes = async (req, res, next) => {
  try {
    const notes = await threadService.getNotes(req.params.id)
    res.json({ success: true, data: notes })
  } catch (err) {
    next(err)
  }
}

export const addNote = async (req, res, next) => {
  try {
    if (typeof req.body?.text !== 'string' || !req.body.text.trim() || req.body.text.length > 5000) {
      return res.status(400).json({ success: false, message: 'Note text must contain 1 to 5000 characters' })
    }
    const updated = await threadService.addInternalNote(req.params.id, req.body.text.trim(), req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const getDrafts = async (req, res, next) => {
  try {
    const drafts = await threadService.getDrafts(req.params.id)
    res.json({ success: true, data: drafts })
  } catch (err) {
    next(err)
  }
}

export const saveDraft = async (req, res, next) => {
  try {
    if (req.body?.body !== undefined && (typeof req.body.body !== 'string' || req.body.body.length > 20000)) {
      return res.status(400).json({ success: false, message: 'Draft body must be a string of 20000 characters or fewer' })
    }
    const updated = await threadService.saveDraft(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const deleteDraft = async (req, res, next) => {
  try {
    const updated = await threadService.deleteDraft(req.params.id)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const getActionItems = async (req, res, next) => {
  try {
    const items = await threadService.getActionItems(req.params.id)
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
}

export const createActionItem = async (req, res, next) => {
  try {
    const updated = await threadService.createActionItem(req.params.id, req.body, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const updateActionItem = async (req, res, next) => {
  try {
    const updated = await threadService.updateActionItem(req.params.id, req.params.actionId, req.body, req.user.name)
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversation or action item not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await threadService.getActivityLogs(req.params.id)
    res.json({ success: true, data: logs })
  } catch (err) {
    next(err)
  }
}
