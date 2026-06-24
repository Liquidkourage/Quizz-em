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
      "Hold'em-style trivia — build a number from cards",
      'Two hole cards, then everyone bets',
      'Five community cards, then everyone bets again',
    ],
  },
  {
    title: 'Your answer',
    bullets: [
      '45 seconds — pick five cards and submit',
      'Closest wins the pot',
    ],
  },
] as const

/** Public-display rules wall — one card, two columns. */
export const VENUE_RULES_WALL_HEADLINE = 'Rules'

export const VENUE_RULES_WALL_LEFT: VenueRulesWallColumn = {
  title: 'Playing to win',
  groups: QUIZZ_EM_HOW_TO_PLAY_GROUPS,
}

export const VENUE_RULES_WALL_RIGHT: VenueRulesWallColumn = {
  title: 'Joining the game',
  groups: [
    {
      title: 'On your phone',
      bullets: [
        'Scan the QR to join',
        'Bet and submit on your phone',
      ],
    },
    {
      title: 'Tables',
      bullets: [
        'Random seats when the host assigns tables',
        'Tables may combine as players bust out',
      ],
    },
  ],
}

export const VENUE_RULES_WALL_COLUMNS = [VENUE_RULES_WALL_RIGHT, VENUE_RULES_WALL_LEFT] as const
