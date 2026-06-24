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
      "Hold'em-style trivia — build a number from digit cards",
      'Two hole cards, then everyone bets',
      'Five community cards, then everyone bets again',
    ],
  },
  {
    title: 'Your answer',
    bullets: [
      '45 seconds when betting closes — pick five cards and submit',
      'Arrange your number; decimal optional',
      'Closest to the correct answer wins the pot',
    ],
  },
] as const

export const QUIZZ_EM_HOW_TO_PLAY_BULLETS = QUIZZ_EM_HOW_TO_PLAY_GROUPS.flatMap(
  (group) => group.bullets,
) as readonly string[]

/** Flat list for welcome wall and other consumers. */
export const QUIZZ_EM_HOW_TO_PLAY_LINES = QUIZZ_EM_HOW_TO_PLAY_BULLETS

export const VENUE_RULES_JOIN_SEATING_BULLETS = [
  'Join on your phone — scan the QR on the welcome screen',
  'When the host assigns seating, everyone shuffles into tables',
  'As the field shrinks, the room may shuffle or combine tables',
] as const

/** Public-display rules wall — three balanced panels. */
export const VENUE_RULES_WALL_HEADLINE = 'Rules'

export const VENUE_RULES_WALL_SECTIONS: VenueRulesWallSection[] = [
  {
    title: 'The round',
    bullets: QUIZZ_EM_HOW_TO_PLAY_GROUPS[0]!.bullets,
  },
  {
    title: 'Your answer',
    bullets: QUIZZ_EM_HOW_TO_PLAY_GROUPS[1]!.bullets,
  },
  {
    title: 'Join & seating',
    bullets: VENUE_RULES_JOIN_SEATING_BULLETS,
  },
]
