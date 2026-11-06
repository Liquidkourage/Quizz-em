/**
 * Fillable PDF for the full Quizz'em live-test checklist.
 * Requires: npm install pdf-lib --prefix %TEMP%\\qhe-checklist
 * Output:   %USERPROFILE%\\Downloads\\Quizzem-live-test-checklist.pdf
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const tempRoot = path.join(process.env.TEMP || '/tmp', 'qhe-checklist')
const requireFromTemp = createRequire(path.join(tempRoot, 'package.json'))
let pdfLib
try {
  pdfLib = requireFromTemp('pdf-lib')
} catch {
  console.error(
    `Missing pdf-lib. Run: npm install pdf-lib --prefix "${tempRoot}"`,
  )
  process.exit(1)
}

const { PDFDocument, StandardFonts, rgb } = pdfLib

const sections = [
  {
    title: 'Before you start (every session)',
    items: [
      'Hard-reload host, every phone, and the public TV after any master deploy (about 30s Railway pause).',
      'Use one phone held tall, one wide player window, the host, and the TV when layout matters.',
      'Production URL: https://quizz-em.up.railway.app',
    ],
  },
  {
    title: 'Event-day ops',
    items: [
      'Railway server has DATABASE_URL; /health/details shows persistence postgres.',
      'Rehearse restart mid-game: seats return, host reconnects, Resume if frozen; answer clocks extended by downtime.',
      'Freeze deploys during the show.',
      'After restart: host reconnects within about 30s (reload if not); nudge timers are not restored -- nudge again if you want the 30s fold clock.',
      'Boot log shows Restored N table(s); no repeating [snapshot] save failed.',
    ],
  },
  {
    title: 'Host floor (original post-live-test checklist)',
    items: [
      "Each table-action square shows that table's pot.",
      'Hovering a square shows each stack, chips committed to this pot, and a status: To act, In, Folded, or Busted. During guessing, that third line is Guess locked or Guess open.',
      'Opening a table shows larger names, stacks, and title than the floor grid.',
      'The opened table and the floor both show a Side amount when the pot is layered. An even pot shows the total only.',
      'Raise the blinds by hand, then save the pace line. The new blinds and the hand counter stay.',
      'The board button still reads Deal the street. Last call still reads last call. A player facing nothing still reads to bet.',
    ],
  },
  {
    title: 'Player table (original checklist)',
    items: [
      'With the window taller than it is wide, the felt turns 90 degrees. Names, stacks, and the pot turn with it. The status line stays upright, and folded hole cards stay upright.',
      'With the window wider than it is tall, the felt stays landscape.',
      'Type a custom raise one digit at a time. Each digit stays until you send or clear it.',
      'After a check, call, raise, or fold, the status line names that action, in the order it happened.',
      'On a phone, your whole turn keeps the gold dock and the YOUR TURN banner. Waiting shows a small Waiting label. The wide desktop bet panel stays as it was.',
      "In landscape, the top seat's name sits clear of the status line.",
      'On a wide window, both side seats show a full name and stack inside the column. Folding a side seat leaves the name and stack in place.',
      'A 6 and a 9 each have an underline under the center digit and both corner digits. Check a hole card that is turned upside down.',
      'While a hand is live, the felt, the sticky bar, and an unseated info card show Side beside the total when a side pot exists. An even pot has no Side line. An uncalled overbet is not labeled Side during the hand.',
    ],
  },
  {
    title: 'Lobby on a PC (original checklist)',
    items: [
      'On a wide window, the lobby card fills the height of the window. Venue, phase, blinds, and pot spread down the screen.',
      'Once that same window is seated at a table, the felt stays in its column.',
    ],
  },
  {
    title: 'A bust (original checklist)',
    items: [
      'The busted player stays at the table, stack 0, and can still submit a guess.',
      'Their phone keeps the live table. A short notice names the bust, then clears. The phone never sits on a page that is only the logo and "Players who busted this hand."',
      'They skip blinds and bets, and the dealer button skips them.',
      'The public felt draws no chip seat for them. The public winner card leaves them off the chip-winner rows.',
    ],
  },
  {
    title: 'All-in runout (original checklist)',
    items: [
      'Guessing stays closed while any table can still bet, and while the board is short of five cards. The host still deals each street.',
      'Once every contestant is all-in, every table is done, and five community cards are out, guessing opens on its own with the usual clock.',
    ],
  },
  {
    title: 'Money mark (original checklist)',
    items: [
      'Pots, stacks, blinds, and calls show the chip mark where a dollar sign used to be painted.',
      'A leaderboard stack change shows the chip mark beside the amount (TV after a hand pays).',
    ],
  },
  {
    title: 'Cards on the TV (original checklist)',
    note: 'Seed one table for splay. Seed two or more for dual and mosaic.',
    items: [
      'On the one-table public felt, hole cards are splayed.',
      'Dual and mosaic tables keep their previous hole-card layout.',
      "The TV's 6s and 9s have the same underlines as the phone.",
    ],
  },
  {
    title: 'End of the event (original checklist)',
    items: [
      'The winner screen includes "This event is over and the room has closed."',
      'Refreshing that phone stays out of the room and offers Join again. Join again starts a fresh join.',
      'New game (hard reset -- clears all tables) drops every player phone from the session. A phone does not reappear at its old table on its own.',
    ],
  },
  {
    title: 'Still true on purpose (original checklist)',
    items: [
      "During the hand, other players' guesses stay hidden. After the hand closes, the results list shows them, and that list remains in the lobby until the next question.",
    ],
  },
  {
    title: 'Join, leave, and CPU (after original PDF)',
    items: [
      'After server restart and hard refresh, a phone that had left opens the join form, not a permanent YOU LEFT wall.',
      'Hard reset leads to join with host-started-new-game messaging, not a dead end.',
      'Add CPU: lobby can grow toward 160 (20 tables of 8). Each numbered table caps at 8. Assign still splits by eight.',
      'With a human at the table, bots still pace 3-7 seconds between actions (no instant burst mode).',
    ],
  },
  {
    title: 'Player felt and cards (after original PDF)',
    items: [
      'Your hole cards and the community board stay upright with the phone.',
      "Others' face-down cards aim toward their seat.",
      'Seat names and numbers stay upright with the hand in landscape.',
      'Mouse-driven PC: table stays horizontal even when the window is taller than wide.',
      'Touch device held tall: the hand rotates with the table.',
    ],
  },
  {
    title: 'Phone table results (after original PDF)',
    items: [
      'After the hand: columns Name, Answer, Off, Pts, Stack, Change; table scrolls sideways on a phone.',
      'Default sort Off ascending; tap a column to sort; second tap toggles direction; a new column starts ascending.',
      'No guess shows an em dash and sorts last; Pts is this hand trivia points; your row is highlighted but not forced to the top.',
      'Results latch through lobby until the next question.',
    ],
  },
  {
    title: 'Two clocks and guessing (after original PDF)',
    items: [
      'Shared 45-second answerDeadline on host, phone, and TV, including beside Edit after a locked guess.',
      'Host 30-second nudge only on seats without a locked guess; forfeit at nudge end must not block reveal once handled.',
      '45 seconds hitting zero does not auto-reveal; host Reveal is still required; edits allowed until reveal.',
      'Early or preload guess when all-in runout allows (points-only, folded, or all-in with five board cards).',
      'Nudge does not start while any table is still betting.',
    ],
  },
  {
    title: 'Venue rules regression (notes 1-17 territory)',
    items: [
      'Ghost follow: bust attaches to a main-pot winner; follows through shuffle and condense; ghost sees host table cards; eight chip seats on the felt cap.',
      'Latch before move: orphan ghost stamped before condense (no mass dump to table 1).',
      'Late join after assign: points-only, attaches to fewest followers; mid-hand arrival watches; duplicate name refused; no chips left means join refused.',
      'Showdown ledger: Main, Side, Return; uncalled return is not Side; side pots 1-7 have distinct colors.',
      'Scores swipe popup for chip and trivia walls; your row gold.',
      '6.5 second bust modal still appears.',
      'Public display does not block first paint on Google Fonts.',
    ],
  },
  {
    title: 'Nov 5 live-test fixes -- player layout',
    items: [
      '1920x1080 fullscreen: felt and desktop wager panel do not overlap; wager panel scrolls if the window is short.',
      'Wide player window: table keeps size and shape; does not shrink to a sliver or disappear.',
    ],
  },
  {
    title: 'Nov 5 live-test fixes -- host answering and reveal',
    items: [
      'Still guessing notice: Close tucks into Still guessing - N pill; pill reopens the list and Nudge.',
      'Opened table during guessing: each seat shows Submitted or Not submitted.',
      'After restart, phone drops a stale Submitted label when the server has no guess; re-submit if Not submitted.',
      'Reveal proceeds when eight felt seats are done; late entries past chair eight do not block.',
      '45-second guess clock visible on host table line, player status, and TV headline (including after deploy or restart resume).',
      'Phone, TV, and host agree on pot, stacks, and who is in the chip contest.',
    ],
  },
  {
    title: 'Nov 5 live-test fixes -- points-only rule',
    items: [
      'Player and TV felts draw only chip-contest seats; points-only players leave an empty chair, not a stack on the oval.',
      'Host opened table and hover list only seated chip paths (up to eight); no Not on the felt block on the card.',
      'Nudge modal: main list is chip contest still guessing; Points only section lists points-only and off-felt who still owe a guess.',
    ],
  },
  {
    title: 'Latest master since points-only fix -- blinds and pace',
    items: [
      'A live hand keeps the blinds it started with.',
      'No auto level-up schedule in the blinds panel; Level every dropped from the pace guide.',
      'Blind suggestions during the answer beat instead of auto-level mid-hand.',
    ],
  },
  {
    title: 'Latest master -- nudge UX',
    items: [
      'Host nudge controls stay hidden until the 45-second answer timer ends.',
      'The nudged phone shows a flash popup.',
    ],
  },
  {
    title: 'Latest master -- pots, mosaic, reveal',
    items: [
      'Pot layers merge when the same players can win.',
      'Mosaic: side pots read as chips on the rim; folded seats marked; pots that do not fit are hidden.',
      'Side pot appears only when a short all-in actually creates one.',
      'After reveal, the phone shows the player best hand.',
      'Two-table mosaic seating matches the other floors.',
    ],
  },
  {
    title: 'Latest master -- shuffle and timers',
    items: [
      'Scheduled shuffles mix large and small stacks per table.',
      'Venue defaults: 45s guessing guide and 120 minute night length.',
    ],
  },
  {
    title: 'Confirm on a real device (unit-tested only)',
    items: [
      'Table results: column sort taps behave as designed.',
      '45-second clock beside Edit after lock on a real phone.',
    ],
  },
]

const ink = rgb(0.12, 0.11, 0.09)
const muted = rgb(0.33, 0.3, 0.26)
const rule = rgb(0.78, 0.72, 0.58)
const gold = rgb(0.62, 0.46, 0.12)
const paper = rgb(1, 0.99, 0.96)

async function main() {
  const doc = await PDFDocument.create()
  doc.setTitle("Quizz'em live-test checklist (master)")
  doc.setSubject('Fillable checklist: original post-live-test items plus all follow-up fixes')
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const form = doc.getForm()

  const pageWidth = 612
  const pageHeight = 792
  const marginX = 48
  const marginTop = 46
  const marginBottom = 46
  const boxSize = 13
  const textX = marginX + boxSize + 10
  const textWidth = pageWidth - textX - marginX
  const fullWidth = pageWidth - marginX * 2
  const bodySize = 10.5
  const bodyLeading = 14

  const pages = []
  let page = null
  let y = 0

  function addPage(isFirst = false) {
    page = doc.addPage([pageWidth, pageHeight])
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: paper })
    pages.push(page)
    y = pageHeight - marginTop
    if (isFirst) {
      page.drawRectangle({ x: marginX, y: y - 4, width: 52, height: 4, color: gold })
      y -= 22
      page.drawText("Quizz'em", { x: marginX, y, size: 11, font: bold, color: gold })
      y -= 26
      page.drawText('Live-test checklist', { x: marginX, y, size: 22, font: bold, color: ink })
      y -= 18
      const intro =
        'Master list: event ops, original Nov 4 checklist, post-PDF features, Nov 5 fixes, and latest master. Click each box; save the PDF to keep marks. Regenerate with: node scripts/generate-live-test-checklist.mjs'
      wrap(intro, 10, font, fullWidth).forEach((line) => {
        page.drawText(line, { x: marginX, y, size: 10, font, color: muted })
        y -= 13
      })
      y -= 10
    }
  }

  function wrap(text, size, face, width) {
    const words = text.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word
      if (face.widthOfTextAtSize(trial, size) <= width) line = trial
      else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
    return lines
  }

  function ensure(height) {
    if (y - height < marginBottom) addPage(false)
  }

  addPage(true)

  let n = 0
  for (const section of sections) {
    const firstLines = wrap(section.items[0], bodySize, font, textWidth).length
    const noteLines = section.note ? wrap(section.note, 9.5, font, fullWidth).length : 0
    ensure(8 + 18 + (noteLines ? noteLines * 12 + 4 : 0) + 14 + firstLines * bodyLeading + 8)
    y -= 8
    page.drawRectangle({ x: marginX, y: y + 4, width: fullWidth, height: 0.6, color: rule })
    y -= 18
    wrap(section.title, 12, bold, fullWidth).forEach((line, i) => {
      page.drawText(line, { x: marginX, y: y - i * 14, size: 12, font: bold, color: ink })
    })
    y -= 14 * wrap(section.title, 12, bold, fullWidth).length
    y -= 4
    if (section.note) {
      wrap(section.note, 9.5, font, fullWidth).forEach((line) => {
        page.drawText(line, { x: marginX, y, size: 9.5, font, color: muted })
        y -= 12
      })
      y -= 4
    }

    for (const item of section.items) {
      const lines = wrap(item, bodySize, font, textWidth)
      const block = lines.length * bodyLeading
      ensure(block + 8)
      const baseline = y
      const box = form.createCheckBox(`item.${String(n + 1).padStart(3, '0')}`)
      box.addToPage(page, {
        x: marginX,
        y: baseline - 3,
        width: boxSize,
        height: boxSize,
        borderWidth: 1.2,
        borderColor: ink,
        backgroundColor: rgb(1, 1, 1),
      })
      lines.forEach((line, i) => {
        page.drawText(line, {
          x: textX,
          y: baseline - i * bodyLeading,
          size: bodySize,
          font,
          color: ink,
        })
      })
      y = baseline - block - 6
      n += 1
    }
  }

  form.updateFieldAppearances(font)

  const expected = sections.reduce((sum, s) => sum + s.items.length, 0)
  const total = pages.length
  pages.forEach((p, i) => {
    const label = `${i + 1} of ${total}`
    const w = font.widthOfTextAtSize(label, 9)
    p.drawText(label, { x: pageWidth - marginX - w, y: 28, size: 9, font, color: muted })
    p.drawText('Quizzem live-test checklist', { x: marginX, y: 28, size: 9, font, color: muted })
  })

  const out = path.join(process.env.USERPROFILE, 'Downloads', 'Quizzem-live-test-checklist.pdf')
  fs.writeFileSync(out, await doc.save())
  const fieldCount = form.getFields().length
  console.log(`wrote ${out}`)
  console.log(`pages ${total} checkboxes ${fieldCount} expected ${expected}`)
  if (fieldCount !== expected || n !== expected) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
