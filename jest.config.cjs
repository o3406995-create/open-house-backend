/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: { parser: { syntax: "typescript" }, target: "es2022" },
        module: { type: "commonjs" },
      },
    ],
  },
  // Sources import "./x.js" while the file on disk is x.ts
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  resetMocks: true,
}
