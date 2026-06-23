import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    env: {
      VITE_API_AUTH_KEY: 'test-key-for-testing',
      VITE_APP_ID: 'app_gpass_test'
    }
  }
})
