// Browser tests drive the real page in Chromium, the tour's counterpart to Kistulentz's
// macOS UI regression job. They cover app.js, which the unit-test coverage leaves out.
const { defineConfig, devices } = require("@playwright/test");

const PORT = 4173;

module.exports = defineConfig({
  testDir: "tests/browser",
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 850 } } },
    { name: "phone", use: { ...devices["Pixel 7"], colorScheme: "dark" } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    stderr: "ignore",
  },
});
