import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    include: [
      'tests/memoryEngine.spec.js',
      'tests/evidenceMemoryEngine.spec.js',
      'tests/aiService.spec.js',
      'tests/progress.spec.js',
      'tests/verification.spec.js',
      'tests/semanticMemory.spec.js',
      'tests/threeTierResponse.spec.js',
      'tests/validationSuite.spec.js',
      'tests/specialtyEngines.spec.js',
      'tests/semanticRouting.spec.js',
      'tests/multiIntent.spec.js',
      'tests/followUp.spec.js',
      'tests/topicEngine.spec.js',
      'tests/careerBusiness.spec.js'
    ],
  },
})
