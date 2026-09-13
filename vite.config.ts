import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // README and the backend's default CORS_ORIGINS both assume 5173; fail loudly if it is taken.
  server: { port: 5173, strictPort: true },
  preview: { port: 5173 },
  build: { sourcemap: false },
})
