import './demo.css';
import { renderHtmlDiff } from './index';
import type { RenderMode } from './types';

const oldHtml = `<article>
  <h1>Platform Migration Report</h1>
  <p>The current release includes the baseline service topology.</p>
  <p>This paragraph will be removed after the migration.</p>
  <img src="https://picsum.photos/220/140?random=12" alt="Old topology" />
  <ul>
    <li>Redis cluster</li>
    <li>MySQL primary-replica</li>
    <li>Nginx gateway</li>
  </ul>
</article>`;

const newHtml = `<article>
  <h1>Platform Migration Report 2.0</h1>
  <p>The current release includes the baseline service topology and AI workers.</p>
  <img src="https://picsum.photos/220/140?random=24" alt="New topology" />
  <ul>
    <li>Redis cluster</li>
    <li>ElasticSearch search tier</li>
    <li>MySQL primary-replica on 8.0</li>
    <li>Nginx gateway</li>
  </ul>
</article>`;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Demo root not found.');
}

app.innerHTML = `
  <main class="demo-shell">
    <section class="demo-hero">
      <h1>@chandq/html-diff</h1>
      <p>
        A style-safe HTML diff library for rich text previews, CMS review pages, and browser
        tooling. This demo uses the package source directly through Vite.
      </p>
    </section>

    <section class="demo-grid">
      <article class="demo-card">
        <header>
          <h2>Old HTML</h2>
          <span class="demo-chip">input A</span>
        </header>
        <div class="demo-pane">
          <textarea id="old-html" class="demo-textarea"></textarea>
        </div>
      </article>

      <article class="demo-card">
        <header>
          <h2>New HTML</h2>
          <span class="demo-chip">input B</span>
        </header>
        <div class="demo-pane">
          <textarea id="new-html" class="demo-textarea"></textarea>
        </div>
      </article>
    </section>

    <section class="demo-card" style="margin-top: 18px;">
      <header>
        <h2>Visual Diff</h2>
        <span class="demo-chip">preview</span>
      </header>
      <div class="demo-pane">
        <div class="demo-controls">
          <button id="render-btn" class="demo-button" type="button">Render diff</button>
          <select id="mode-select" class="demo-select" aria-label="Render mode">
            <option value="shadow">shadow</option>
            <option value="scoped">scoped</option>
            <option value="none">none</option>
          </select>
        </div>
        <div id="stats" class="demo-stats"></div>
        <div id="diff-output" class="demo-output"></div>
      </div>
    </section>
  </main>
`;

const oldField = document.querySelector<HTMLTextAreaElement>('#old-html');
const newField = document.querySelector<HTMLTextAreaElement>('#new-html');
const modeSelect = document.querySelector<HTMLSelectElement>('#mode-select');
const renderButton = document.querySelector<HTMLButtonElement>('#render-btn');
const stats = document.querySelector<HTMLDivElement>('#stats');
const diffOutput = document.querySelector<HTMLDivElement>('#diff-output');

if (!oldField || !newField || !modeSelect || !renderButton || !stats || !diffOutput) {
  throw new Error('Demo controls are incomplete.');
}

const oldInput = oldField;
const newInput = newField;
const modeInput = modeSelect;
const statsPanel = stats;
const outputHost = diffOutput;

oldInput.value = oldHtml;
newInput.value = newHtml;

function paint(): void {
  console.time('renderHtmlDiff');
  const result = renderHtmlDiff({
    container: outputHost,
    oldHtml: oldInput.value,
    newHtml: newInput.value,
    mode: modeInput.value as RenderMode
  });
  console.timeEnd('renderHtmlDiff');

  statsPanel.innerHTML = `
    <span>added: ${result.stats.added}</span>
    <span>removed: ${result.stats.removed}</span>
    <span>modified: ${result.stats.modified}</span>
  `;
}

renderButton.addEventListener('click', paint);
modeInput.addEventListener('change', paint);

paint();
