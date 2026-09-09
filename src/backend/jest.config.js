/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/env.ts"],
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  testMatch: ["**/tests/**/*.test.ts"],
  testTimeout: 20000
};
