import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Read host/port from environment variables (Vite picks up .env files automatically)
const HOST = process.env.VITE_FRONTEND_HOST || 'localhost'
const PORT = Number(process.env.VITE_FRONTEND_PORT || 5173)

export default defineConfig({
  plugins: [react()],
  server: {
    host: HOST,
    port: PORT,
  }
})
