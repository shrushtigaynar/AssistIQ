import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB, isMongoConnected, isMongoRequired } from './config/db.js'
import threadRoutes from './routes/threadRoutes.js'
import emailAccountRoutes from './routes/emailAccountRoutes.js'
import authRoutes from './routes/authRoutes.js'
import { requireAuth } from './services/authService.js'
import { errorHandler } from './middleware/errorHandler.js'
import { validateProductionConfig } from './config/productionConfig.js'
import { getHealthStatus } from './config/healthStatus.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const allowedOrigins = new Set(
  (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173')
  allowedOrigins.add('http://localhost:5174')
  allowedOrigins.add('http://127.0.0.1:5173')
  allowedOrigins.add('http://127.0.0.1:5174')
}
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '2mb' }))
morgan.token('safe-path', (req) => req.path)
app.use(morgan(':method :safe-path :status :response-time ms'))

app.get('/api/health', (req, res) => {
  const health = getHealthStatus(isMongoConnected(), isMongoRequired())
  res.status(health.httpStatus).json({
    status: health.status,
    timestamp: new Date().toISOString(),
    service: 'AssistIQ Backend REST API',
    database: health.database,
    gmailIntegration: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    aiProvider: process.env.GEMINI_API_KEY ? 'Gemini' : 'Rule-Based Fallback',
    version: '1.0.0',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/threads', requireAuth, threadRoutes)
app.use('/api/email-accounts', emailAccountRoutes)

app.use(errorHandler)

const startServer = async () => {
  validateProductionConfig()
  const dbStatus = await connectDB()
  app.listen(PORT, () => {
    console.log(`[AssistIQ Server] Running on http://localhost:${PORT}`)
    console.log(`[AssistIQ Server] Database Mode: ${dbStatus.mode}`)
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('[AssistIQ Server] Gmail OAuth is not configured; set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to enable email connections.')
    }
  })
}

startServer().catch((error) => {
  console.error('[AssistIQ Server] Startup failed; verify the required configuration.', {
    message: error.message || 'Unknown startup error',
    error: error.name || 'Error',
    code: error.code || '',
  })
  process.exitCode = 1
})

export default app
