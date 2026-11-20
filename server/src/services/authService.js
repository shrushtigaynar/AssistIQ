import { User } from '../models/User.js'
import { Session } from '../models/Session.js'
import { generateToken, hashToken, hashPassword, verifyPassword } from './cryptoService.js'

const SESSION_TTL_DAYS = 30
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const publicUser = (user) => ({
  id: String(user._id),
  email: user.email,
  name: user.name,
  role: user.role,
  createdAt: user.createdAt,
})

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

export const validateRegistration = ({ name, email, password }) => {
  const trimmedName = String(name || '').trim()
  if (!trimmedName || trimmedName.length > 120) {
    const error = new Error('Name must contain 1 to 120 characters')
    error.status = 400
    throw error
  }
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    const error = new Error('A valid email address is required')
    error.status = 400
    throw error
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    const error = new Error('Password must contain between 8 and 200 characters')
    error.status = 400
    throw error
  }
  return { name: trimmedName, email: normalizeEmail(email), password }
}

export const registerUser = async ({ name, email, password }) => {
  const normalized = validateRegistration({ name, email, password })

  const existing = await User.findOne({ email: normalized.email }).lean()
  if (existing) {
    const error = new Error('An account with this email already exists')
    error.status = 409
    throw error
  }

  const user = await User.create({
    name: normalized.name,
    email: normalized.email,
    passwordHash: hashPassword(normalized.password),
    role: 'CLIENT',
    organization: '',
  })
  return user
}

export const authenticateUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email)
  if (!EMAIL_PATTERN.test(normalizedEmail) || typeof password !== 'string' || !password) {
    const error = new Error('Email and password are required')
    error.status = 400
    throw error
  }

  const user = await User.findOne({ email: normalizedEmail })
  if (!user || !user.passwordHash) {
    const error = new Error('Invalid email or password')
    error.status = 401
    throw error
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const error = new Error('Invalid email or password')
    error.status = 401
    throw error
  }
  return user
}

export const createSession = async (userId, { userAgent = '', ipAddress = '' } = {}) => {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await Session.create({
    user: userId,
    tokenHash: hashToken(token),
    expiresAt,
    userAgent: String(userAgent || '').slice(0, 300),
    ipAddress: String(ipAddress || '').slice(0, 100),
  })
  return { token, expiresAt }
}

export const resolveSession = async (token) => {
  if (typeof token !== 'string' || !token) {
    const error = new Error('Authentication required')
    error.status = 401
    throw error
  }
  const session = await Session.findOne({ tokenHash: hashToken(token) })
  if (!session || session.expiresAt < new Date()) {
    if (session) await Session.deleteOne({ _id: session._id }).exec()
    const error = new Error('Your session has expired. Please sign in again.')
    error.status = 401
    throw error
  }
  const user = await User.findById(session.user)
  if (!user) {
    const error = new Error('Your session has expired. Please sign in again.')
    error.status = 401
    throw error
  }
  return { user: publicUser(user), sessionId: String(session._id) }
}

export const destroySession = async (token) => {
  if (typeof token !== 'string' || !token) return
  await Session.deleteOne({ tokenHash: hashToken(token) }).exec()
}

/** Express middleware: authenticates Bearer session tokens and attaches req.user. */
export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || ''
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    const { user, sessionId } = await resolveSession(match?.[1])
    req.user = user
    req.sessionId = sessionId
    next()
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    next(error)
  }
}
