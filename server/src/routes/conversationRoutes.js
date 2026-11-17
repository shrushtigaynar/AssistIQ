import express from 'express'
import * as controller from '../controllers/conversationController.js'

const router = express.Router()

router.get('/', controller.getConversations)
router.get('/counts', controller.getConversations)
router.post('/', controller.createConversation)
router.get('/:id', controller.getConversationById)
router.patch('/:id', controller.updateConversation)
router.patch('/:id/classification', controller.overrideClassification)
router.patch('/:id/status', controller.updateStatus)
router.patch('/:id/read', controller.updateReadStatus)
router.patch('/:id/important', controller.markImportant)
router.patch('/:id/archive', controller.archiveConversation)
router.patch('/:id/restore', controller.restoreConversation)
router.patch('/:id/handled', controller.markHandled)
router.get('/:id/messages', controller.getMessages)
router.post('/:id/messages', controller.addMessage)
router.get('/:id/notes', controller.getNotes)
router.post('/:id/notes', controller.addNote)
router.get('/:id/drafts', controller.getDrafts)
router.put('/:id/draft', controller.saveDraft)
router.post('/:id/draft', controller.saveDraft)
router.delete('/:id/draft', controller.deleteDraft)
router.get('/:id/action-items', controller.getActionItems)
router.post('/:id/action-items', controller.createActionItem)
router.patch('/:id/action-items/:actionId', controller.updateActionItem)
router.get('/:id/activity-log', controller.getActivityLogs)

export default router
