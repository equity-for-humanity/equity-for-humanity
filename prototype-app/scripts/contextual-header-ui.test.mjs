import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const cssSource = await readFile(new URL('../src/App.css', import.meta.url), 'utf8')

describe('contextual app header UI contract', () => {
  it('keeps the full mission hero on Overview but compacts it on workflow screens', () => {
    expect(appSource).toContain("className={`hero-panel ${screen === 'welcome' ? 'hero-panel-full' : 'hero-panel-compact'}`}")
    expect(cssSource).toContain('.hero-panel-compact .hero-grid { display: none; }')
    expect(cssSource).toContain('.hero-panel-compact .topbar { margin-bottom: 0; }')
  })
})
