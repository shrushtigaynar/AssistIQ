import * as emailAccountService from '../services/emailAccountService.js'
import { resolveSession } from '../services/authService.js'

export const listAccounts = async (req, res, next) => {
  try {
    const accounts = await emailAccountService.listAccounts(String(req.user.id))
    res.json({ success: true, data: accounts })
  } catch (error) {
    next(error)
  }
}

export const getConnectUrl = async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || ''
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }
    // The session token is echoed back through the OAuth state parameter so
    // the callback can identify the connecting user.
    const url = emailAccountService.getGoogleAuthUrl(match[1])
    res.json({ success: true, data: { url } })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message })
    next(error)
  }
}

export const googleCallback = async (req, res) => {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim()
  const { code, state, error: oauthError } = req.query
  try {
    if (oauthError || !code) {
      return res.redirect(`${clientUrl}/settings?connectError=${encodeURIComponent('Gmail connection was cancelled or failed.')}`)
    }
    const { user } = await resolveSession(state)
    const account = await emailAccountService.completeGoogleConnect(String(user.id), code)
    return res.redirect(`${clientUrl}/inbox?connected=${encodeURIComponent(account.providerEmail || 'gmail')}`)
  } catch (error) {
    const message = error.status && error.status < 500
      ? error.message
      : 'Gmail connection could not be completed. Please try again.'
    return res.redirect(`${clientUrl}/settings?connectError=${encodeURIComponent(message)}`)
  }
}

export const disconnect = async (req, res, next) => {
  try {
    const result = await emailAccountService.disconnectAccount(String(req.user.id), req.params.id)
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export const sync = async (req, res, next) => {
  try {
    const result = await emailAccountService.syncGmailAccount(String(req.user.id), req.user.email, {
      maxMessages: Number(req.body?.maxMessages) || 60,
    })
    res.json({ success: true, data: result })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message })
    next(error)
  }
}
