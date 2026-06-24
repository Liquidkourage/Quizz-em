export type VenueRulesWallBulletGroup = {
  title: string
  bullets: readonly string[]
}

export type VenueRulesWallColumn = {
  title: string
  groups: readonly VenueRulesWallBulletGroup[]
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

/** Public-display rules wall — one card, two columns. */
export const VENUE_RULES_WALL_HEADLINE = 'Rules'

export const VENUE_RULES_WALL_LEFT: VenueRulesWallColumn = {
  title: 'How to play',
  groups: QUIZZ_EM_HOW_TO_PLAY_GROUPS,
}

export const VENUE_RULES_WALL_RIGHT: VenueRulesWallColumn = {
  title: 'Before the first hand',
  groups: [
    {
      title: 'Join the game',
      bullets: [
        'Scan the QR on the welcome screen to join on your phone',
        'Bet and submit answers on your phone — TVs show the room',
      ],
    },
    {
      title: 'Tables & seating',
      bullets: [
        'When the host assigns seating, everyone is shuffled randomly into tables',
        'As the field shrinks, the room may shuffle a few people or combine tables',
      ],
    },
  ],
}

export const VENUE_RULES_WALL_COLUMNS = [VENUE_RULES_WALL_LEFT, VENUE_RULES_WALL_RIGHT] as const
