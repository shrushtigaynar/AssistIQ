const REQUIRED_PRODUCTION_VARIABLES = [
  'MONGODB_URI',
  'CLIENT_URL',
  'ENCRYPTION_SECRET',
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

  if (env.ENCRYPTION_SECRET.trim().length < 32) {
    throw new Error('ENCRYPTION_SECRET must be at least 32 characters long in production.')
  }

  const origins = env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
  for (const origin of origins) {
    try {
      const parsed = new URL(origin)
      if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
        throw new Error('not exact https origin')
      }
    } catch {
      throw new Error('CLIENT_URL must contain exact HTTPS origins in production.')
    }
  }
}
