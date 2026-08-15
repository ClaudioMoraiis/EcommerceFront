import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')

  return {
    plugins: [react()],
    server: {
      proxy: apiBaseUrl
        ? {
            '/backend': {
              target: apiBaseUrl,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/backend/, ''),
            },
          }
        : undefined,
    },
  }
})
