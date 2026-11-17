import { resolvePortalIdentity } from '../services/portalAuthService.js'

export const createPortalSession = async (req, res, next) => {
  try {
    const identity = await resolvePortalIdentity(req.body?.token)
    res.json({
      success: true,
      data: {
        role: identity.role,
        user: {
          id: identity.id,
          email: identity.email,
          name: identity.name,
          preferences: identity.preferences,
        },
      },
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    next(error)
  }
}
