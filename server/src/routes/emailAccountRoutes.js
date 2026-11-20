import express from 'express'
import {
  listAccounts,
  getConnectUrl,
  googleCallback,
  disconnect,
  sync,
} from '../controllers/emailAccountController.js'
import { requireAuth } from '../services/authService.js'

const router = express.Router()

// Public: Google redirects here after consent (user is resolved via the state token).
router.get('/google/callback', googleCallback)

router.use(requireAuth)
router.get('/', listAccounts)
router.get('/google/connect-url', getConnectUrl)
router.post('/google/sync', sync)
router.delete('/:id', disconnect)

export default router
