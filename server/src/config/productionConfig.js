const REQUIRED_PRODUCTION_VARIABLES = [
  'MONGODB_URI',
  'CLIENT_URL',
  'ASSISTANT_PORTAL_TOKEN',
  'CLIENT_PORTAL_TOKEN',
  'ASSISTANT_EMAIL',
  'ASSISTANT_NAME',
  'CLIENT_EMAIL',
  'CLIENT_NAME',
]

export const validateProductionConfig = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return

  const missing = REQUIRED_PRODUCTION_VARIABLES.filter((key) => !env[key]?.trim())
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`)
  }

  if (env.MONGODB_REQUIRED !== 'true') {
    throw new Error('MONGODB_REQUIRED must be true in production.')
  }

  const assistantToken = env.ASSISTANT_PORTAL_TOKEN.trim()
  const clientToken = env.CLIENT_PORTAL_TOKEN.trim()
  if (assistantToken === clientToken) {
    throw new Error('Assistant and client portal tokens must be different.')
  }
  if (assistantToken.length < 32 || clientToken.length < 32) {
    throw new Error('Production portal tokens must each be at least 32 characters long.')
  }

  const origins = env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
  for (const origin of origins) {
    let parsedOrigin
    try {
      parsedOrigin = new URL(origin)
    } catch {
      throw new Error('CLIENT_URL must contain exact HTTPS origins.')
    }

    if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) {
      throw new Error('CLIENT_URL must contain exact HTTPS origins without paths or trailing slashes.')
    }
  }
}
