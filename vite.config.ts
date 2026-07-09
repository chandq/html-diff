import { resolve } from 'node:path';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import pkg from './package.json';
import banner from 'vite-plugin-banner'

const bannerString =
  '/*!\n' +
  ` * ${pkg.name} v${pkg.version}\n` +
  ` * (c) 2025-present chandq\n` +
  ' * Released under the MIT License.\n' +
  ' */\n';

const libraryConfig: UserConfig['build'] = {
  emptyOutDir: true,
  lib: {
    entry: resolve(__dirname, 'src/index.ts'),
    name: 'htmlDiff',
    formats: ['es', 'cjs', 'umd'],
    fileName: format => {
      if (format === 'es') {
        return 'index.mjs';
      }

      if (format === 'cjs') {
        return 'index.cjs';
      }

      return 'index.umd.js';
    }
  },
  outDir: 'dist',
  sourcemap: true
};

const demoConfig: UserConfig['build'] = {
  emptyOutDir: true,
  outDir: 'docs',
  sourcemap: true
};

// @ts-ignore
export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo';

  return {
    build: isDemo ? demoConfig : libraryConfig,
    plugins: [banner({
      outDir: resolve(__dirname, './dist'),
      content: bannerString,
    })],
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: {
        reporter: ['text', 'html']
      }
    }
  };
});
