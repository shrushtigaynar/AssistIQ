import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

// Derive a stable AES-256 key from the configured secret.
let cachedKey = null
const getEncryptionKey = () => {
  if (!process.env.ENCRYPTION_SECRET || process.env.ENCRYPTION_SECRET.length < 16) {
    throw new Error('ENCRYPTION_SECRET must be configured (at least 16 characters).')
  }
  if (!cachedKey) {
    cachedKey = scryptSync(process.env.ENCRYPTION_SECRET, 'assistiq-token-encryption', 32)
  }
  return cachedKey
}

/** Encrypt a string for storage (Gmail OAuth tokens). Output: v1.<iv>.<tag>.<cipher> (base64url). */
export const encryptSecret = (plain) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

/** Decrypt a value produced by encryptSecret. */
export const decryptSecret = (payload) => {
  const [version, ivB64, tagB64, dataB64] = String(payload || '').split('.')
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Encrypted payload is malformed')
  }
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()])
  return decrypted.toString('utf8')
}

/** Hash a session token before storing it in the database. */
export const hashToken = (token) => createHash('sha256').update(String(token || '')).digest('hex')

/** Generate a URL-safe random session token. */
export const generateToken = () => randomBytes(32).toString('base64url')

const SALT_BYTES = 16
const KEY_LENGTH = 64
const SCRYPT_COST = 16384

/** Hash a password with scrypt. Output: scrypt$<cost>$<salt>$<hash> (base64url). */
export const hashPassword = (password) => {
  const salt = randomBytes(SALT_BYTES)
  const derived = scryptSync(String(password), salt, KEY_LENGTH, { N: SCRYPT_COST })
  return ['scrypt', SCRYPT_COST, salt.toString('base64url'), derived.toString('base64url')].join('$')
}

/** Constant-time password verification. */
export const verifyPassword = (password, stored) => {
  const [scheme, cost, saltB64, hashB64] = String(stored || '').split('$')
  if (scheme !== 'scrypt' || !cost || !saltB64 || !hashB64) return false
  const salt = Buffer.from(saltB64, 'base64url')
  const expected = Buffer.from(hashB64, 'base64url')
  const actual = scryptSync(String(password), salt, expected.length, { N: Number(cost) })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
