import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Tests always run against the isolated test database (paraiso_test).
loadEnv({ path: path.resolve(dirname, '.env.test'), override: true })

export default defineConfig({
  resolve: {
    alias: {
      '@payload-config': path.resolve(dirname, 'src/payload.config.ts'),
      '@': path.resolve(dirname, 'src'),
      'server-only': path.resolve(dirname, 'tests/helpers/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/int/**/*.int.test.ts'],
    // Integration tests share one database: never run files in parallel.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
