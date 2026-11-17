import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = (process.env.VITE_API_URL || env.VITE_API_URL || '').trim()

  if (mode === 'production') {
    if (!apiUrl) {
      throw new Error('VITE_API_URL must be set for production builds.')
    }

    let parsedApiUrl
    try {
      parsedApiUrl = new URL(apiUrl)
    } catch {
      throw new Error('VITE_API_URL must be an absolute HTTPS URL in production.')
    }

    if (
      parsedApiUrl.protocol !== 'https:'
      || parsedApiUrl.origin !== apiUrl
      || ['localhost', '127.0.0.1', '[::1]'].includes(parsedApiUrl.hostname)
    ) {
      throw new Error('VITE_API_URL must be an absolute HTTPS URL and cannot point to localhost in production.')
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true
    }
  }
})
