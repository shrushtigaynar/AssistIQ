import express from 'express'
import * as clientController from '../controllers/clientController.js'

const router = express.Router()

router.get('/profile', clientController.getProfile)
router.patch('/profile/preferences', clientController.updatePreferences)
router.get('/inbox', clientController.getInbox)
router.get('/drafts', clientController.getDrafts)
router.get('/conversations/:id', clientController.getConversation)
router.patch('/conversations/:id/handled', clientController.markHandled)
router.post('/conversations/:id/delegate', clientController.delegate)
router.post('/conversations/:id/response', clientController.submitResponse)
router.patch('/conversations/:id/draft', clientController.decideDraft)

export default router
