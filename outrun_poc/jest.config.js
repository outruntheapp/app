// outrun_poc/jest.config.js
// Purpose: Jest config for unit tests (no Next.js SWC). Use next/jest if adding component tests.
/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  testMatch: ["**/__tests__/**/*.test.js"],
};

module.exports = config;
