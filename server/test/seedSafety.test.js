import assert from 'node:assert/strict'
import test from 'node:test'
import { resetDatabase } from '../src/services/threadService.js'

test('seed reset refuses to delete records unless explicitly enabled for development', async () => {
  const originalEnvironment = process.env.NODE_ENV
  const originalResetFlag = process.env.ENABLE_DEMO_RESET
  process.env.NODE_ENV = 'production'
  delete process.env.ENABLE_DEMO_RESET
  try {
    await assert.rejects(resetDatabase(), { message: /reset is disabled/ })
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnvironment
    if (originalResetFlag === undefined) delete process.env.ENABLE_DEMO_RESET
    else process.env.ENABLE_DEMO_RESET = originalResetFlag
  }
})
