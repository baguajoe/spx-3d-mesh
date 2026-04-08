import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/test/**/*.test.{js,jsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/mesh/**', 'src/components/**', 'src/hooks/**'],
    },
  },
});
