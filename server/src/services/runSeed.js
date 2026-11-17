import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { resetDatabase } from './threadService.js'

dotenv.config()

const run = async () => {
  console.log('[Seed] Initializing database seed...')
  await connectDB()
  const data = await resetDatabase()
  console.log(`[Seed] Successfully seeded ${data.length} executive threads.`)
  process.exit(0)
}

run().catch((err) => {
  console.error('[Seed Error]:', err)
  process.exit(1)
})
