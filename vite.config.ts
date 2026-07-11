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
    name: 'htmlDiff'
  },
  outDir: 'dist',
  rollupOptions: {
    output: [
      {
        format: 'es',
        dir: 'dist/es',
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs',
        preserveModules: true,
        preserveModulesRoot: 'src'
      },
      {
        format: 'cjs',
        dir: 'dist/cjs',
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
        exports: 'named',
        preserveModules: true,
        preserveModulesRoot: 'src'
      },
      {
        format: 'umd',
        dir: 'dist',
        entryFileNames: 'index.umd.js',
        name: 'htmlDiff',
        exports: 'named'
      }
    ]
  },
  sourcemap: false
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
