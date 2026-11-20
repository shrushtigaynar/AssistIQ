import express from 'express'
import * as threadController from '../controllers/threadController.js'

const router = express.Router()

router.get('/', threadController.getThreads)
router.get('/counts', threadController.getThreadCounts)
router.get('/:id', threadController.getThreadById)
router.patch('/:id/classification', threadController.overrideClassification)
router.patch('/:id/status', threadController.updateStatus)
router.post('/:id/analyze', threadController.analyze)
router.post('/:id/draft/generate', threadController.generateDraft)
router.put('/:id/draft', threadController.saveDraft)
router.post('/:id/send', threadController.sendReply)

export default router
