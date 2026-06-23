module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../../tests'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: { global: { branches: 50, functions: 50, lines: 50 } },
};
