#!/usr/bin/env node
// Builds a station's 3D page into one self-contained file: pastes lab-kit.js into the
// block between <!-- lab-kit:start --> and <!-- lab-kit:end --> (three.js still comes
// from the pinned CDN in the page's import map).
//   node station-kit/machine/build.mjs station-kit/machine/stations/hsb05-3d.html [outDir]
//   (outDir defaults to public/stations, relative to where you run it)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const kit = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'lab-kit.js'), 'utf8')
const [src, outDir = 'public/stations'] = process.argv.slice(2)
if (!src) {
  console.error('usage: node build.mjs <stations/name.html> [outDir]')
  process.exit(1)
}
const page = readFileSync(src, 'utf8')
const re = /<!-- lab-kit:start -->[\s\S]*?<!-- lab-kit:end -->/
if (!re.test(page)) {
  console.error(`${src}: no lab-kit markers`)
  process.exit(1)
}
const block = `<!-- lab-kit:start -->\n<script type="module">\n${kit.replace(/<\/script/gi, '<\/script')}\n</script>\n<!-- lab-kit:end -->`
mkdirSync(resolve(outDir), { recursive: true })
const out = join(resolve(outDir), basename(src))
writeFileSync(out, page.replace(re, () => block))
console.log(`built ${out}`)
