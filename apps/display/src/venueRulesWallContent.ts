export type VenueRulesWallSection = {
  title: string
  lines: readonly string[]
}

/** Shared “how to play” copy — welcome wall + host Rules TV screen. */
export const QUIZZ_EM_HOW_TO_PLAY_LINES = [
  "Quizz'em is a trivia game played exactly like Texas Hold'em—answers are numeric, cards are single digits (e.g. 99, 1492, 90210).",
  'You get two private digit cards—a.k.a. hole cards—and everyone bets once on their phones (call, raise, fold). Then five digit community cards land; everyone bets again.',
  'When betting closes you have 45 seconds to: pick five digit cards to form your hand, arrange them into your answer (adding a decimal if you want), and submit your response.',
  'Whoever is closest to the correct number wins this round’s pot.',
] as const

/** Public-display rules wall — seating + gameplay. */
export const VENUE_RULES_WALL_HEADLINE = 'Rules'

export const VENUE_RULES_WALL_SECTIONS: VenueRulesWallSection[] = [
  {
    title: 'Tables & seating',
    lines: [
      'When the host assigns seating, everyone is shuffled randomly into tables.',
      'As the field shrinks, the room may shuffle a few people or combine tables.',
    ],
  },
  {
    title: 'How to play',
    lines: QUIZZ_EM_HOW_TO_PLAY_LINES,
  },
]
