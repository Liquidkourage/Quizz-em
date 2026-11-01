import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    extensions: ['.tsx', '.ts', '.mts', '.mjs', '.jsx', '.js', '.json'],
    alias: {
      '@qhe/core': path.resolve(__dirname, '../../packages/core/src'),
      '@qhe/net': path.resolve(__dirname, '../../packages/net/src'),
    },
  },
  test: {
    environment: 'node',
  },
})
