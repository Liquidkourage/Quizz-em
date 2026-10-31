// Report-only complexity gate (ub-mode "Crapper" proxy). Run: npm run gate:complexity
// Ratchet to "error" once the existing warnings are cleared (see docs/ub-mode.md).
import tseslint from 'typescript-eslint'

export default tseslint.config([
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/*.test.{ts,tsx}'] },
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    rules: {
      complexity: ['warn', { max: 10 }],
    },
  },
])
