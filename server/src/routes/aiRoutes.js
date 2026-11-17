import express from 'express'
import * as aiController from '../controllers/aiController.js'

const router = express.Router()

router.post('/analyze', aiController.analyzeSingleThread)
router.post('/classify', aiController.classifySingleThread)
router.post('/conversations/:id/analyze', aiController.analyzeConversationById)
router.post('/conversations/:id/reanalyze', aiController.analyzeConversationById)
router.get('/conversations/:id/analysis', aiController.getConversationAnalysis)
router.post('/conversations/:id/summary', aiController.generateConversationSummary)
router.post('/conversations/:id/action-items', aiController.extractConversationActions)
router.post('/conversations/:id/meeting', aiController.extractConversationMeeting)
router.post('/conversations/:id/draft', aiController.generateConversationDraft)
router.post('/conversations/:id/questions', aiController.askConversationQuestion)

export default router
