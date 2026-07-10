# @chandq/html-diff

[![Release](https://github.com/chandq/html-diff/actions/workflows/release.yml/badge.svg)](https://github.com/chandq/html-diff/actions/workflows/release.yml)
[![html-diff](https://img.shields.io/github/package-json/v/chandq/html-diff?style=flat-square)](https://www.npmjs.com/package/@chandq/html-diff)
[![license:MIT](https://img.shields.io/npm/l/vue.svg?sanitize=true)](https://github.com/chandq/html-diff/blob/main/LICENSE)

A standalone TypeScript HTML diff library for browser apps. It turns two HTML strings into a visual diff view, ships ESM/CJS/UMD builds, and defaults to `ShadowRoot` rendering to avoid style pollution.

## Features

- HTML string to visual diff fragment or mounted view
- Image-aware diff rendering for add, remove, and replace
- Style isolation with `shadow`, `scoped`, and `none` modes
- Vite-powered library build with ESM, CJS, and UMD outputs
- Local live demo and Vitest coverage

## Install

```bash
npm install @chandq/html-diff
```

## Quick Start

```ts
import { renderHtmlDiff } from '@chandq/html-diff';

const host = document.getElementById('diff-root');

renderHtmlDiff({
  container: host!,
  oldHtml: '<p>Hello <strong>world</strong></p>',
  newHtml: '<p>Hello brave <strong>world</strong></p>',
  mode: 'shadow'
});
```

## API

### `renderHtmlDiff(options)`

Mount a visual diff into a container.

```ts
renderHtmlDiff({
  container,
  oldHtml,
  newHtml,
  mode: 'shadow'
});
```

Options:

- `container`: target element
- `oldHtml`: previous HTML string
- `newHtml`: next HTML string
- `mode`: `'shadow' | 'scoped' | 'none'`, default `'shadow'`
- `ignoreWhitespace`: default `true`

### `createHtmlDiffFragment(oldHtml, newHtml, options?)`

Returns a `DocumentFragment`.

### `createHtmlDiffHtml(oldHtml, newHtml, options?)`

Returns serialized diff HTML.

### `diffHtml(oldHtml, newHtml, options?)`

Returns a fragment plus simple diff stats.

## Development

```bash
npm install
npm run dev
```

Library build:

```bash
npm run build
```

Demo build:

```bash
npm run build:demo
```

## Notes

- Default rendering mode is `shadow`, which is the safest choice when embedding into CMS pages or rich text editors.
- If your target environment cannot use `ShadowRoot`, use `mode: 'scoped'` to keep styles prefixed under the mounted root.
