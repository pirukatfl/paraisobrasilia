import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Local runs use the isolated test database; remote staging runs set E2E_BASE_URL.
loadEnv({ path: path.resolve(dirname, '.env.test') })

const remoteBaseURL = process.env.E2E_BASE_URL
const baseURL = remoteBaseURL ?? 'http://localhost:3000'

// Optional preinstalled Chromium (for environments where `playwright install` is not possible).
const executablePath = process.env.PW_CHROMIUM_PATH || undefined

const testEnv: Record<string, string> = {
  DATABASE_URI: process.env.DATABASE_URI ?? 'postgres://paraiso:paraiso_dev@127.0.0.1:5432/paraiso_test',
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? 'test-secret-at-least-32-characters-long',
  NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL ?? baseURL,
  SITE_ENV: process.env.SITE_ENV ?? 'staging',
  NEXT_PUBLIC_AGE_GATE_PROVIDER: process.env.NEXT_PUBLIC_AGE_GATE_PROVIDER ?? 'self-declaration',
  TZ: process.env.TZ ?? 'America/Sao_Paulo',
  // E-mail never leaves the test machine: messages are written here and read back by the specs
  EMAIL_CAPTURE_DIR: process.env.EMAIL_CAPTURE_DIR ?? path.resolve(dirname, 'test-results/emails'),
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: remoteBaseURL
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
        env: testEnv,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
