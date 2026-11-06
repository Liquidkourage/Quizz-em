/**
 * Measure mosaic felt size, side-pot chips, and name overlaps in one pass.
 * The display dev server has to be running first:
 *   npm run dev --workspace display
 * Then:
 *   npm run measure:mosaic
 *   npm run measure:mosaic -- --url http://localhost:7780/display/
 */
import puppeteer from 'puppeteer'

const CASES = [
  { name: '9 short', width: 1400, height: 800, count: 9 },
  { name: '9 tv', width: 1920, height: 1080, count: 9 },
  { name: '6 tv', width: 1920, height: 1080, count: 6 },
  { name: '20 tv', width: 1920, height: 1080, count: 20 },
]

function cases() {
  const flag = process.argv.indexOf('--counts')
  if (flag < 0) return CASES
  const raw = process.argv[flag + 1] ?? ''
  const counts = raw.split(',').map((part) => Number(part.trim())).filter((count) => Number.isInteger(count) && count >= 1 && count <= 20)
  if (counts.length === 0) {
    console.error('Usage: node scripts/measure-mosaic.mjs [--counts 2,3,5,6,8,13,15]')
    process.exit(1)
  }
  const sizeFlag = process.argv.indexOf('--size')
  const [width, height] = sizeFlag >= 0 ? (process.argv[sizeFlag + 1] ?? '').split('x').map(Number) : [1920, 1080]
  if (!(width > 0) || !(height > 0)) {
    console.error('Usage: node scripts/measure-mosaic.mjs [--counts 3,6] [--size 1920x1080]')
    process.exit(1)
  }
  return counts.map((count) => ({ name: `${count} ${width}x${height}`, width, height, count }))
}

function displayUrl() {
  const flag = process.argv.indexOf('--url')
  const raw = flag >= 0 ? process.argv[flag + 1] : 'http://localhost:7780/display/'
  if (!raw) {
    console.error('Usage: node scripts/measure-mosaic.mjs [--url http://localhost:7780/display/]')
    process.exit(1)
  }
  return raw.endsWith('/') ? raw : `${raw}/`
}

function previewUrl(base, count) {
  const url = new URL(base)
  url.searchParams.set('room', 'PREVIEW')
  url.searchParams.set('mosaic', String(count))
  return url.toString()
}

function measureLayout() {
  function readTile(tile) {
    const felt = [...tile.querySelectorAll('div')].find((el) => String(el.className).includes('aspect-['))
    const lane = tile.querySelector('.vfd-mosaic-side-lane')
    const plaques = [...tile.querySelectorAll('.vfd-mosaic-side-plaque, .vfd-mosaic-side-overflow')]
    const tileBox = tile.getBoundingClientRect()
    const feltBox = felt ? felt.getBoundingClientRect() : null
    const names = [...tile.querySelectorAll('span')].filter((el) => /^[A-Z]{2}$/.test((el.textContent || '').trim()))
    const seen = new Set()
    const hits = []
    for (const el of names) {
      const nameBox = el.getBoundingClientRect()
      const key = `${el.textContent.trim()}${Math.round(nameBox.x)}${Math.round(nameBox.y)}`
      if (seen.has(key)) continue
      seen.add(key)
      for (const plaque of plaques) {
        const chipBox = plaque.getBoundingClientRect()
        const overlapX = Math.min(nameBox.right, chipBox.right) - Math.max(nameBox.left, chipBox.left)
        const overlapY = Math.min(nameBox.bottom, chipBox.bottom) - Math.max(nameBox.top, chipBox.top)
        if (overlapX > 2 && overlapY > 2) hits.push(el.textContent.trim())
      }
    }
    const pot = [...tile.querySelectorAll('span')].find((el) =>
      (el.getAttribute('style') || '').includes('translate(-50%, -50%)'),
    )
    const potBox = pot ? pot.getBoundingClientRect() : null
    return {
      n: Number(tile.getAttribute('data-table-tile')),
      tile: `${Math.round(tileBox.width)}x${Math.round(tileBox.height)}`,
      felt: feltBox ? `${Math.round(feltBox.width)}x${Math.round(feltBox.height)}` : 'missing',
      feltTop: feltBox ? Math.round(feltBox.top - tileBox.top) : 0,
      feltBelow: feltBox ? Math.round(tileBox.bottom - feltBox.bottom) : 0,
      share: feltBox && tileBox.width > 0 ? Math.round((100 * feltBox.width) / tileBox.width) : 0,
      corners: Boolean(lane && lane.className.includes('corners')),
      laneH: lane ? Math.round(lane.getBoundingClientRect().height) : 0,
      chips: plaques.map((plaque) => {
        const chipBox = plaque.getBoundingClientRect()
        const x = Math.round(chipBox.left - tileBox.left)
        const y = Math.round(chipBox.top - tileBox.top)
        const fromBottom = Math.round(tileBox.bottom - chipBox.bottom)
        const fromLeft = Math.round(chipBox.left - tileBox.left)
        const fromRight = Math.round(tileBox.right - chipBox.right)
        return `${Math.round(chipBox.width)}x${Math.round(chipBox.height)} L${fromLeft} R${fromRight} B${fromBottom}`
      }),
      hits: [...new Set(hits)],
      potH: potBox ? Math.round(potBox.height) : null,
      potDx:
        potBox && feltBox
          ? Math.round(potBox.left + potBox.width / 2 - (feltBox.left + feltBox.width / 2))
          : null,
    }
  }

  const tiles = [...document.querySelectorAll('[data-table-tile]')].map(readTile)
  const bands = new Map()
  for (const tile of document.querySelectorAll('[data-table-tile]')) {
    const top = Math.round(tile.getBoundingClientRect().top / 8) * 8
    bands.set(top, (bands.get(top) || 0) + 1)
  }
  return {
    inner: [window.innerWidth, window.innerHeight],
    rows: [...bands.keys()].sort((a, b) => a - b).map((top) => bands.get(top)),
    samples: tiles.filter((tile) => tile.n === 1 || tile.n === 2 || tile.n === 3),
    hits: tiles.filter((tile) => tile.hits.length > 0).map((tile) => ({ n: tile.n, hits: tile.hits })),
  }
}

async function settle(page) {
  await page.waitForSelector('[data-table-tile="1"]', { timeout: 8000 })
  let previous = ''
  let steady = 0
  let latest = null
  for (let attempt = 0; attempt < 30; attempt += 1) {
    latest = await page.evaluate(measureLayout)
    const signature = JSON.stringify(latest.samples.map((tile) => [tile.felt, tile.laneH, tile.potH]))
    const ready = signature === previous && latest.samples[0]?.felt !== 'missing'
    steady = ready ? steady + 1 : 0
    if (steady >= 3) return latest
    previous = signature
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return latest
}

function printCase(item, layout) {
  const rows = layout.rows.join('-')
  console.log(
    `${item.name}  ${item.width}x${item.height}  inner ${layout.inner[0]}x${layout.inner[1]}  mosaic ${item.count}  rows ${rows}`,
  )
  for (const tile of layout.samples) {
    const lane = tile.corners ? 'corners' : `lane ${tile.laneH}`
    const chips = tile.chips.length > 0 ? `chips ${tile.chips.join(' ')}` : 'no chips'
    const pot = tile.potH == null ? '' : `  pot ${tile.potH} dx ${tile.potDx}`
    console.log(
      `  t${tile.n}  tile ${tile.tile}  felt ${tile.felt} (${tile.share}%) top ${tile.feltTop} below ${tile.feltBelow}  ${lane}  ${chips}${pot}`,
    )
  }
  if (layout.hits.length === 0) {
    console.log('  names clear')
    return
  }
  for (const hit of layout.hits) console.log(`  names t${hit.n} ${hit.hits.join(',')}`)
}

async function main() {
  const base = displayUrl()
  try {
    await fetch(base, { signal: AbortSignal.timeout(2000) })
  } catch {
    console.error(`Display dev server is not up at ${base}`)
    console.error('Start it with: npm run dev --workspace display')
    process.exit(1)
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    for (const item of cases()) {
      await page.setViewport({ width: item.width, height: item.height, deviceScaleFactor: 1 })
      await page.goto(previewUrl(base, item.count), { waitUntil: 'domcontentloaded' })
      const layout = await settle(page)
      if (!layout || layout.samples.length === 0) {
        console.error(`${item.name} did not render a mosaic`)
        process.exitCode = 1
        continue
      }
      printCase(item, layout)
    }
  } finally {
    await browser.close()
  }
}

await main()
