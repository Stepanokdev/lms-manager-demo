import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/wizard/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Straight into the directory FastAPI serves, the way admin/ already does.
    // Building to dist/ and copying by hand is how the served bundle drifted
    // months behind this source.
    outDir: '../app/static/wizard',
    emptyOutDir: true,
  },
})
