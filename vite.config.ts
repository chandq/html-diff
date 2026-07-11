import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import pkg from './package.json';
import banner from 'vite-plugin-banner'

const bannerString =
  '/*!\n' +
  ` * ${pkg.name} v${pkg.version}\n` +
  ` * (c) 2026-present chandq\n` +
  ' * Released under the MIT License.\n' +
  ' */\n';

const libraryConfig = {
  emptyOutDir: true,
  lib: {
    entry: resolve(__dirname, 'src/index.ts'),
    name: 'htmlDiff'
  },
  outDir: 'dist',

  minify: false,
  rolldownOptions: {
    output: [
      {
        format: 'es',
        dir: 'dist/es',
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name].mjs',
        preserveModules: true,
        preserveModulesRoot: 'src',
        banner: bannerString
      },
      {
        format: 'cjs',
        dir: 'dist/cjs',
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name].cjs',
        exports: 'named',
        preserveModules: true,
        preserveModulesRoot: 'src',
        banner: bannerString
      },
      {
        format: 'umd',
        dir: 'dist',
        entryFileNames: 'index.umd.js',
        name: 'htmlDiff',
        exports: 'named',
        banner: bannerString
      }
    ]
  },
  sourcemap: false
};

const demoConfig = {
  emptyOutDir: true,
  outDir: 'docs',
  sourcemap: false
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
        reporter: ['lcov', 'text', 'html']
      }
    }
  };
});
