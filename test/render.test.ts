import {
  DIFF_STYLE_TEXT,
  createDiffStyleText,
  createHtmlDiffHtml,
  diffHtml,
  parseHtmlToVNode,
  renderHtmlDiff,
} from '../src';

describe('html-diff', () => {
  it('parses sibling html nodes into a root vnode', () => {
    const vnode = parseHtmlToVNode('<p>A</p><p>B</p>');

    expect(vnode.type).toBe('root');
    expect(vnode.children).toHaveLength(2);
  });

  it('renders text changes with added and removed markers', () => {
    const html = createHtmlDiffHtml('<p>Hello world</p>', '<p>Hello there</p>');

    expect(html).toContain('data-shd-state="added"');
    expect(html).toContain('data-shd-state="removed"');
  });

  it('highlights inline insertions without replacing the whole text node', () => {
    const html = createHtmlDiffHtml('<p>Hello world</p>', '<p>Hello brave world</p>');
    const host = document.createElement('div');
    host.innerHTML = html;

    expect(host.querySelector('[data-shd-state="removed"]')).toBeNull();
    expect(host.querySelector('[data-shd-marker="text"][data-shd-state="added"]')?.textContent).toBe('brave ');
    expect(host.querySelector('p')?.textContent).toBe('Hello brave world');
  });

  it('aligns inserted sibling text blocks without cascading inline replacements', () => {
    const html = createHtmlDiffHtml(
      '<ul><li>Redis cluster</li><li>MySQL primary-replica</li><li>Nginx gateway</li></ul>',
      '<ul><li>Redis cluster</li><li>ElasticSearch search tier</li><li>MySQL primary-replica on 8.0</li><li>Nginx gateway</li></ul>',
    );
    const host = document.createElement('div');
    host.innerHTML = html;
    const items = Array.from(host.querySelectorAll('li'));

    expect(items).toHaveLength(4);
    expect(items[1].textContent).toBe('ElasticSearch search tier');
    expect(items[1].getAttribute('data-shd-state')).toBe('added');
    expect(items[2].textContent).toBe('MySQL primary-replica on 8.0');
    expect(items[2].querySelector('[data-shd-state="removed"]')).toBeNull();
    expect(items[2].querySelector('[data-shd-marker="text"][data-shd-state="added"]')?.textContent).toBe(' on 8.0');
    expect(items[3].textContent).toBe('Nginx gateway');
    expect(items[3].getAttribute('data-shd-state')).toBeNull();
  });

  it('keeps long mixed Chinese and ASCII text diffs localized', () => {
    const oldText = [
      '要开始使用 REPL，打开你的浏览器并导航至 https://svelte.dev/repl。',
      '屏幕左边你将可以看到你组件的代码，屏幕右边你可以看到你应用程序的执行输出。',
      '程序代码上方的栏让你可以创建 .svelte 和 .js 文件，也能重新排列它们。',
      '要在文件夹中创建文件，你只要输入完整的路径名称——components/MyComponent.svelte。',
      '文件夹将被自动创建。 更上方的栏是 REPL 的标题。 点击可以编辑它。',
      '右边有三个标签： Result 标签内会显示你应用程序的输出，底下也有提供控制台。',
      'JS output 标签内可以让你检查 Svelte 产生的 JavaScript 代码且可以设定编译选项。',
      'CSS output 标签内会显示 Svelte 产生的 CSS。',
      '这些标签的上方，你将会找到一个工具栏，让你可以进入全屏幕模式和下载你的应用程序。',
      '假如你有登入 GitHub 账号，你将能够复制（fork）和保存应用程序。',
      '通过点击你 GitHub 的用户名个人资料并选择你已保存的应用程序（Your saved apps），将能够看到你已保存的所有 REPL。',
    ].join(' ');
    const newText = oldText
      .replace('Svelte 产生的 CSS。', 'Svelte 产生的 CSSD。')
      .replace('这些标签的上方，你将会找到', '这些标签的上方，你223将会找到')
      .replace('让你可以进入全屏幕模式', '让赛你可以进入全屏幕模式');
    const html = createHtmlDiffHtml(`<p>${oldText}</p>`, `<p>${newText}</p>`);
    const host = document.createElement('div');
    host.innerHTML = html;
    const removedMarkers = Array.from(
      host.querySelectorAll<HTMLElement>('[data-shd-marker="text"][data-shd-state="removed"]'),
    ).map((marker) => marker.textContent);
    const addedMarkers = Array.from(
      host.querySelectorAll<HTMLElement>('[data-shd-marker="text"][data-shd-state="added"]'),
    ).map((marker) => marker.textContent);
    const markerTexts = [...removedMarkers, ...addedMarkers].filter(Boolean);

    expect(removedMarkers).toContain('CSS');
    expect(addedMarkers).toContain('CSSD');
    expect(addedMarkers).toContain('223');
    expect(addedMarkers).toContain('赛');
    expect(markerTexts.some((text) => text?.includes('这些标签的上方'))).toBe(false);
    expect(markerTexts.some((text) => text?.includes('将会找到一个工具栏'))).toBe(false);
  });

  it('keeps source del and ins tags distinct from generated diff markers', () => {
    const html = createHtmlDiffHtml('<p><del>legacy</del> summary</p>', '<p><del>legacy</del> summary updated</p>');
    const host = document.createElement('div');
    host.innerHTML = html;

    expect(host.querySelector('del')?.textContent).toBe('legacy');
    expect(host.querySelector('ins[data-shd-state], del[data-shd-state]')).toBeNull();
    expect(host.querySelector('[data-shd-marker="text"][data-shd-state="added"]')?.textContent).toBe(' updated');
  });

  it('preserves strike-through styles for inline additions', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    renderHtmlDiff({
      container: host,
      mode: 'scoped',
      oldHtml: '<p><span style="color: rgb(255, 0, 0); text-decoration: line-through;">alpha</span></p>',
      newHtml: '<p><span style="color: rgb(255, 0, 0); text-decoration: line-through;">alpha beta</span></p>',
    });

    const marker = host.querySelector<HTMLElement>('[data-shd-marker="text"][data-shd-state="added"]');
    const styledSpan = host.querySelector<HTMLElement>('span[style]');

    expect(marker).toBeTruthy();
    expect(styledSpan?.style.textDecoration).toContain('line-through');
    expect(DIFF_STYLE_TEXT).not.toContain('text-decoration: none');
  });

  it('uses the default diff colors', () => {
    expect(DIFF_STYLE_TEXT).toContain('--shd-add-bg: #e6ffed;');
    expect(DIFF_STYLE_TEXT).toContain('--shd-add-text: #1a7f37;');
    expect(DIFF_STYLE_TEXT).toContain('--shd-remove-bg: #ffeef0;');
    expect(DIFF_STYLE_TEXT).toContain('--shd-remove-text: #cf222e;');
  });

  it('can generate custom diff colors', () => {
    const styleText = createDiffStyleText({
      added: {
        backgroundColor: '#def7ff',
        color: '#0550ae',
      },
      removed: {
        backgroundColor: '#fff1f3',
        color: '#bc1d2e',
      },
    });

    expect(styleText).toContain('--shd-add-bg: #def7ff;');
    expect(styleText).toContain('--shd-add-text: #0550ae;');
    expect(styleText).toContain('--shd-remove-bg: #fff1f3;');
    expect(styleText).toContain('--shd-remove-text: #bc1d2e;');
    expect(styleText).toContain('--shd-modified-border: rgba(217, 119, 6, 0.34);');
  });

  it('injects custom diff colors when rendering', () => {
    const host = document.createElement('div');

    renderHtmlDiff({
      container: host,
      mode: 'scoped',
      oldHtml: '<p>alpha</p>',
      newHtml: '<p>alpha beta</p>',
      theme: {
        added: {
          backgroundColor: '#dff7ff',
          color: '#0969da',
        },
      },
    });

    const styleText = host.querySelector('[data-html-diff-style]')?.textContent ?? '';

    expect(styleText).toContain('--shd-add-bg: #dff7ff;');
    expect(styleText).toContain('--shd-add-text: #0969da;');
    expect(styleText).toContain('--shd-remove-bg: #ffeef0;');
  });

  it('does not override host typography defaults', () => {
    const host = document.createElement('div');
    host.style.color = 'rgb(12, 34, 56)';
    host.style.fontFamily = 'Georgia';
    document.body.appendChild(host);

    renderHtmlDiff({
      container: host,
      mode: 'scoped',
      oldHtml: '<p>alpha</p>',
      newHtml: '<p>alpha beta</p>',
    });

    const content = host.querySelector<HTMLElement>('.shd-content');

    expect(content).toBeTruthy();
    expect(host.style.color).toBe('rgb(12, 34, 56)');
    expect(DIFF_STYLE_TEXT).toContain('color: inherit;');
    expect(DIFF_STYLE_TEXT).toContain('font: inherit;');
    expect(DIFF_STYLE_TEXT).not.toContain('IBM Plex Sans');
    expect(DIFF_STYLE_TEXT).not.toContain('--shd-text');
  });

  it('renders inline removals with the configured removed style', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    renderHtmlDiff({
      container: host,
      mode: 'scoped',
      oldHtml: '<p><span style="color: rgb(0, 102, 204);">alpha beta</span></p>',
      newHtml: '<p><span style="color: rgb(0, 102, 204);">alpha</span></p>',
    });

    const marker = host.querySelector<HTMLElement>('[data-shd-marker="text"][data-shd-state="removed"]');

    expect(marker).toBeTruthy();
    expect(DIFF_STYLE_TEXT).toContain('color: var(--shd-remove-text);');
  });

  it('renders image replacements with the dedicated wrapper', () => {
    const html = createHtmlDiffHtml(
      '<img src="https://example.com/a.png" alt="before" />',
      '<img src="https://example.com/b.png" alt="after" />',
    );

    expect(html).toContain('shd-image-wrapper');
    expect(html).toContain('Image replaced');
  });

  it('preserves image width and height attributes in replacement views', () => {
    const html = createHtmlDiffHtml(
      '<img src="https://example.com/a.png" alt="before" width="640" height="360" style="width: 320px; height: 180px;" />',
      '<img src="https://example.com/b.png" alt="after" width="480" height="270" />',
    );
    const host = document.createElement('div');
    host.innerHTML = html;
    const oldImage = host.querySelector<HTMLImageElement>('.shd-image-old');
    const stageImages = host.querySelectorAll<HTMLImageElement>('.shd-image-stage > img');
    const newImage = stageImages[1];

    expect(oldImage?.getAttribute('width')).toBe('640');
    expect(oldImage?.getAttribute('height')).toBe('360');
    expect(oldImage?.getAttribute('style')).toContain('width: 320px');
    expect(newImage?.getAttribute('width')).toBe('480');
    expect(newImage?.getAttribute('height')).toBe('270');
    expect(host.querySelectorAll('.shd-image-stage')).toHaveLength(2);
    expect(DIFF_STYLE_TEXT).not.toContain('max-width: 180px');
    expect(DIFF_STYLE_TEXT).toContain('max-inline-size: 100%');
  });

  it('renders a visible wrapper for added images', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    renderHtmlDiff({
      container: host,
      mode: 'scoped',
      oldHtml: '<p>before</p>',
      newHtml: '<p>before</p><img src="https://example.com/a.png" width="320" height="180" />',
    });

    const wrapper = host.querySelector<HTMLElement>('.shd-image-wrapper[data-diff-kind="added"]');
    const image = host.querySelector<HTMLImageElement>('.shd-image-wrapper[data-diff-kind="added"] > img');

    expect(wrapper).toBeTruthy();
    expect(image?.getAttribute('width')).toBe('320');
    expect(DIFF_STYLE_TEXT).toContain('padding: 34px 10px 10px;');
    expect(DIFF_STYLE_TEXT).toContain('.shd-image-wrapper[data-diff-kind="added"] {');
    expect(DIFF_STYLE_TEXT).toContain('border-color: var(--shd-add-border);');
  });

  it('avoids extra image outlines inside image diff wrappers', () => {
    expect(DIFF_STYLE_TEXT).not.toContain('.shd-image-added');
    expect(DIFF_STYLE_TEXT).not.toContain('.shd-image-removed');
    expect(DIFF_STYLE_TEXT).not.toContain('.shd-image-new');
    expect(DIFF_STYLE_TEXT).toContain('.shd-image-wrapper[data-diff-kind="removed"] .shd-image-stage > img');
    expect(DIFF_STYLE_TEXT).toContain('.shd-image-wrapper > img,');
  });

  it('does not add a second image diff wrapper inside added image containers', () => {
    const html = createHtmlDiffHtml(
      '<div></div>',
      '<div><span class="diff-img-wrapper diff-img-wrap-added"><img src="https://example.com/a.png" width="320" height="180" /></span></div>',
    );
    const host = document.createElement('div');
    host.innerHTML = html;

    expect(host.querySelectorAll('.shd-image-wrapper')).toHaveLength(0);
    expect(
      host.querySelector('.diff-img-wrapper[data-shd-state="added"][data-shd-media-state="added"] img'),
    ).toBeTruthy();
  });

  it('keeps a visible added-image marker when the image lives inside an added container', () => {
    const html = createHtmlDiffHtml(
      '<div></div>',
      '<div><span class="diff-img-wrapper diff-img-wrap-added"><img src="https://example.com/a.png" width="320" height="180" /></span></div>',
    );
    const host = document.createElement('div');
    host.innerHTML = html;

    expect(host.querySelectorAll('.shd-image-wrapper')).toHaveLength(0);
    expect(host.querySelector('.diff-img-wrapper[data-shd-media-state="added"] > img')).toBeTruthy();
    expect(host.querySelector('.diff-img-wrapper')?.getAttribute('data-shd-media-label')).toBe('Image added');
    expect(DIFF_STYLE_TEXT).toContain('[data-shd-media-state]::before');
    expect(DIFF_STYLE_TEXT).toContain('[data-shd-media-state="added"]');
    expect(DIFF_STYLE_TEXT).not.toContain('[data-shd-state="added"] img');
  });

  it('adds horizontal scrolling support for preformatted blocks', () => {
    const html = createHtmlDiffHtml(
      '<pre>const value = "alpha";</pre>',
      '<pre>const value = "alpha beta gamma delta epsilon zeta eta theta";</pre>',
    );
    const host = document.createElement('div');
    host.innerHTML = html;

    expect(host.querySelector('pre')?.textContent).toContain('alpha beta gamma');
    expect(DIFF_STYLE_TEXT).toContain('.shd-root pre {');
    expect(DIFF_STYLE_TEXT).toContain('overflow-x: auto;');
    expect(DIFF_STYLE_TEXT).not.toContain('white-space: pre-wrap');
  });

  it('returns stats for add, remove, and modify operations', () => {
    const result = diffHtml('<p>One</p>', '<p>Two</p><p>Three</p>');

    expect(result.stats.modified).toBeGreaterThan(0);
    expect(result.stats.added).toBeGreaterThan(0);
  });

  it('mounts into a shadow root by default', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const result = renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
    });

    expect(result.shadowRoot).toBeTruthy();
    expect(result.shadowRoot?.querySelector('[data-html-diff-style]')).toBeTruthy();
    expect(host.querySelector('[data-html-diff-mount="shadow-host"]')).toBeTruthy();
    expect(result.html).toContain('shd-content');
  });

  it('can switch from shadow mode to scoped mode on the same container', () => {
    const host = document.createElement('div');

    const shadowResult = renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'shadow',
    });

    expect(shadowResult.shadowRoot).toBeTruthy();
    expect(host.querySelector('[data-html-diff-mount="shadow-host"]')).toBeTruthy();

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'scoped',
    });

    expect(host.querySelector('[data-html-diff-style]')).toBeTruthy();
    expect(host.querySelector('.shd-content')).toBeTruthy();
    expect(host.querySelector('[data-html-diff-mount="shadow-host"]')).toBeFalsy();
  });

  it('can switch from shadow mode to none mode on the same container', () => {
    const host = document.createElement('div');

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'shadow',
    });

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'none',
    });

    expect(host.querySelector('.shd-content')).toBeTruthy();
    expect(host.querySelector('[data-html-diff-style]')).toBeFalsy();
  });

  it('falls back to scoped mode when shadow dom is unavailable', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'attachShadow', {
      value: undefined,
      configurable: true,
    });

    renderHtmlDiff({
      container: host,
      oldHtml: '<p>old</p>',
      newHtml: '<p>new</p>',
      mode: 'shadow',
    });

    expect(host.querySelector('[data-html-diff-style]')).toBeTruthy();
    expect(host.querySelector('.shd-content')).toBeTruthy();
  });
});
