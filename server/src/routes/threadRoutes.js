import express from 'express'
import * as threadController from '../controllers/threadController.js'

const router = express.Router()

// Threads collection endpoints
router.get('/', threadController.getThreads)
router.get('/counts', threadController.getCounts)
router.post('/bulk', threadController.bulkUpdate)
router.post('/inject', threadController.injectEmail)

// Single thread endpoints
router.get('/:id', threadController.getThreadById)
router.patch('/:id/classification', threadController.overrideClassification)
router.patch('/:id/status', threadController.updateStatus)
router.post('/:id/notes', threadController.addNote)
router.put('/:id/draft', threadController.saveDraft)
router.post('/:id/draft/request-approval', threadController.requestDraftApproval)
router.post('/:id/reply', threadController.sendReply)
router.patch('/:id/actions/:actionId', threadController.toggleAction)

export default router
