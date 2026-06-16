import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative paths so JS/CSS load from .../dist/assets/ on GitHub Pages / custom domain
  base: './',
})