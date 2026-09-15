import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const launcherSource = await readFile(new URL('./dev-with-api.mjs', import.meta.url), 'utf8')
const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8')

describe('canonical interactive app scripts', () => {
  it('starts the API and frontend together through the only local app command', () => {
    expect(Object.keys(packageJson.scripts).sort()).toEqual(['api', 'build', 'dev', 'lint', 'seed', 'start', 'test'])
    expect(packageJson.scripts.dev).toContain('dev-with-api')
    expect(packageJson.scripts.start).toContain('dev-with-api')
  })

  it('launches the canonical frontend without mode-specific environment injection', () => {
    expect(launcherSource).toContain("['--watch', 'scripts/prototype-api.mjs']")
    expect(launcherSource).toContain("['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5177']")
    expect(launcherSource).not.toContain('env:')
    const envKeys = envExample
      .split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=', 1)[0])
    expect(envKeys).toEqual(['VITE_E4H_API_BASE', 'E4H_API_HOST', 'E4H_API_PORT', 'E4H_ALLOWED_ORIGINS', 'E4H_STORE', 'DATABASE_URL', 'E4H_POSTGRES_SSL', 'E4H_POSTGRES_STATE_KEY'])
  })

  it('keeps the hosted Cloudflare private-beta runtime beside the local JSON app', async () => {
    const wrangler = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8')
    const api = await readFile(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8')
    const store = await readFile(new URL('../functions/_shared/cloudflare-store.js', import.meta.url), 'utf8')
    expect(wrangler).toContain('equity-for-humanity-private-beta')
    expect(wrangler).toContain('binding = "DB"')
    expect(wrangler).not.toContain('kv_namespaces')
    expect(wrangler).toContain('https://app.equityforhumanity.org,https://equity-for-humanity-private-beta.pages.dev')
    expect(wrangler).not.toContain('workers.cloudflare.com')
    expect(wrangler).not.toContain('*.pages.dev')
    expect(wrangler).not.toContain('E4H_BETA_ACCESS_CODE=')
    expect(api).toContain('/snapshot')
    expect(api).not.toContain('const sessions = new Map()')
    expect(api).toContain('createSession(env')
    expect(api).toContain('resolveSession(env')
    expect(store).toContain('createSeedData')
    expect(store).toContain('humanityFundBalance')
    expect(store).toContain('prototype_sessions')
    expect(store).toContain('mutateSnapshot')
    expect(store).toContain('SNAPSHOT_CONFLICT')
    expect(store).toContain("password: 'Test123#'")
  })
})
