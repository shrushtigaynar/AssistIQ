import express from 'express'
import * as controller from '../controllers/workspaceController.js'

const router = express.Router()

router.get('/overview', controller.getOverview)
router.get('/action-items', controller.getActionItems)
router.patch('/action-items/:threadId/:actionId', controller.updateActionItem)
router.get('/follow-ups', controller.getFollowUps)
router.patch('/follow-ups/:threadId', controller.updateFollowUp)
router.get('/meetings', controller.getMeetings)
router.patch('/meetings/:threadId', controller.updateMeeting)
router.get('/settings', controller.getSettings)
router.patch('/settings/profile', controller.updateProfile)

export default router
