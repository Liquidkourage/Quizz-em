/** Standard trivia-night set size — one rundown = this many cues. */
export const VENUE_QUESTION_SET_LENGTH = 25

export const STARTER_SETLIST_ID = 'starter-set'
export const STARTER_SETLIST_NAME = 'Starter set'

/** Default bank seeded for new venues and “Restore starter pack”. */
export const STARTER_QUESTION_SET: ReadonlyArray<{
  id: string
  text: string
  answer: number
  category?: string
  difficulty?: number
}> = [
  { id: 'q1', text: 'How many minutes are there in a day?', answer: 1440, category: 'Time', difficulty: 1 },
  { id: 'q2', text: 'What is the boiling point of water in Kelvin?', answer: 373, category: 'Science', difficulty: 1 },
  { id: 'q3', text: 'How many bones are in the adult human body?', answer: 206, category: 'Biology', difficulty: 2 },
  { id: 'q4', text: 'What year did Apollo 11 land on the Moon?', answer: 1969, category: 'History', difficulty: 2 },
  {
    id: 'q5',
    text: 'What is the average distance from Earth to the Moon in kilometers?',
    answer: 384400,
    category: 'Astronomy',
    difficulty: 3,
  },
  { id: 'q6', text: 'How many U.S. states are there?', answer: 50, category: 'Geography', difficulty: 1 },
  { id: 'q7', text: 'How many days are in a leap year?', answer: 366, category: 'Time', difficulty: 1 },
  { id: 'q8', text: 'How many seconds are in one hour?', answer: 3600, category: 'Time', difficulty: 1 },
  { id: 'q9', text: 'How many degrees are in a full circle?', answer: 360, category: 'Math', difficulty: 1 },
  { id: 'q10', text: 'How many planets are in our solar system?', answer: 8, category: 'Astronomy', difficulty: 1 },
  { id: 'q11', text: 'What is the maximum score in ten-pin bowling?', answer: 300, category: 'Sports', difficulty: 1 },
  { id: 'q12', text: 'How many keys does a standard piano have?', answer: 88, category: 'Music', difficulty: 2 },
  { id: 'q13', text: 'How many sides does a hexagon have?', answer: 6, category: 'Math', difficulty: 1 },
  {
    id: 'q14',
    text: 'How many elements are on the standard periodic table?',
    answer: 118,
    category: 'Science',
    difficulty: 2,
  },
  { id: 'q15', text: 'How many months in a year have 31 days?', answer: 7, category: 'Time', difficulty: 2 },
  { id: 'q16', text: 'In what year were the first Winter Olympics held?', answer: 1924, category: 'Sports', difficulty: 3 },
  { id: 'q17', text: 'How many adult teeth does a typical human have (including wisdom teeth)?', answer: 32, category: 'Biology', difficulty: 2 },
  { id: 'q18', text: 'What is the atomic number of gold?', answer: 79, category: 'Science', difficulty: 2 },
  { id: 'q19', text: 'How many sonnets did Shakespeare publish?', answer: 154, category: 'Literature', difficulty: 3 },
  {
    id: 'q20',
    text: 'What is the height of Mount Everest in meters (2020 survey)?',
    answer: 8849,
    category: 'Geography',
    difficulty: 3,
  },
  { id: 'q21', text: 'How many squares are on a chessboard?', answer: 64, category: 'Games', difficulty: 1 },
  { id: 'q22', text: 'How many minutes are in one week?', answer: 10080, category: 'Time', difficulty: 2 },
  { id: 'q23', text: 'How many faces does a standard die have?', answer: 6, category: 'Games', difficulty: 1 },
  { id: 'q24', text: 'How many stars are on the flag of the European Union?', answer: 12, category: 'Geography', difficulty: 2 },
  { id: 'q25', text: 'How many yards are in an American football field (including end zones)?', answer: 120, category: 'Sports', difficulty: 2 },
]

export function formatSetlistProgress(cueCount: number, target = VENUE_QUESTION_SET_LENGTH): string {
  const n = Math.max(0, Math.floor(cueCount))
  return `${n}/${target}`
}

export function isSetlistTargetLength(cueCount: number, target = VENUE_QUESTION_SET_LENGTH): boolean {
  return Math.floor(cueCount) === target
}

export function createStarterSetlist(
  questions: ReadonlyArray<{ id: string }> = STARTER_QUESTION_SET,
): { id: string; name: string; questionIds: string[] } {
  return {
    id: STARTER_SETLIST_ID,
    name: STARTER_SETLIST_NAME,
    questionIds: questions.map((q) => q.id),
  }
}
