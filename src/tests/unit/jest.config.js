module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: [
    '<rootDir>/**/*.test.(ts|js)'
  ],
  collectCoverageFrom: [
    '<rootDir>/../../services/**/*.{ts,js}',
    '!<rootDir>/../../services/**/*.d.ts'
  ]
};