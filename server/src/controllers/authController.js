import {
  registerUser,
  authenticateUser,
  createSession,
  destroySession,
  resolveSession,
} from '../services/authService.js'

export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body || {})
    const { token, expiresAt } = await createSession(String(user._id), {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    })
    res.status(201).json({
      success: true,
      data: {
        token,
        expiresAt,
        user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
      },
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (req, res, next) => {
  try {
    const user = await authenticateUser(req.body || {})
    const { token, expiresAt } = await createSession(String(user._id), {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    })
    res.json({
      success: true,
      data: {
        token,
        expiresAt,
        user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
      },
    })
  } catch (error) {
    next(error)
  }
}

export const logout = async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || ''
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    await destroySession(match?.[1])
    res.json({ success: true, data: { signedOut: true } })
  } catch (error) {
    next(error)
  }
}

export const me = async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || ''
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    const { user } = await resolveSession(match?.[1])
    res.json({ success: true, data: { user } })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message })
    next(error)
  }
}
