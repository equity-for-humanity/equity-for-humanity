import { createSeedData } from '../scripts/prototype-store.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const dataPath = join(process.cwd(), 'data', 'prototype-data.json')
await mkdir(dirname(dataPath), { recursive: true })
await writeFile(dataPath, `${JSON.stringify(createSeedData(), null, 2)}\n`)
console.log(`Seeded ${dataPath}`)
