(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function r(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(a){if(a.ep)return;a.ep=!0;const s=r(a);fetch(a.href,s)}})();const c="shd-root",j="data-html-diff-style",Q=`
:host,
.${c} {
  --shd-add-bg: #ecfdf3;
  --shd-add-text: #047857;
  --shd-remove-bg: #fff1f2;
  --shd-remove-text: #be123c;
  --shd-modified-border: #f59e0b;
  --shd-panel-bg: #ffffff;
  --shd-surface: #f8fafc;
  --shd-border: rgba(15, 23, 42, 0.12);
  --shd-text: #0f172a;
  color: var(--shd-text);
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  line-height: 1.6;
}

.${c} {
  display: block;
  background: var(--shd-panel-bg);
  color: var(--shd-text);
}

.${c} .shd-content {
  display: block;
  border: 1px solid var(--shd-border);
  border-radius: 18px;
  padding: 20px;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 30%),
    linear-gradient(180deg, #ffffff, var(--shd-surface));
  overflow-wrap: anywhere;
}

.${c} [data-shd-state="added"] {
  background: var(--shd-add-bg);
  color: var(--shd-add-text);
  border-radius: 0.25em;
  text-decoration: none;
}

.${c} [data-shd-state="removed"] {
  background: var(--shd-remove-bg);
  color: var(--shd-remove-text);
  border-radius: 0.25em;
  text-decoration: line-through;
}

.${c} .shd-text-diff {
  display: inline-flex;
  gap: 0.3em;
  flex-wrap: wrap;
}

.${c} .shd-image-wrapper {
  position: relative;
  display: inline-flex;
  gap: 10px;
  margin: 10px 6px;
  padding: 8px;
  vertical-align: top;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
}

.${c} .shd-image-wrapper::after {
  position: absolute;
  top: -12px;
  left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
  content: attr(data-diff-label);
}

.${c} .shd-image-wrapper[data-diff-kind="added"]::after {
  background: #059669;
}

.${c} .shd-image-wrapper[data-diff-kind="removed"]::after {
  background: #e11d48;
}

.${c} .shd-image-wrapper[data-diff-kind="modified"]::after {
  background: #d97706;
}

.${c} .shd-image-added {
  outline: 3px solid #10b981;
}

.${c} .shd-image-removed {
  outline: 3px solid #e11d48;
  filter: grayscale(1);
  opacity: 0.38;
}

.${c} .shd-image-old {
  max-width: 180px;
  filter: grayscale(1);
  opacity: 0.45;
}

.${c} .shd-image-new {
  max-width: 180px;
  outline: 2px solid #10b981;
}
`;function U(){return{added:0,removed:0,modified:0}}function m(e){return e.type==="text"?e.text.trim()?1:0:e.type==="root"?e.children.reduce((t,r)=>t+m(r),0):1+e.children.reduce((t,r)=>t+m(r),0)}function R(e,t){const r=Object.keys(e),n=Object.keys(t);return r.length!==n.length?!1:r.every(a=>e[a]===t[a])}function I(e){return e.attrs["data-key"]||e.attrs.id||e.attrs.key||e.attrs.name}function W(e){return{added:e.added,removed:e.removed,modified:e.modified}}function f(e,t){if(e.type!==t.type)return!1;if(e.type==="text"&&t.type==="text"||e.type==="root"&&t.type==="root")return!0;if(e.type!=="element"||t.type!=="element"||e.tagName!==t.tagName)return!1;const r=I(e),n=I(t);return r||n?r===n:(e.tagName==="img",!0)}function $(e,t){let r=0,n=e.length-1,a=t.length-1;const s=[],i=[];for(;r<=n&&r<=a&&f(e[r],t[r]);)s.push({status:"merged",oldNode:e[r],newNode:t[r]}),r+=1;for(;n>=r&&a>=r&&f(e[n],t[a]);)i.unshift({status:"merged",oldNode:e[n],newNode:t[a]}),n-=1,a-=1;const l=[];let o=r,d=r;for(;o<=n||d<=a;){if(o>n){l.push({status:"added",node:t[d]}),d+=1;continue}if(d>a){l.push({status:"removed",node:e[o]}),o+=1;continue}if(f(e[o],t[d])){l.push({status:"merged",oldNode:e[o],newNode:t[d]}),o+=1,d+=1;continue}if(d+1<=a&&f(e[o],t[d+1])){l.push({status:"added",node:t[d]}),d+=1;continue}if(o+1<=n&&f(e[o+1],t[d])){l.push({status:"removed",node:e[o]}),o+=1;continue}l.push({status:"removed",node:e[o]}),l.push({status:"added",node:t[d]}),o+=1,d+=1}return[...s,...l,...i]}function L(e,t={}){const n=new DOMParser().parseFromString(e,"text/html");return{type:"root",children:Array.from(n.body.childNodes).map(s=>O(s,t)).filter(s=>s!==null)}}function O(e,t){if(e.nodeType===Node.TEXT_NODE){const i=e.nodeValue??"";return t.ignoreWhitespace!==!1&&!i.trim()?null:{type:"text",text:i}}if(e.nodeType!==Node.ELEMENT_NODE)return null;const r=e,n={};Array.from(r.attributes).forEach(i=>{n[i.name]=i.value});const a=Array.from(r.childNodes).map(i=>O(i,t)).filter(i=>i!==null);return{type:"element",tagName:r.tagName.toLowerCase(),attrs:n,children:a}}function X(e){const t=e.mode??"shadow",r=L(e.oldHtml,e),n=L(e.newHtml,e),a=U(),s=e.container.ownerDocument??document,i=b(r,n,s,a),l=Y(e.container,t),o=s.createElement("div");o.className=c,o.dataset.htmlDiff="root";const d=s.createElement("div");d.className="shd-content",d.appendChild(i),o.appendChild(d);const B=o.innerHTML,S=z(e.container,o,l),D=s.createDocumentFragment();return D.appendChild(o.cloneNode(!0)),{fragment:D,stats:W(a),root:o,shadowRoot:S.shadowRoot,html:B,destroy:S.destroy}}function Y(e,t){return t!=="shadow"?t:typeof e.attachShadow=="function"?"shadow":"scoped"}function z(e,t,r){if(e.replaceChildren(),r==="shadow"&&typeof e.attachShadow=="function"){const n=(e.ownerDocument??document).createElement("div");n.dataset.htmlDiffMount="shadow-host",e.appendChild(n);const a=n.attachShadow({mode:"open"});return a.appendChild(M(e.ownerDocument??document)),a.appendChild(t),{shadowRoot:a,destroy:()=>{e.replaceChildren()}}}return r==="scoped"&&e.appendChild(M(e.ownerDocument??document)),e.appendChild(t),{destroy:()=>{e.replaceChildren()}}}function M(e){const t=e.createElement("style");return t.setAttribute(j,""),t.textContent=Q,t}function b(e,t,r,n){return!e&&!t?r.createDocumentFragment():!e&&t?h(t,r,n):e&&!t?g(e,r,n):!e||!t?r.createDocumentFragment():e.type==="root"&&t.type==="root"?G(e,t,r,n):e.type!==t.type?(n.modified+=1,y(e,t,r,n)):e.type==="text"&&t.type==="text"?J(e,t,r,n):e.type!=="element"||t.type!=="element"||e.tagName!==t.tagName?(n.modified+=1,y(e,t,r,n)):e.tagName==="img"?N(e,t,r,n):Z(e,t,r,n)}function G(e,t,r,n){const a=r.createDocumentFragment();return $(e.children,t.children).forEach(i=>{if(i.status==="added"){a.appendChild(h(i.node,r,n));return}if(i.status==="removed"){a.appendChild(g(i.node,r,n));return}a.appendChild(b(i.oldNode,i.newNode,r,n))}),a}function J(e,t,r,n){if(e.text===t.text)return r.createTextNode(t.text);n.modified+=1;const a=r.createElement("span");return a.className="shd-text-diff",a.appendChild(u("del","removed",e.text,r)),a.appendChild(u("ins","added",t.text,r)),a}function Z(e,t,r,n){const a=r.createElement(t.tagName);return p(a,t.attrs),R(e.attrs,t.attrs)||(n.modified+=1),$(e.children,t.children).forEach(i=>{if(i.status==="added"){a.appendChild(h(i.node,r,n));return}if(i.status==="removed"){a.appendChild(g(i.node,r,n));return}a.appendChild(b(i.oldNode,i.newNode,r,n))}),a}function N(e,t,r,n){if(e.attrs.src===t.attrs.src&&R(e.attrs,t.attrs)){const l=r.createElement("img");return p(l,t.attrs),l}n.modified+=1;const a=E("modified","Image replaced",r),s=r.createElement("img");s.className="shd-image-old",p(s,e.attrs),s.title="Previous image";const i=r.createElement("img");return i.className="shd-image-new",p(i,t.attrs),i.title="Current image",a.appendChild(s),a.appendChild(i),a}function h(e,t,r){return x(e,t,r,!0)}function x(e,t,r,n){if(n&&(r.added+=m(e)),e.type==="root"){const s=t.createDocumentFragment();return e.children.forEach(i=>{s.appendChild(x(i,t,r,!1))}),s}if(e.type==="text")return u("ins","added",e.text,t);if(e.tagName==="img"){const s=E("added","Image added",t),i=t.createElement("img");return i.className="shd-image-added",p(i,e.attrs),s.appendChild(i),s}const a=t.createElement(e.tagName);return p(a,e.attrs),w(a,"added"),e.children.forEach(s=>{a.appendChild(x(s,t,r,!1))}),a}function g(e,t,r){return v(e,t,r,!0)}function v(e,t,r,n){if(n&&(r.removed+=m(e)),e.type==="root"){const s=t.createDocumentFragment();return e.children.forEach(i=>{s.appendChild(v(i,t,r,!1))}),s}if(e.type==="text")return u("del","removed",e.text,t);if(e.tagName==="img"){const s=E("removed","Image removed",t),i=t.createElement("img");return i.className="shd-image-removed",p(i,e.attrs),s.appendChild(i),s}const a=t.createElement(e.tagName);return p(a,e.attrs),w(a,"removed"),e.children.forEach(s=>{a.appendChild(v(s,t,r,!1))}),a}function y(e,t,r,n){const a=r.createDocumentFragment();return a.appendChild(g(e,r,n)),a.appendChild(h(t,r,n)),a}function u(e,t,r,n){const a=n.createElement(e);return w(a,t),a.textContent=r,a}function E(e,t,r){const n=r.createElement("span");return n.className="shd-image-wrapper",n.dataset.diffKind=e,n.dataset.diffLabel=t,n}function p(e,t){Object.entries(t).forEach(([r,n])=>{e.setAttribute(r,n)})}function w(e,t){e.setAttribute("data-shd-state",t)}const ee=`<article>
  <h1>Platform Migration Report</h1>
  <p>The current release includes the baseline service topology.</p>
  <p>This paragraph will be removed after the migration.</p>
  <img src="https://picsum.photos/220/140?random=12" alt="Old topology" />
  <ul>
    <li>Redis cluster</li>
    <li>MySQL primary-replica</li>
    <li>Nginx gateway</li>
  </ul>
</article>`,te=`<article>
  <h1>Platform Migration Report 2.0</h1>
  <p>The current release includes the baseline service topology and AI workers.</p>
  <img src="https://picsum.photos/220/140?random=24" alt="New topology" />
  <ul>
    <li>Redis cluster</li>
    <li>ElasticSearch search tier</li>
    <li>MySQL primary-replica on 8.0</li>
    <li>Nginx gateway</li>
  </ul>
</article>`,F=document.querySelector("#app");if(!F)throw new Error("Demo root not found.");F.innerHTML=`
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
`;const H=document.querySelector("#old-html"),k=document.querySelector("#new-html"),A=document.querySelector("#mode-select"),C=document.querySelector("#render-btn"),q=document.querySelector("#stats"),P=document.querySelector("#diff-output");if(!H||!k||!A||!C||!q||!P)throw new Error("Demo controls are incomplete.");const K=H,_=k,V=A,re=q,ae=P;K.value=ee;_.value=te;function T(){const e=X({container:ae,oldHtml:K.value,newHtml:_.value,mode:V.value});re.innerHTML=`
    <span>added: ${e.stats.added}</span>
    <span>removed: ${e.stats.removed}</span>
    <span>modified: ${e.stats.modified}</span>
  `}C.addEventListener("click",T);V.addEventListener("change",T);T();
//# sourceMappingURL=index-DExQjhcX.js.map
