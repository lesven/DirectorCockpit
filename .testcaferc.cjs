module.exports = {
  src: 'tests/e2e/**/*.test.js',
  browsers: ['chromium:headless'],
  baseUrl: 'http://localhost:8089',
  selectorTimeout: 8000,
  assertionTimeout: 8000,
  pageLoadTimeout: 15000,
  pageRequestTimeout: 15000,
  speed: 0.8,
  screenshots: {
    path: 'tests/e2e/screenshots',
    takeOnFails: true,
    fullPage: true,
  },
  quarantineMode: { successThreshold: 1, attemptLimit: 3 },
  stopOnFirstFail: false,
  concurrency: 1,
};
