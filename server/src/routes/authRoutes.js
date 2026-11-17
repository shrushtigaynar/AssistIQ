import express from 'express'
import { createPortalSession } from '../controllers/authController.js'

const router = express.Router()

router.post('/session', createPortalSession)

export default router
