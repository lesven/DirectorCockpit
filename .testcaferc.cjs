module.exports = {
  src: 'tests/e2e/**/*.test.js',
  browsers: ['chromium:headless'],
  baseUrl: 'http://localhost:8089',
  selectorTimeout: 5000,
  assertionTimeout: 5000,
  pageLoadTimeout: 10000,
  speed: 0.8,
  screenshots: {
    path: 'tests/e2e/screenshots',
    takeOnFails: true,
    fullPage: true,
  },
  quarantineMode: false,
  stopOnFirstFail: false,
  concurrency: 1,
};
