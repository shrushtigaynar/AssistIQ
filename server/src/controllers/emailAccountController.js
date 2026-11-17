import { getEmailAccounts as loadEmailAccounts } from '../services/workspaceService.js'

export const getEmailAccounts = async (req, res, next) => {
  try {
    const accounts = await loadEmailAccounts(req.user.id, req.user.email)
    res.json({ success: true, data: accounts })
  } catch (err) {
    next(err)
  }
}

export const updateEmailAccount = async (req, res, next) => {
  try {
    const error = new Error('Email accounts are simulated; live connection changes are not available')
    error.status = 409
    throw error
  } catch (err) {
    next(err)
  }
}
