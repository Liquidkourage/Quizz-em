export type VenueSeatingRulesSection = {
  title: string
  bullets: string[]
}

/** Copy for the public-display seating & tables explainer (hosts + players). */
export const VENUE_SEATING_RULES_HEADLINE = 'Tables & seating'

export const VENUE_SEATING_RULES_LEAD =
  'When the host assigns seating, everyone is shuffled randomly into tables — your phone shows your table number.'

export const VENUE_SEATING_RULES_SECTIONS: VenueSeatingRulesSection[] = [
  {
    title: 'Through the night',
    bullets: [
      'You keep the same table almost all night.',
      'Bust and you are out.',
      'As the field shrinks, the room may shuffle a few people or combine tables — a full re-seat for everyone is rare.',
    ],
  },
]
