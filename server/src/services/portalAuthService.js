import { createHash, timingSafeEqual } from 'node:crypto'
import { shouldUseMongo } from '../config/db.js'
import { User } from '../models/User.js'

const portalIdentities = () => [
  {
    role: 'ASSISTANT',
    token: process.env.ASSISTANT_PORTAL_TOKEN || '',
    email: (process.env.ASSISTANT_EMAIL || 'elena.rostova@vancecap.com').toLowerCase(),
    name: process.env.ASSISTANT_NAME || 'Elena Rostova',
  },
  {
    role: 'CLIENT',
    token: process.env.CLIENT_PORTAL_TOKEN || '',
    email: (process.env.CLIENT_EMAIL || 'david.vance@vancecap.com').toLowerCase(),
    name: process.env.CLIENT_NAME || 'David Vance',
  },
]

const matchesToken = (provided, expected) => {
  const providedHash = createHash('sha256').update(provided).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(providedHash, expectedHash)
}

export const resolvePortalIdentity = async (token) => {
  const configuredIdentities = portalIdentities()
  if (configuredIdentities[0].token && configuredIdentities[0].token === configuredIdentities[1].token) {
    const error = new Error('Assistant and client portal tokens must be different')
    error.status = 503
    throw error
  }
  const identities = configuredIdentities.filter((identity) => identity.token)
  if (!identities.length) {
    const error = new Error('Portal access is not configured. Set role-specific portal tokens on the backend.')
    error.status = 503
    throw error
  }
  if (typeof token !== 'string' || !token) {
    const error = new Error('A portal access token is required')
    error.status = 401
    throw error
  }

  const identity = identities.find((configured) => matchesToken(token, configured.token))
  if (!identity) {
    const error = new Error('Invalid portal access token')
    error.status = 401
    throw error
  }

  if (shouldUseMongo()) {
    let user = await User.findOne({ email: identity.email })
    if (user && user.role !== identity.role) {
      const error = new Error('Configured portal role does not match the stored user role')
      error.status = 403
      throw error
    }
    if (!user) {
      user = await User.create({
        email: identity.email,
        name: identity.name,
        role: identity.role,
      })
    }
    return {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      preferences: user.preferences,
    }
  }

  return {
    id: identity.email,
    email: identity.email,
    name: identity.name,
    role: identity.role,
    preferences: {
      conciseSummaries: true,
      deadlineReminders: true,
      defaultReplyTone: 'professional',
    },
  }
}

export const requirePortalRole = (role) => async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || ''
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    const identity = await resolvePortalIdentity(match?.[1])
    if (identity.role !== role) {
      return res.status(403).json({ success: false, message: `${role.toLowerCase()} portal access is required` })
    }
    req.user = identity
    return next()
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    return next(error)
  }
}
