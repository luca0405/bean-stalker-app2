import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Development Vite config for sandbox IAP testing
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  define: {
    // Force development mode for sandbox testing
    'import.meta.env.DEV': 'true',
    'import.meta.env.PROD': 'false',
    'import.meta.env.MODE': '"development"',
    'import.meta.env.VITE_REVENUECAT_API_KEY': JSON.stringify(process.env.VITE_REVENUECAT_API_KEY || 'appl_owLmakOcTeYJOJoxJgScSQZtUQA'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})