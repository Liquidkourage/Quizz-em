export type VenueSeatingRulesSection = {
  title: string
  bullets: string[]
}

/** Copy for the public-display seating & tables explainer (hosts + players). */
export const VENUE_SEATING_RULES_SECTIONS: VenueSeatingRulesSection[] = [
  {
    title: 'Getting started',
    bullets: [
      'Join the venue lobby on your phone — you are not at a table yet.',
      'When the host assigns seating, the room picks how many tables are needed (about six people per table, never more than eight).',
      'Everyone is shuffled randomly into tables — you do not pick your table.',
      'Your phone then shows your table number for the night.',
    ],
  },
  {
    title: 'During the game',
    bullets: [
      'You usually stay at the same table from question to question.',
      'All tables run in sync with the host — answer and bet on the same beat.',
      'If you bust (chips hit zero), you are out after that round finishes.',
      'Staying in means keeping your seat unless the venue needs a small seating fix.',
    ],
  },
  {
    title: 'After each round',
    bullets: [
      'Lonely table fix: if you are the only player left at a table, you move to another table with room and that table closes.',
      'Light rebalancing: a few people may move to even out table sizes — most players stay put.',
      'Closing quiet tables: the smallest tables may close (up to about two per round) and those players join other tables.',
      'Big re-seat (rare): if the room is still too spread out, everyone may get a new random table — uncommon, not every round.',
    ],
  },
  {
    title: 'On screen & on your phone',
    bullets: [
      '“X remaining” is how many players are still in.',
      '“Re-seating at Y” is the player count where a major combine may happen — if the room still needs it.',
      'If you are moved, your phone updates automatically — check your table number after each round.',
      'Table closed on your phone? You were moved, not eliminated. Busting is the only way out.',
    ],
  },
]

export const VENUE_SEATING_RULES_HEADLINE = 'Tables & seating — how tonight works'
export const VENUE_SEATING_RULES_TAGLINE =
  'Most players keep the same table all night. Moves are small and infrequent unless the room needs a big combine.'
