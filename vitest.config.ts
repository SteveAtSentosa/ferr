import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    environment: 'node',
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*depracated*.ts',
        '**/*deprecated*.ts',
        '**/vizualize/**',
      ],
    },
  },
})
