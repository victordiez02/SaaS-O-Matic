import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El proxy /api solo aplica en `pnpm dev` (arranque manual sin Docker).
// En Docker, nginx hace el proxy hacia el servicio backend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
