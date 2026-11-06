import { defineConfig } from 'vite';

// relative paths, so the build runs from any folder it is published to (the site, a pull request's preview)
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 2000 } });
