import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // the API in ./api owns the data; see api/server.js
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 3001}` },
    watch: { ignored: ['**/api/data/**'] },
  },
})
