/**
 * Render a markdown file to a readable letter-size PDF (print stylesheet).
 * Usage: node scripts/render-doc-pdf.mjs <input.md> [output.pdf]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import puppeteer from 'puppeteer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const inputPath = path.resolve(process.argv[2] ?? '')
if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('Usage: node scripts/render-doc-pdf.mjs <input.md> [output.pdf]')
  process.exit(1)
}

const outputPath = path.resolve(
  process.argv[3] ?? inputPath.replace(/\.md$/i, '.pdf'),
)

marked.setOptions({ gfm: true, breaks: false })

const md = fs.readFileSync(inputPath, 'utf8')
const body = marked.parse(md)

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${path.basename(inputPath, '.md')}</title>
  <style>
    @page {
      size: letter;
      margin: 0.85in 0.9in 0.95in 0.9in;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, "Helvetica Neue", Arial, sans-serif;
      font-size: 10.75pt;
      line-height: 1.55;
      color: #1a1a1a;
      max-width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 {
      font-size: 22pt;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 0.35em;
      color: #0f172a;
      page-break-after: avoid;
    }
    h2 {
      font-size: 14pt;
      font-weight: 700;
      margin: 1.35em 0 0.45em;
      padding-bottom: 0.15em;
      border-bottom: 1px solid #cbd5e1;
      color: #0f172a;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11.5pt;
      font-weight: 700;
      margin: 1.1em 0 0.35em;
      color: #1e293b;
      page-break-after: avoid;
    }
    p, li { orphans: 3; widows: 3; }
    p { margin: 0.55em 0; }
    strong { font-weight: 650; color: #0f172a; }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 1.25em 0;
    }
    a { color: #1d4ed8; text-decoration: none; }
    ul, ol { margin: 0.45em 0 0.65em; padding-left: 1.35em; }
    li { margin: 0.2em 0; }
    li > ul, li > ol { margin-top: 0.15em; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.75em 0 1em;
      font-size: 9.75pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 0.4em 0.55em;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 650;
      color: #0f172a;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.88em;
      background: #f1f5f9;
      padding: 0.08em 0.28em;
      border-radius: 3px;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 0.65em 0.75em;
      overflow-x: auto;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      margin: 0.75em 0;
      padding: 0.35em 0.85em;
      border-left: 3px solid #94a3b8;
      color: #334155;
      background: #f8fafc;
    }
    em { color: #475569; }
  </style>
</head>
<body>${body}</body>
</html>`

const tmpHtml = path.join(__dirname, '.tmp-doc-render.html')
fs.writeFileSync(tmpHtml, html, 'utf8')

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
try {
  const page = await browser.newPage()
  await page.goto(`file://${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' })
  await page.pdf({
    path: outputPath,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="width:100%;font-size:8pt;color:#64748b;text-align:center;padding:0 0.9in;">' +
      '<span class="pageNumber"></span> / <span class="totalPages"></span>' +
      '</div>',
    margin: { top: '0.75in', bottom: '0.85in', left: '0.75in', right: '0.75in' },
  })
  console.log(`Wrote ${outputPath}`)
} finally {
  await browser.close()
  fs.unlinkSync(tmpHtml)
}
