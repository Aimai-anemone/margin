// Run after npm run build: node dev/check_scenery_build.mjs
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const sw = readFileSync(new URL('dist/sw.js', root), 'utf8')
const entries = [...sw.matchAll(/\{url:"(scenery\/[^"\n]+)",revision:"([^"]+)"\}/g)]
assert.equal(entries.length, 30)
const files = readdirSync(new URL('public/scenery/', root)).filter(name => name.endsWith('.webp')).sort()
assert.equal(files.length, 30)
assert.deepEqual(files.map(name => name.slice(0, 2)), Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0')))
if (existsSync(new URL('scenery-originals/', root))) {
  const originals = readdirSync(new URL('scenery-originals/', root)).filter(name => name.endsWith('.png')).map(name => name.replace(/\.png$/, '.webp')).sort()
  assert.deepEqual(files, originals, 'Stable original filenames and image IDs')
}
for (const [, path, revision] of entries) {
  const source = readFileSync(new URL(`public/${path}`, root))
  assert.deepEqual(readFileSync(new URL(`dist/${path}`, root)), source)
  assert.equal(revision, createHash('md5').update(source).digest('hex'), 'Precache revision must match the new image')
}
assert.ok(!sw.includes('scenery-40/'), 'No legacy 40px precache')
assert.ok(!sw.includes('public/scenery/'), 'No nested legacy 36px precache')
assert.ok(!existsSync(new URL('dist/dev/', root)), 'Development gallery and scripts must not be published')
assert.ok(!existsSync(new URL('dist/scenery-originals/', root)), 'Original PNGs must not be published')
console.log('30 original IDs, byte-identical production images and current cache revisions verified; no legacy precache, originals or development gallery')
