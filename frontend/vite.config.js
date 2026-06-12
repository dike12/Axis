import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // <--- Add this block
    },
  },
  test: {
    globals: true,             // Allows using describe, it, expect without explicit imports
    environment: 'jsdom',      // Simulates a browser environment in Node.js
    setupFiles: './src/tests/vitest.setup.js', // Runs global configurations before tests execute
    include: ['src/**/*.{test,spec}.{js,jsx}'], // Path patterns to find test files
  },
})