export type VenueRulesWallBulletGroup = {
  title: string
  bullets: readonly string[]
}

export type VenueRulesWallSection = {
  title: string
  bullets?: readonly string[]
  groups?: readonly VenueRulesWallBulletGroup[]
}

/** Shared how-to-play bullets — welcome wall + host Rules TV screen. */
export const QUIZZ_EM_HOW_TO_PLAY_GROUPS: readonly VenueRulesWallBulletGroup[] = [
  {
    title: 'The round',
    bullets: [
      "Texas Hold'em–style trivia — numeric answers from digit cards (e.g. 99, 1492, 90210)",
      'Two private hole cards — everyone bets (call, raise, fold)',
      'Five community cards land — everyone bets again',
    ],
  },
  {
    title: 'Your answer',
    bullets: [
      '45 seconds when betting closes: pick five cards and submit',
      'Arrange digits into your number; add a decimal if you want',
      'Closest to the correct number wins the pot',
    ],
  },
] as const

export const QUIZZ_EM_HOW_TO_PLAY_BULLETS = QUIZZ_EM_HOW_TO_PLAY_GROUPS.flatMap(
  (group) => group.bullets,
) as readonly string[]

/** Flat list for welcome wall and other consumers. */
export const QUIZZ_EM_HOW_TO_PLAY_LINES = QUIZZ_EM_HOW_TO_PLAY_BULLETS

/** Public-display rules wall — seating + gameplay. */
export const VENUE_RULES_WALL_HEADLINE = 'Rules'

export const VENUE_RULES_WALL_SECTIONS: VenueRulesWallSection[] = [
  {
    title: 'Tables & seating',
    bullets: [
      'When the host assigns seating, everyone is shuffled randomly into tables.',
      'As the field shrinks, the room may shuffle a few people or combine tables.',
    ],
  },
  {
    title: 'How to play',
    groups: QUIZZ_EM_HOW_TO_PLAY_GROUPS,
  },
]
