import test from 'node:test'
import assert from 'node:assert/strict'
import { validateProductionConfig } from '../src/config/productionConfig.js'

const validProductionEnv = () => ({
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://db.example.invalid/assistiq',
  MONGODB_REQUIRED: 'true',
  CLIENT_URL: 'https://assistiq.example.com',
  ASSISTANT_PORTAL_TOKEN: 'a'.repeat(40),
  CLIENT_PORTAL_TOKEN: 'b'.repeat(40),
  ASSISTANT_EMAIL: 'assistant@example.com',
  ASSISTANT_NAME: 'Assistant',
  CLIENT_EMAIL: 'client@example.com',
  CLIENT_NAME: 'Client',
})

test('production configuration accepts required Atlas, portal, and exact HTTPS origin settings', () => {
  assert.doesNotThrow(() => validateProductionConfig(validProductionEnv()))
})

test('production configuration rejects missing frontend origin and non-HTTPS or non-exact origins', () => {
  const missingOrigin = validProductionEnv()
  delete missingOrigin.CLIENT_URL
  assert.throws(() => validateProductionConfig(missingOrigin), /CLIENT_URL/)

  for (const origin of ['http://assistiq.example.com', 'https://assistiq.example.com/portal', '*']) {
    assert.throws(() => validateProductionConfig({ ...validProductionEnv(), CLIENT_URL: origin }), /CLIENT_URL/)
  }
})

test('production configuration requires MongoDB and distinct high-entropy portal tokens', () => {
  assert.throws(
    () => validateProductionConfig({ ...validProductionEnv(), MONGODB_REQUIRED: 'false' }),
    /MONGODB_REQUIRED/,
  )
  assert.throws(
    () => validateProductionConfig({ ...validProductionEnv(), CLIENT_PORTAL_TOKEN: 'a'.repeat(40) }),
    /must be different/,
  )
  assert.throws(
    () => validateProductionConfig({ ...validProductionEnv(), ASSISTANT_PORTAL_TOKEN: 'short' }),
    /32 characters/,
  )
})

test('development configuration does not require production host settings', () => {
  assert.doesNotThrow(() => validateProductionConfig({ NODE_ENV: 'development' }))
})
