import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'yeiufd',
  e2e: {
    // The pages server (wiremd CLI --serve over cypress/fixtures/pages) is the
    // default surface; the editor spec visits its own Vite server by absolute URL.
    baseUrl: 'http://localhost:3017',
    viewportWidth: 1440,
    viewportHeight: 900,
    video: true,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    trashAssetsBeforeRuns: true,
    supportFile: false,
    defaultCommandTimeout: 10000,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
