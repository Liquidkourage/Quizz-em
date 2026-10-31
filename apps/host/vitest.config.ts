import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@qhe/core': path.resolve(__dirname, '../../packages/core/src'),
      '@qhe/net': path.resolve(__dirname, '../../packages/net/src'),
      '@qhe/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
