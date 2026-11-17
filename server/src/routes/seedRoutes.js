import express from 'express'
import * as seedController from '../controllers/seedController.js'

const router = express.Router()

router.post('/reset', seedController.resetSeed)

export default router
