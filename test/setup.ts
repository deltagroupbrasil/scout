import '@testing-library/jest-dom'
import { beforeEach, afterEach } from 'vitest'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Setup and teardown
beforeEach(() => {
  // Reset mocks before each test
})

afterEach(() => {
  // Cleanup after each test
})
