import mongoose from 'mongoose'

mongoose.set('bufferCommands', false)

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    const error = new Error('MongoDB is required but MONGODB_URI is not configured')
    error.code = 'MONGODB_URI_MISSING'
    throw error
  }
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  console.log(`[Database] MongoDB connected: ${conn.connection.host}`)
  return { mode: 'MONGODB_LIVE', host: conn.connection.host }
}

export const isMongoConnected = () => mongoose.connection.readyState === 1
export const isMongoRequired = () => process.env.MONGODB_REQUIRED !== 'false'
