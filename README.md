# @chandq/html-diff

[![Release](https://github.com/chandq/html-diff/actions/workflows/release.yml/badge.svg)](https://github.com/chandq/html-diff/actions/workflows/release.yml)
[![html-diff](https://img.shields.io/github/package-json/v/chandq/html-diff?style=flat-square)](https://www.npmjs.com/package/@chandq/html-diff)
[![license:MIT](https://img.shields.io/npm/l/vue.svg?sanitize=true)](https://github.com/chandq/html-diff/blob/main/LICENSE)
[![codecov](https://codecov.io/gh/chandq/html-diff/graph/badge.svg?token=VZ6TERPGI9)](https://codecov.io/gh/chandq/html-diff)

Framework-agnostic HTML visual diff renderer for rich text, inline markup, images, and editor previews.

It accepts two HTML strings and returns a mounted diff view, a `DocumentFragment`, or serialized diff HTML. It works with Vue, React, Svelte, Angular, or plain DOM because the input is just HTML strings.

## Highlights

- Accurate inline text diff for mixed Chinese, English, numbers, punctuation, and rich text markup
- HTML-aware node matching to reduce cascading false positives in lists and repeated blocks
- Built-in image add, remove, and replace rendering
- `shadow`, `scoped`, and `none` render modes for different embedding needs
- Split ESM and CJS outputs for direct subpath imports and better tree-shaking

## Install

```bash
npm install @chandq/html-diff
```

## Usage

```ts
import { renderHtmlDiff } from '@chandq/html-diff';

renderHtmlDiff({
  container: document.getElementById('diff-root')!,
  oldHtml: '<p>Hello <strong>world</strong></p>',
  newHtml: '<p>Hello brave <strong>world</strong></p>',
  mode: 'shadow'
});
```

## On-Demand Imports

```ts
import { renderHtmlDiff } from '@chandq/html-diff/render';
import { parseHtmlToVNode } from '@chandq/html-diff/parse';
import { diffChildren } from '@chandq/html-diff/diff';
```

## API

### `renderHtmlDiff(options)`

Mounts the diff into a container and returns the rendered root, fragment, stats, and `destroy()`.

| Option             | Type                             | Default                                      |
| ------------------ | -------------------------------- | -------------------------------------------- |
| `container`        | `HTMLElement`                    | required                                     |
| `oldHtml`          | `string`                         | required                                     |
| `newHtml`          | `string`                         | required                                     |
| `mode`             | `'shadow' \| 'scoped' \| 'none'` | `'shadow'`                                   |
| `ignoreWhitespace` | `boolean`                        | `true`                                       |
| `theme`            | `DiffTheme`                      | GitHub-style add/remove colors, page padding |

### Other Exports

| Function                                             | Returns               |
| ---------------------------------------------------- | --------------------- |
| `diffHtml(oldHtml, newHtml, options?)`               | `{ fragment, stats }` |
| `createHtmlDiffFragment(oldHtml, newHtml, options?)` | `DocumentFragment`    |
| `createHtmlDiffHtml(oldHtml, newHtml, options?)`     | serialized diff HTML  |
| `parseHtmlToVNode(html, options?)`                   | internal VNode tree   |

## Node Matching

When a stable identity is available, the diff prefers `data-key`, `id`, or `key` to align matching nodes. `name` is intentionally not used as a node identity because it is often semantic or form-related rather than a reliable structural key.

## Development

```bash
npm install
npm run dev
npm run test:unit
npm run typecheck
npm run build
```
