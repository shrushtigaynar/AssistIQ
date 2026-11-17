import test from 'node:test'
import assert from 'node:assert/strict'
import { getHealthStatus } from '../src/config/healthStatus.js'

test('health check fails when required MongoDB is unavailable', () => {
  assert.deepEqual(getHealthStatus(false, true), {
    httpStatus: 503,
    status: 'DEGRADED',
    database: 'MONGODB_REQUIRED_UNAVAILABLE',
  })
})

test('health check reports a live MongoDB connection', () => {
  assert.deepEqual(getHealthStatus(true, true), {
    httpStatus: 200,
    status: 'OK',
    database: 'MONGODB_LIVE',
  })
})

test('explicitly enabled local mode remains healthy without MongoDB', () => {
  assert.deepEqual(getHealthStatus(false, false), {
    httpStatus: 200,
    status: 'OK',
    database: 'LOCAL_PERSISTENT_STORE',
  })
})
