import express from 'express'
import { register, login, logout, me } from '../controllers/authController.js'
import { requireAuth } from '../services/authService.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get('/me', requireAuth, (req, res) => res.json({ success: true, data: { user: req.user } }))

export default router
