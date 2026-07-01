import { selectVenueFloorLayout } from '../src/venueFloorLayout.ts'

const vp = { widthPx: 1920, heightPx: 1080 }

function row(n, p) {
  const pat = p.rowSizes.join(' · ')
  const tag = p.staggered ? 'stagger' : 'uniform'
  return `${String(n).padStart(2)}  │ ${String(p.columns).padStart(2)} cols │ ${p.rowCount} rows │ ${pat.padEnd(14)} │ ${tag}`
}

console.log('COUNT ONLY (before viewport measure)')
console.log(' N  │ cols │ rows │ pattern        │ type')
console.log('────┼──────┼──────┼────────────────┼─────────')
for (let n = 1; n <= 20; n++) {
  console.log(row(n, selectVenueFloorLayout({ tableCount: n })))
}

console.log('')
console.log('1920×1080 + headline (typical venue TV)')
console.log(' N  │ cols │ rows │ pattern        │ type')
console.log('────┼──────┼──────┼────────────────┼─────────')
for (let n = 1; n <= 20; n++) {
  console.log(row(n, selectVenueFloorLayout({ tableCount: n, viewport: vp, withHeadline: true })))
}
