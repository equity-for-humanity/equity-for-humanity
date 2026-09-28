import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownToHtml, inline, rewriteHref, slugify, buildPage, DOCUMENTS } from "./build-document-pages.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("inline formatting escapes HTML and renders emphasis, code, and links", () => {
  assert.equal(inline("a <b> & **bold** *it* `x<y`"), "a &lt;b&gt; &amp; <strong>bold</strong> <em>it</em> <code>x&lt;y</code>");
  assert.equal(inline("[Road](roadmap.md#stage-1)"), '<a href="roadmap.html#stage-1">Road</a>');
  assert.equal(
    inline("<https://example.org/a>"),
    '<a href="https://example.org/a">https://example.org/a</a>'
  );
  assert.equal(
    inline("See https://example.org/a_b."),
    'See <a href="https://example.org/a_b" rel="noopener">https://example.org/a_b</a>.'
  );
  assert.equal(inline("file_name_here stays"), "file_name_here stays");
});

test("links between published documents become pages; other repo paths go to GitHub", () => {
  assert.equal(rewriteHref("README.md", "docs/plan/roadmap.md"), "index.html");
  assert.equal(rewriteHref("status.md", "docs/plan/roadmap.md"), "status.html");
  assert.equal(
    rewriteHref("../current/equity-for-humanity-founding-concept-v1.0.md", "docs/plan/README.md"),
    "founding-concept.html"
  );
  assert.match(
    rewriteHref("../current/equity-for-humanity-philosophy-and-scale-v1.5.md", "docs/plan/README.md"),
    /github\.com\/.*\/blob\/main\/docs\/current\//
  );
  assert.equal(rewriteHref("mailto:a@b.c"), "mailto:a@b.c");
});

test("block elements: headings, lists, tasks, tables, quotes, code", () => {
  const md = [
    "# Title",
    "",
    "Para one",
    "continues.",
    "",
    "- item",
    "  - nested",
    "- [x] done task",
    "- [ ] open task",
    "",
    "1. first",
    "2. second",
    "",
    "| A | B |",
    "|-|--:|",
    "| 1 | 2 |",
    "",
    "> quoted",
    "",
    "```",
    "<raw>",
    "```",
  ].join("\n");
  const { html, headings } = markdownToHtml(md);
  assert.deepEqual(headings.map((h) => h.id), ["title"]);
  assert.match(html, /<p>Para one continues\.<\/p>/);
  assert.match(html, /<ul><li>item<ul><li>nested<\/li><\/ul><\/li>/);
  assert.match(html, /<li class="task done">/);
  assert.match(html, /<li class="task">/);
  assert.match(html, /<ol><li>first<\/li><li>second<\/li><\/ol>/);
  assert.match(html, /<th>A<\/th><th style="text-align:right">B<\/th>/);
  assert.match(html, /<blockquote><p>quoted<\/p><\/blockquote>/);
  assert.match(html, /<pre><code>&lt;raw&gt;<\/code><\/pre>/);
});

test("slugify keeps accented letters and drops punctuation", () => {
  assert.equal(slugify("Stage 1: Québec OBNL (optional)"), "stage-1-québec-obnl-optional");
});

test("every document builds with the right disclaimer and committed pages are up to date", () => {
  for (const doc of DOCUMENTS) {
    const md = readFileSync(join(ROOT, doc.src), "utf8");
    const html = buildPage(doc, md);
    assert.match(html, /not legal, tax, or financial advice/);
    assert.match(html, doc.group === "founding" ? /Founding document\./ : /Working draft\./);
    const committed = readFileSync(join(ROOT, "documents", `${doc.slug}.html`), "utf8");
    assert.equal(committed, html, `documents/${doc.slug}.html is stale; run node scripts/build-document-pages.mjs`);
  }
});
