import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

mongoose.set('bufferCommands', false)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '../../data')
const DB_FILE = path.join(DATA_DIR, 'assistiq.db.json')

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim()
  const required = isMongoRequired()

  if (!uri) {
    if (required) {
      const error = new Error('MongoDB is required but MONGODB_URI is not configured')
      error.code = 'MONGODB_URI_MISSING'
      throw error
    }
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    console.warn('[Database] MONGODB_REQUIRED=false and MONGODB_URI is unset; using the explicitly enabled local persistent store.')
    return { mode: 'LOCAL_PERSISTENT_STORE', path: getDbFilePath() }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    })
    console.log(`[Database] MongoDB Live Connected: ${conn.connection.host}`)
    return { mode: 'MONGODB_LIVE', host: conn.connection.host }
  } catch (err) {
    if (required) {
      const error = new Error('MongoDB is required but the configured database is unavailable')
      error.code = err.code || err.name || 'MONGODB_UNAVAILABLE'
      error.codeName = err.codeName || ''
      throw error
    }
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    console.warn('[Database] MongoDB unavailable; using the explicitly reported local persistent store.', {
      reason: err.name,
      code: err.code || '',
    })
    return { mode: 'LOCAL_PERSISTENT_STORE', path: getDbFilePath() }
  }
}

export const isMongoConnected = () => mongoose.connection.readyState === 1
export const isMongoRequired = () => process.env.MONGODB_REQUIRED !== 'false'
export const shouldUseMongo = () => isMongoConnected() || isMongoRequired()
export const getDbFilePath = () => process.env.ASSISTIQ_DATA_FILE || DB_FILE
