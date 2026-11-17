import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { connectDB, isMongoConnected, isMongoRequired, shouldUseMongo } from '../src/config/db.js'

const originalUri = process.env.MONGODB_URI
const originalRequired = process.env.MONGODB_REQUIRED

test('required MongoDB configuration never selects the local-store path', async () => {
  delete process.env.MONGODB_URI
  process.env.MONGODB_REQUIRED = 'true'
  assert.equal(isMongoRequired(), true)
  assert.equal(shouldUseMongo(), true)
  if (!isMongoConnected()) {
    await assert.rejects(connectDB(), /MONGODB_URI is not configured/)
  }
})

test('MongoDB startup allows a cold Atlas connection window', async () => {
  const originalConnect = mongoose.connect
  const originalUri = process.env.MONGODB_URI
  const originalRequired = process.env.MONGODB_REQUIRED
  let observedOptions
  process.env.MONGODB_URI = 'mongodb://127.0.0.1/assistiq-test'
  process.env.MONGODB_REQUIRED = 'true'
  mongoose.connect = async (_uri, options) => {
    observedOptions = options
    return { connection: { host: 'mock-atlas-host' } }
  }
  try {
    const result = await connectDB()
    assert.equal(result.mode, 'MONGODB_LIVE')
    assert.equal(observedOptions.serverSelectionTimeoutMS, 10000)
  } finally {
    mongoose.connect = originalConnect
    if (originalUri === undefined) delete process.env.MONGODB_URI
    else process.env.MONGODB_URI = originalUri
    if (originalRequired === undefined) delete process.env.MONGODB_REQUIRED
    else process.env.MONGODB_REQUIRED = originalRequired
  }
})

test.after(() => {
  if (originalUri === undefined) delete process.env.MONGODB_URI
  else process.env.MONGODB_URI = originalUri
  if (originalRequired === undefined) delete process.env.MONGODB_REQUIRED
  else process.env.MONGODB_REQUIRED = originalRequired
})
