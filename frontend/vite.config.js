import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/components/Layout.jsx',
        'src/components/ia/*.jsx',
        'src/pages/ia/IAPage.jsx',
        'src/services/api.js',
        'src/services/empresas.service.js',
        'src/services/ia.service.js',
        'src/services/usuarios.service.js',
        'src/store/useStore.js',
      ],
      exclude: [
        'src/main.jsx',
        'src/tests/**',
        '**/*.test.{js,jsx}',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router-dom')) {
            return 'router'
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/')
          ) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
})
