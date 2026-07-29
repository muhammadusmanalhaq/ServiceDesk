import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  use: {
    video: 'on',
    trace: 'on',
    screenshot: 'only-on-failure',
    baseURL: 'http://localhost:3000',
  },
});
