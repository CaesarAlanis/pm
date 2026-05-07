import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:8001",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "cd .. && docker rm -f pm-app-e2e >/dev/null 2>&1 || true && docker build -t pm-app . && docker run --rm --name pm-app-e2e -e PM_DB_PATH=/app/data/pm.db -p 8001:8000 pm-app",
    url: "http://127.0.0.1:8001",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
