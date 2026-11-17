import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB, isMongoConnected, isMongoRequired } from './config/db.js'
import threadRoutes from './routes/threadRoutes.js'
import conversationRoutes from './routes/conversationRoutes.js'
import emailAccountRoutes from './routes/emailAccountRoutes.js'
import seedRoutes from './routes/seedRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import authRoutes from './routes/authRoutes.js'
import clientRoutes from './routes/clientRoutes.js'
import workspaceRoutes from './routes/workspaceRoutes.js'
import { requirePortalRole } from './services/portalAuthService.js'
import { errorHandler } from './middleware/errorHandler.js'
import { validateProductionConfig } from './config/productionConfig.js'
import { getHealthStatus } from './config/healthStatus.js'

// Load environment variables
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
  allowedOrigins.add('http://127.0.0.1:5173')
}

// Middleware
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '1mb' }))
morgan.token('safe-path', (req) => req.path)
app.use(morgan(':method :safe-path :status :response-time ms'))

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = getHealthStatus(isMongoConnected(), isMongoRequired())
  res.status(health.httpStatus).json({
    status: health.status,
    timestamp: new Date().toISOString(),
    service: 'AssistIQ Backend REST API',
    database: health.database,
    version: '0.1.0',
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/threads', requirePortalRole('ASSISTANT'), threadRoutes)
app.use('/api/conversations', requirePortalRole('ASSISTANT'), conversationRoutes)
app.use('/api/email-accounts', requirePortalRole('ASSISTANT'), emailAccountRoutes)
app.use('/api/seed', requirePortalRole('ASSISTANT'), seedRoutes)
app.use('/api/ai', requirePortalRole('ASSISTANT'), aiRoutes)
app.use('/api/client', requirePortalRole('CLIENT'), clientRoutes)
app.use('/api/workspace', requirePortalRole('ASSISTANT'), workspaceRoutes)

// Error Handler
app.use(errorHandler)

// Initialize and Listen
const startServer = async () => {
  validateProductionConfig()
  const dbStatus = await connectDB()
  app.listen(PORT, () => {
    console.log(`[AssistIQ Server] Running on http://localhost:${PORT}`)
    console.log(`[AssistIQ Server] Database Mode: ${dbStatus.mode}`)
  })
}

startServer().catch((error) => {
  console.error('[AssistIQ Server] Startup failed; verify the required MongoDB configuration.', {
    message: error.message || 'Unknown startup error',
    error: error.name || 'Error',
    code: error.code || '',
    codeName: error.codeName || '',
  })
  process.exitCode = 1
})

export default app
