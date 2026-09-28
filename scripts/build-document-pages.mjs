#!/usr/bin/env node
// Builds the public web versions of the founding documents and the
// next-stage plan (markdown under docs/) into documents/*.html.
// Zero dependencies: supports the small markdown subset used in those files.
//
//   node scripts/build-document-pages.mjs          write documents/*.html
//   node scripts/build-document-pages.mjs --check  fail if documents/*.html is stale

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "documents");
const REPO_URL = "https://github.com/equity-for-humanity/equity-for-humanity";

// Order, grouping, and short descriptions for the Documents index and prev/next links.
// Founding documents take precedence over the plan, so they are listed first.
export const DOCUMENTS = [
  { src: "docs/plan/README.md", slug: "index", group: "plan", short: "Overview", summary: "Summary of the project and the next-stage plan." },
  { src: "docs/current/equity-for-humanity-founding-concept-v1.0.md", slug: "founding-concept", group: "founding", short: "Founding Concept Brief", summary: "The mission, principles, mechanism, and key elements of Equity for Humanity." },
  { src: "docs/current/equity-for-humanity-administration-principles-v0.1.md", slug: "administration-principles", group: "founding", short: "Administration Principles", summary: "How resources are to be stewarded, separated, reported, and governed." },
  { src: "docs/planning/e4h-global-human-flourishing-index-proposal-v0.2.md", slug: "investment-proposal", group: "founding", short: "Investment Proposal", summary: "The reference index and the UN Global Compact conduct screen." },
  { src: "docs/plan/roadmap.md", slug: "roadmap", group: "plan", short: "Roadmap", summary: "Stages, next actions, and responsibilities." },
  { src: "docs/plan/status.md", slug: "status", group: "plan", short: "Status", summary: "Completed, upcoming, and blocked items." },
  { src: "docs/plan/legal-structure-options.md", slug: "legal-structure-options", group: "plan", short: "Legal structure", summary: "Legal and organizational options, and the proposed structure." },
  { src: "docs/plan/investing.md", slug: "investing", group: "plan", short: "Investing", summary: "Implementing the investment approach: indexes, custody, and safeguards." },
  { src: "docs/plan/trump-accounts.md", slug: "trump-accounts", group: "plan", short: "Trump accounts", summary: "The US child investment accounts and the lessons they offer." },
  { src: "docs/plan/partners-and-outreach.md", slug: "partners-and-outreach", group: "plan", short: "Partners", summary: "Organizations to learn from and possibly work with." },
  { src: "docs/plan/operations-with-agents.md", slug: "operations-with-agents", group: "plan", short: "Operations", summary: "How work is organized, and what always requires human approval." },
  { src: "docs/plan/communications.md", slug: "communications", group: "plan", short: "Communications", summary: "Channels, the first video series, and publication rules." },
  { src: "docs/plan/open-questions.md", slug: "open-questions", group: "plan", short: "Open questions", summary: "Decisions taken, questions still open, and known gaps." },
];

const GROUPS = {
  founding: {
    heading: "Founding documents",
    eyebrow: "Founding document",
    disclaimer:
      "<strong>Founding document.</strong> This document sets out the concept and principles of Equity for Humanity. Where the next-stage plan and a founding document differ, the founding document takes precedence. It is not legal, tax, or financial advice, not an offer of any investment, and not a request for donations.",
  },
  plan: {
    heading: "Next-stage plan (working draft)",
    eyebrow: "Next-stage plan — working draft",
    disclaimer:
      "<strong>Working draft.</strong> The next-stage plan is published for discussion and follows the founding documents. It is not legal, tax, or financial advice, not an offer of any investment, and not a request for donations. Facts were checked on the dates shown, and anything marked unverified or uncertain still requires confirmation.",
  },
};

let currentSource = "docs/plan/README.md";

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function rewriteHref(href, fromSrc = currentSource) {
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  const [path, hash = ""] = href.split("#");
  const suffix = hash ? `#${hash}` : "";
  const repoPath = posix.normalize(posix.join(posix.dirname(fromSrc), path));
  if (repoPath.startsWith("..")) return href;
  const doc = DOCUMENTS.find((d) => d.src === repoPath);
  if (doc) return `${doc.slug}.html${suffix}`;
  return `${REPO_URL}/blob/main/${repoPath}${suffix}`;
}

export function inline(text) {
  const codeSpans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });
  out = escapeHtml(out);
  out = out.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (_, url) => `<a href="${url}">${url}</a>`);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const target = rewriteHref(href.replace(/&amp;/g, "&"));
    const external = /^https?:/.test(target) ? ' rel="noopener"' : "";
    return `<a href="${escapeHtml(target)}"${external}>${label}</a>`;
  });
  out = out.replace(
    /(^|[\s(])(https?:\/\/[^\s<]*[^\s<.,;:!?)])/g,
    (_, pre, url) => `${pre}<a href="${url}" rel="noopener">${url}</a>`
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => codeSpans[Number(i)]);
  return out;
}

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

const isTableDivider = (line) => line.includes("|") && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);
const listItem = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

function renderList(lines, start) {
  const baseIndent = lines[start].match(listItem)[1].length;
  const ordered = /\d+\./.test(lines[start].match(listItem)[2]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(listItem);
    if (m && m[1].length === baseIndent && /\d+\./.test(m[2]) === ordered) {
      items.push({ text: m[3], children: [] });
      i++;
    } else if (m && m[1].length > baseIndent && items.length) {
      const nested = renderList(lines, i);
      items[items.length - 1].children.push(nested.html);
      i = nested.next;
    } else if (!m && lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
      items[items.length - 1].text += ` ${lines[i].trim()}`;
      i++;
    } else {
      break;
    }
  }
  const tag = ordered ? "ol" : "ul";
  const body = items
    .map(({ text, children }) => {
      let content = inline(text);
      const task = text.match(/^\[( |x|X)\]\s+(.*)$/);
      let cls = "";
      if (task) {
        const done = task[1].toLowerCase() === "x";
        content = `<span class="task-box" aria-hidden="true">${done ? "☑" : "☐"}</span><span class="visually-hidden">${done ? "Done: " : "To do: "}</span>${inline(task[2])}`;
        cls = ` class="task${done ? " done" : ""}"`;
      }
      return `<li${cls}>${content}${children.join("")}</li>`;
    })
    .join("");
  return { html: `<${tag}>${body}</${tag}>`, next: i };
}

export function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const headings = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const html = inline(h[2].trim());
      const id = slugify(h[2]);
      headings.push({ level, id, html });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push("<hr />");
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${markdownToHtml(buf.join("\n")).html}</blockquote>`);
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((c) =>
        c.endsWith(":") ? (c.startsWith(":") ? "center" : "right") : ""
      );
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(splitRow(lines[i++]));
      const cell = (tag, c, idx) =>
        `<${tag}${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ""}>${inline(c)}</${tag}>`;
      out.push(
        `<div class="table-wrap"><table><thead><tr>${header.map((c, idx) => cell("th", c, idx)).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c, idx) => cell("td", c, idx)).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
      continue;
    }
    if (listItem.test(line)) {
      const list = renderList(lines, i);
      out.push(list.html);
      i = list.next;
      continue;
    }
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|```|>|(-{3,}|\*{3,})\s*$)/.test(lines[i]) &&
      !listItem.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableDivider(lines[i + 1]))
    ) {
      buf.push(lines[i++].trim());
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return { html: out.join("\n"), headings };
}

const navLinks = (active) => `
      <a href="../about.html">Our story</a>
      <a href="../index.html#mechanism">Mechanism</a>
      <a href="index.html"${active ? ' aria-current="page"' : ""}>Documents</a>
      <a class="button secondary" href="../index.html#next">Next steps</a>
      <a href="../index.html#contact">Contact</a>`;

function pageTemplate({ title, description, bodyHtml, headings, doc, index }) {
  const pos = DOCUMENTS.indexOf(doc);
  const prev = DOCUMENTS[pos - 1];
  const next = DOCUMENTS[pos + 1];
  const group = GROUPS[doc.group];
  const hrefFor = (d) => `${d.slug}.html`;
  const toc = headings.filter((h) => h.level === 2);
  const docList = DOCUMENTS.map(
    (d) =>
      `<li><a href="${hrefFor(d)}"${d === doc ? ' aria-current="page"' : ""}>${escapeHtml(d.short)}</a></li>`
  ).join("");
  const cardGroup = (key) => `
      <h2 class="doc-group-title">${escapeHtml(GROUPS[key].heading)}</h2>
      <div class="grid doc-grid">${DOCUMENTS.filter((d) => d.group === key && d !== doc)
        .map(
          (d) =>
            `<a class="card doc-card" href="${hrefFor(d)}"><h3>${escapeHtml(d.short)}</h3><p>${escapeHtml(d.summary)}</p></a>`
        )
        .join("")}</div>`;
  const cards = index
    ? `<section class="doc-cards" aria-labelledby="documents"><div class="wrap">
      <div class="kicker" id="documents">Documents</div>${cardGroup("founding")}${cardGroup("plan")}
    </div></section>`
    : "";
  const tocHtml =
    toc.length > 2
      ? `<nav class="doc-toc" aria-label="On this page"><div class="doc-toc-title">On this page</div><ol>${toc
          .map((h) => `<li><a href="#${h.id}">${h.html}</a></li>`)
          .join("")}</ol></nav>`
      : "";
  const pager = `<nav class="doc-pager" aria-label="Previous and next document">
        ${prev ? `<a class="button secondary" href="${hrefFor(prev)}">← ${escapeHtml(prev.short)}</a>` : "<span></span>"}
        ${next ? `<a class="button secondary" href="${hrefFor(next)}">${escapeHtml(next.short)} →</a>` : "<span></span>"}
      </nav>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Equity for Humanity</title>
  <link rel="icon" type="image/svg+xml" href="../assets/equity-for-humanity-logo.svg" />
  <link rel="alternate icon" type="image/png" href="../assets/equity-for-humanity-logo.png" />
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="stylesheet" href="../assets/site.css" />
  <link rel="stylesheet" href="../assets/documents.css" />
</head>
<body class="doc-page">
<!-- Generated from ${doc.src} by scripts/build-document-pages.mjs. Edit the markdown, then rebuild. -->
<header>
  <nav class="wrap" aria-label="Primary navigation">
    <a class="brand" href="../index.html"><div class="mark" aria-hidden="true"></div>Equity for Humanity</a>
    <div class="links">${navLinks(index)}
    </div>
  </nav>
</header>

<main id="top">
  <section class="hero doc-hero">
    <div class="wrap">
      <div class="eyebrow"><span></span>${escapeHtml(group.eyebrow)}</div>
      <p class="status-disclaimer">${group.disclaimer}</p>
      <nav class="doc-switcher" aria-label="Documents"><ol>${docList}</ol></nav>
    </div>
  </section>
${cards}
  <article class="doc">
    <div class="wrap doc-layout">
      ${tocHtml}
      <div class="doc-body">
${bodyHtml}
      </div>
    </div>
    <div class="wrap doc-foot">
      ${pager}
      <p class="doc-source">Source: <a href="${REPO_URL}/blob/main/${doc.src}" rel="noopener">${doc.src}</a> on GitHub. Corrections and comments are welcome by email or through a GitHub issue.</p>
    </div>
  </article>
</main>

<footer class="footer">
  <div class="wrap">
    <div><strong>Equity for Humanity</strong> — A founding public concept to help every human being share in this generational AI transformation, so all of humanity can benefit and flourish.</div>
    <div class="footer-links">
      <a href="../about.html">Our story</a>
      <a href="index.html"${index ? ' aria-current="page"' : ""}>Documents</a>
      <a href="../index.html#contact">Contact</a>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

export function buildPage(doc, md) {
  currentSource = doc.src;
  const { html, headings } = markdownToHtml(md);
  const h1 = headings.find((h) => h.level === 1);
  const title = h1 ? h1.html.replace(/<[^>]+>/g, "") : doc.short;
  return pageTemplate({
    title,
    description: doc.summary,
    bodyHtml: html,
    headings,
    doc,
    index: doc.slug === "index",
  });
}

function main() {
  const check = process.argv.includes("--check");
  mkdirSync(OUT_DIR, { recursive: true });
  const stale = [];
  for (const doc of DOCUMENTS) {
    const md = readFileSync(join(ROOT, doc.src), "utf8");
    const html = buildPage(doc, md);
    const outPath = join(OUT_DIR, `${doc.slug}.html`);
    if (check) {
      if (!existsSync(outPath) || readFileSync(outPath, "utf8") !== html) stale.push(outPath);
    } else {
      writeFileSync(outPath, html);
      console.log(`wrote ${posix.relative(ROOT, outPath) || outPath}`);
    }
  }
  if (check && stale.length) {
    console.error(`Stale document pages (run node scripts/build-document-pages.mjs):\n${stale.join("\n")}`);
    process.exit(1);
  }
  if (check) console.log("document pages are up to date");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
