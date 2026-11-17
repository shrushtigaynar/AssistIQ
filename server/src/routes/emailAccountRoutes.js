import express from 'express'
import * as controller from '../controllers/emailAccountController.js'

const router = express.Router()

router.get('/', controller.getEmailAccounts)
router.patch('/:accountId', controller.updateEmailAccount)

export default router
