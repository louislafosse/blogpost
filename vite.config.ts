import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Local dev: '/'  |  GitHub Pages: '/repo-name/' (set via VITE_BASE_PATH in CI)
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 8081,
    cors: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor':      ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'markdown-vendor': ['react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-stringify'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})