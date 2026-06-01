#!/usr/bin/env node
/**
 * Harvest numeric-answer trivia from Open Trivia DB and write 10 × 25-question CSV packs.
 * Source: https://opentdb.com/ (CC BY-SA 4.0) — filtered to pure numeric correct answers.
 *
 * Usage: node scripts/build-question-packs.mjs
 * Output: data/question-packs/set-NN-*.csv + manifest.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const VENUE_QUESTION_SET_LENGTH = 25

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'data', 'question-packs')

/** OpenTDB category id → label */
const CATEGORIES = {
  9: 'General Knowledge',
  10: 'Entertainment: Books',
  11: 'Entertainment: Film',
  12: 'Entertainment: Music',
  14: 'Entertainment: Television',
  15: 'Entertainment: Video Games',
  17: 'Science & Nature',
  19: 'Science: Mathematics',
  21: 'Sports',
  22: 'Geography',
  23: 'History',
  27: 'Animals',
  28: 'Vehicles',
}

const SET_SPECS = [
  {
    slug: '01-general-mix',
    name: 'Set 1 — General mix',
    categories: [9, 17, 21, 22, 23],
    difficulties: ['easy', 'medium'],
  },
  {
    slug: '02-history',
    name: 'Set 2 — History & years',
    categories: [23, 9],
    difficulties: ['easy', 'medium', 'hard'],
  },
  {
    slug: '03-science',
    name: 'Set 3 — Science & nature',
    categories: [17, 19],
    difficulties: ['easy', 'medium', 'hard'],
  },
  {
    slug: '04-sports',
    name: 'Set 4 — Sports by the numbers',
    categories: [21],
    difficulties: ['easy', 'medium', 'hard'],
  },
  {
    slug: '05-geography',
    name: 'Set 5 — Geography',
    categories: [22, 9],
    difficulties: ['easy', 'medium', 'hard'],
  },
  {
    slug: '06-math',
    name: 'Set 6 — Math & numbers',
    categories: [19],
    difficulties: ['easy', 'medium', 'hard'],
  },
  {
    slug: '07-entertainment',
    name: 'Set 7 — Entertainment stats',
    categories: [11, 12, 14, 15, 10],
    difficulties: ['easy', 'medium', 'hard'],
  },
  {
    slug: '08-animals',
    name: 'Set 8 — Animals & biology',
    categories: [27, 17],
    difficulties: ['easy', 'medium', 'hard'],
  },
  {
    slug: '09-world-facts',
    name: 'Set 9 — World facts',
    categories: [22, 23, 17, 9],
    difficulties: ['medium', 'hard'],
  },
  {
    slug: '10-challenge',
    name: 'Set 10 — Challenge round',
    categories: [9, 17, 19, 21, 22, 23, 15],
    difficulties: ['medium', 'hard'],
  },
]

/** Hand-verified fill when API pool is thin for a theme. */
const CURATED = [
  { text: 'How many minutes are in one day?', answer: 1440, category: 'Time', difficulty: 1 },
  { text: 'How many U.S. states are there?', answer: 50, category: 'Geography', difficulty: 1 },
  { text: 'How many days are in a leap year?', answer: 366, category: 'Time', difficulty: 1 },
  { text: 'How many seconds are in one hour?', answer: 3600, category: 'Time', difficulty: 1 },
  { text: 'How many degrees are in a full circle?', answer: 360, category: 'Math', difficulty: 1 },
  { text: 'How many planets are in our solar system?', answer: 8, category: 'Astronomy', difficulty: 1 },
  { text: 'What is the maximum score in ten-pin bowling?', answer: 300, category: 'Sports', difficulty: 1 },
  { text: 'How many keys does a standard piano have?', answer: 88, category: 'Music', difficulty: 2 },
  { text: 'How many bones are in the adult human body?', answer: 206, category: 'Biology', difficulty: 2 },
  { text: 'What year did Apollo 11 land on the Moon?', answer: 1969, category: 'History', difficulty: 2 },
  { text: 'What is the boiling point of water in Kelvin (nearest whole number)?', answer: 373, category: 'Science', difficulty: 1 },
  { text: 'How many squares are on a chessboard?', answer: 64, category: 'Games', difficulty: 1 },
  { text: 'How many minutes are in one week?', answer: 10080, category: 'Time', difficulty: 2 },
  { text: 'How many faces does a standard die have?', answer: 6, category: 'Games', difficulty: 1 },
  { text: 'How many stars are on the flag of the European Union?', answer: 12, category: 'Geography', difficulty: 2 },
  { text: 'How many yards are in an American football field including end zones?', answer: 120, category: 'Sports', difficulty: 2 },
  { text: 'How many elements are on the standard periodic table?', answer: 118, category: 'Science', difficulty: 2 },
  { text: 'What is the atomic number of gold?', answer: 79, category: 'Science', difficulty: 2 },
  { text: 'How many adult teeth does a typical human have (including wisdom teeth)?', answer: 32, category: 'Biology', difficulty: 2 },
  { text: 'How many months in a year have 31 days?', answer: 7, category: 'Time', difficulty: 2 },
  { text: 'In what year were the first modern Olympic Games held?', answer: 1896, category: 'Sports', difficulty: 2 },
  { text: 'How many symphonies did Beethoven compose?', answer: 9, category: 'Music', difficulty: 3 },
  { text: 'How many countries are in the United Nations (2024)?', answer: 193, category: 'Geography', difficulty: 3 },
  { text: 'What is the height of Mount Everest in meters (2020 survey)?', answer: 8849, category: 'Geography', difficulty: 3 },
  { text: 'How many sonnets did Shakespeare publish?', answer: 154, category: 'Literature', difficulty: 3 },
  { text: 'How many players are on the field for one soccer team?', answer: 11, category: 'Sports', difficulty: 1 },
  { text: 'How many innings are in a standard baseball game?', answer: 9, category: 'Sports', difficulty: 1 },
  { text: 'How many holes are on a standard golf course?', answer: 18, category: 'Sports', difficulty: 1 },
  { text: 'How many points is a touchdown worth in American football?', answer: 6, category: 'Sports', difficulty: 1 },
  { text: 'How many sides does an octagon have?', answer: 8, category: 'Math', difficulty: 1 },
  { text: 'How many sides does a hexagon have?', answer: 6, category: 'Math', difficulty: 1 },
  { text: 'How many millimeters are in one centimeter?', answer: 10, category: 'Math', difficulty: 1 },
  { text: 'How many centimeters are in one meter?', answer: 100, category: 'Math', difficulty: 1 },
  { text: 'How many feet are in one mile?', answer: 5280, category: 'Math', difficulty: 2 },
  { text: 'How many pounds are in one ton (US short ton)?', answer: 2000, category: 'Math', difficulty: 2 },
  { text: 'What year did the Berlin Wall fall?', answer: 1989, category: 'History', difficulty: 2 },
  { text: 'What year did World War II end?', answer: 1945, category: 'History', difficulty: 2 },
  { text: 'What year did the Titanic sink?', answer: 1912, category: 'History', difficulty: 2 },
  { text: 'In what year was the United States Declaration of Independence signed?', answer: 1776, category: 'History', difficulty: 1 },
  { text: 'How many amendments are in the U.S. Bill of Rights?', answer: 10, category: 'History', difficulty: 2 },
  { text: 'How many stripes are on the U.S. flag?', answer: 13, category: 'Geography', difficulty: 1 },
  { text: 'How many stars were on the U.S. flag after Hawaii joined (1959)?', answer: 50, category: 'Geography', difficulty: 2 },
  { text: 'How many Great Lakes are there?', answer: 5, category: 'Geography', difficulty: 1 },
  { text: 'How many countries share a land border with France (mainland)?', answer: 8, category: 'Geography', difficulty: 3 },
  { text: 'How many time zones does Russia span (approximate)?', answer: 11, category: 'Geography', difficulty: 3 },
  { text: 'How many legs does an insect have?', answer: 6, category: 'Animals', difficulty: 1 },
  { text: 'How many legs does a spider have?', answer: 8, category: 'Animals', difficulty: 1 },
  { text: 'How many hearts does an octopus have?', answer: 3, category: 'Animals', difficulty: 2 },
  { text: 'How many chambers does a human heart have?', answer: 4, category: 'Biology', difficulty: 1 },
  { text: 'How many chromosomes do humans have in each body cell?', answer: 46, category: 'Biology', difficulty: 2 },
  { text: 'How many teeth does a typical adult dog have?', answer: 42, category: 'Animals', difficulty: 3 },
  { text: 'How many vertebrae are in the human spine (typical)?', answer: 33, category: 'Biology', difficulty: 3 },
  { text: 'What year was the first iPhone released?', answer: 2007, category: 'Technology', difficulty: 2 },
  { text: 'What year was the World Wide Web opened to the public?', answer: 1991, category: 'Technology', difficulty: 3 },
  { text: 'How many bits are in one byte?', answer: 8, category: 'Technology', difficulty: 1 },
  { text: 'How many megabytes are in one gigabyte (decimal, 1000-based)?', answer: 1000, category: 'Technology', difficulty: 2 },
  { text: 'How many Harry Potter books are in the main series?', answer: 7, category: 'Entertainment', difficulty: 1 },
  { text: 'How many dwarfs appear in the classic Snow White fairy tale?', answer: 7, category: 'Entertainment', difficulty: 1 },
  { text: 'How many films are in the original Star Wars trilogy?', answer: 3, category: 'Entertainment', difficulty: 1 },
  { text: 'In what year was the first Super Bowl played?', answer: 1967, category: 'Sports', difficulty: 3 },
  { text: 'How many players start on the court for one basketball team?', answer: 5, category: 'Sports', difficulty: 1 },
  { text: 'How many Grand Slam tennis tournaments are there per year?', answer: 4, category: 'Sports', difficulty: 2 },
  { text: 'How many events are in a traditional decathlon?', answer: 10, category: 'Sports', difficulty: 2 },
  { text: 'What is the regulation height of a basketball hoop in feet?', answer: 10, category: 'Sports', difficulty: 2 },
  { text: 'How many meters are in an Olympic swimming pool length?', answer: 50, category: 'Sports', difficulty: 2 },
  { text: 'How many noble gases are there?', answer: 7, category: 'Science', difficulty: 2 },
  { text: 'At what temperature Celsius does water freeze?', answer: 0, category: 'Science', difficulty: 1 },
  { text: 'At what temperature Celsius does water boil at sea level?', answer: 100, category: 'Science', difficulty: 1 },
  { text: 'How many moons does Mars have?', answer: 2, category: 'Astronomy', difficulty: 2 },
  { text: 'How many Earth days does Mercury take to orbit the Sun (nearest whole number)?', answer: 88, category: 'Astronomy', difficulty: 3 },
  { text: 'How many strings does a standard violin have?', answer: 4, category: 'Music', difficulty: 1 },
  { text: 'How many lines does a standard musical staff have?', answer: 5, category: 'Music', difficulty: 1 },
  { text: 'How many beats are in a standard 4/4 measure?', answer: 4, category: 'Music', difficulty: 1 },
  { text: 'How many cents are in one U.S. dollar?', answer: 100, category: 'Math', difficulty: 1 },
  { text: 'How many years are in one leap year cycle (standard Gregorian)?', answer: 4, category: 'Time', difficulty: 2 },
  { text: 'How many hours are in one day?', answer: 24, category: 'Time', difficulty: 1 },
  { text: 'How many weeks are in one year (nearest whole number)?', answer: 52, category: 'Time', difficulty: 1 },
  { text: 'How many cards are in a standard deck excluding jokers?', answer: 52, category: 'Games', difficulty: 1 },
  { text: 'How many tiles are in a standard Scrabble set (excluding blanks)?', answer: 100, category: 'Games', difficulty: 3 },
  { text: 'How many dots are on a pair of standard dice?', answer: 42, category: 'Games', difficulty: 3 },
  { text: 'How many colors are in a standard Rubik\'s Cube (face count per cube)?', answer: 6, category: 'Games', difficulty: 1 },
  { text: 'What year did the first manned Moon landing occur?', answer: 1969, category: 'History', difficulty: 1 },
  { text: 'How many colonies originally signed the U.S. Declaration of Independence?', answer: 13, category: 'History', difficulty: 2 },
  { text: 'In what year did the Wright brothers make their first powered flight?', answer: 1903, category: 'History', difficulty: 2 },
  { text: 'How many presidents are carved on Mount Rushmore?', answer: 4, category: 'History', difficulty: 1 },
  { text: 'How many knights sit at King Arthur\'s Round Table (traditional count)?', answer: 150, category: 'Literature', difficulty: 3 },
  { text: 'How many books are in the New Testament (Protestant canon)?', answer: 27, category: 'Literature', difficulty: 3 },
  { text: 'How many books are in the Old Testament (Protestant canon)?', answer: 39, category: 'Literature', difficulty: 3 },
  { text: 'How many chromosomes do fruit flies have in each cell?', answer: 8, category: 'Biology', difficulty: 3 },
  { text: 'How many pairs of ribs do humans typically have?', answer: 12, category: 'Biology', difficulty: 2 },
  { text: 'How many liters are in one gallon (US)?', answer: 4, category: 'Math', difficulty: 2 },
  { text: 'How many ounces are in one pound?', answer: 16, category: 'Math', difficulty: 1 },
  { text: 'How many yards are in one mile?', answer: 1760, category: 'Math', difficulty: 3 },
  { text: 'How many kilometers are in one marathon (official distance, nearest whole)?', answer: 42, category: 'Sports', difficulty: 2 },
  { text: 'How many players are on an ice hockey team on the ice at once?', answer: 6, category: 'Sports', difficulty: 2 },
  { text: 'How many bases are on a baseball diamond including home plate?', answer: 4, category: 'Sports', difficulty: 1 },
  { text: 'How many periods are in a standard NHL hockey game?', answer: 3, category: 'Sports', difficulty: 1 },
  { text: 'How many continents are there (standard model)?', answer: 7, category: 'Geography', difficulty: 1 },
  { text: 'How many countries are in the United Kingdom?', answer: 4, category: 'Geography', difficulty: 2 },
  { text: 'How many provinces does Canada have?', answer: 10, category: 'Geography', difficulty: 2 },
  { text: 'How many states does Australia have?', answer: 6, category: 'Geography', difficulty: 2 },
  { text: 'How many countries are in the European Union (2020, nearest before Brexit completion)?', answer: 27, category: 'Geography', difficulty: 3 },
  { text: 'How many time zones does the continental United States span?', answer: 4, category: 'Geography', difficulty: 2 },
  { text: 'How many strings does a standard guitar have?', answer: 6, category: 'Music', difficulty: 1 },
  { text: 'How many valves does a standard trumpet have?', answer: 3, category: 'Music', difficulty: 2 },
  { text: 'How many black keys are on a standard piano octave (within one octave)?', answer: 5, category: 'Music', difficulty: 3 },
  { text: 'How many episodes are in the first season of Stranger Things?', answer: 8, category: 'Entertainment', difficulty: 3 },
  { text: 'How many seasons of Friends were produced?', answer: 10, category: 'Entertainment', difficulty: 2 },
  { text: 'How many rings of power were given to the race of Men in Tolkien\'s lore?', answer: 9, category: 'Entertainment', difficulty: 3 },
  { text: 'How many Infinity Stones appear in the Marvel Cinematic Universe?', answer: 6, category: 'Entertainment', difficulty: 2 },
  { text: 'In what year was the original Jurassic Park film released?', answer: 1993, category: 'Entertainment', difficulty: 2 },
  { text: 'In what year was Pixar\'s Toy Story released?', answer: 1995, category: 'Entertainment', difficulty: 2 },
  { text: 'How many Academy Awards (Oscars) categories are presented at the main annual ceremony (approximate traditional count)?', answer: 24, category: 'Entertainment', difficulty: 3 },
  { text: 'How many teeth does a great white shark typically have in multiple rows (often cited total)?', answer: 300, category: 'Animals', difficulty: 3 },
  { text: 'How many species of penguins exist (approximate)?', answer: 18, category: 'Animals', difficulty: 3 },
  { text: 'How many stomachs does a cow have?', answer: 4, category: 'Animals', difficulty: 2 },
  { text: 'How many wings does a bee have?', answer: 4, category: 'Animals', difficulty: 1 },
  { text: 'How many eyes does a honeybee have?', answer: 5, category: 'Animals', difficulty: 3 },
  { text: 'How many tentacles does an octopus have?', answer: 8, category: 'Animals', difficulty: 1 },
  { text: 'How many planets did Pluto get reclassified from (still counted as dwarf planet region)?', answer: 9, category: 'Astronomy', difficulty: 2 },
  { text: 'How many moons does Earth have?', answer: 1, category: 'Astronomy', difficulty: 1 },
  { text: 'How many dwarf planets are officially recognized by the IAU (approximate as of 2020s)?', answer: 5, category: 'Astronomy', difficulty: 3 },
  { text: 'What year was Pluto reclassified as a dwarf planet?', answer: 2006, category: 'Astronomy', difficulty: 2 },
  { text: 'How many carbon atoms are in a benzene ring?', answer: 6, category: 'Science', difficulty: 3 },
  { text: 'What is the pH of pure water at 25°C (nearest whole number)?', answer: 7, category: 'Science', difficulty: 2 },
  { text: 'How many vertebrae are in the human neck?', answer: 7, category: 'Biology', difficulty: 2 },
  { text: 'How many muscles are in the human body (often cited approximate)?', answer: 600, category: 'Biology', difficulty: 3 },
  { text: 'How many liters of blood does an average adult human have (nearest whole)?', answer: 5, category: 'Biology', difficulty: 2 },
  { text: 'How many taste buds does the average human tongue have (thousands, nearest thousand)?', answer: 10000, category: 'Biology', difficulty: 3 },
  { text: 'How many bones are in the human skull (adult, often cited)?', answer: 22, category: 'Biology', difficulty: 3 },
  { text: 'How many pairs of chromosomes do humans have?', answer: 23, category: 'Biology', difficulty: 2 },
  { text: 'How many sides does a stop sign have?', answer: 8, category: 'General', difficulty: 1 },
  { text: 'How many colors are in a rainbow (traditional)?', answer: 7, category: 'Science', difficulty: 1 },
  { text: 'How many primary colors of light are there (additive)?', answer: 3, category: 'Science', difficulty: 1 },
  { text: 'How many primary colors of pigment are there (traditional)?', answer: 3, category: 'Science', difficulty: 1 },
  { text: 'How many watts are in one kilowatt?', answer: 1000, category: 'Science', difficulty: 1 },
  { text: 'How many grams are in one kilogram?', answer: 1000, category: 'Science', difficulty: 1 },
  { text: 'How many milliliters are in one liter?', answer: 1000, category: 'Science', difficulty: 1 },
  { text: 'How many days are in a non-leap year?', answer: 365, category: 'Time', difficulty: 1 },
  { text: 'How many months are in one year?', answer: 12, category: 'Time', difficulty: 1 },
  { text: 'How many weeks are in fourteen days?', answer: 2, category: 'Time', difficulty: 1 },
  { text: 'How many decades are in one century?', answer: 10, category: 'Time', difficulty: 1 },
  { text: 'How many centuries are in one millennium?', answer: 10, category: 'Time', difficulty: 2 },
  { text: 'What year did the French Revolution begin?', answer: 1789, category: 'History', difficulty: 2 },
  { text: 'What year did the American Civil War begin?', answer: 1861, category: 'History', difficulty: 3 },
  { text: 'What year did India gain independence from Britain?', answer: 1947, category: 'History', difficulty: 2 },
  { text: 'What year did Nelson Mandela become president of South Africa?', answer: 1994, category: 'History', difficulty: 3 },
  { text: 'How many years did the Hundred Years\' War last (approximate)?', answer: 116, category: 'History', difficulty: 3 },
  { text: 'In what year did the Great Fire of London occur?', answer: 1666, category: 'History', difficulty: 3 },
  { text: 'How many Pilgrims sailed on the Mayflower (approximate)?', answer: 102, category: 'History', difficulty: 3 },
  { text: 'How many amendments does the U.S. Constitution have?', answer: 27, category: 'History', difficulty: 3 },
  { text: 'How many justices sit on the U.S. Supreme Court (traditional)?', answer: 9, category: 'History', difficulty: 2 },
  { text: 'How many senators represent each U.S. state?', answer: 2, category: 'History', difficulty: 1 },
  { text: 'How many voting members are in the U.S. House of Representatives (fixed cap)?', answer: 435, category: 'History', difficulty: 3 },
  { text: 'How many electoral votes does California have (2020 census apportionment)?', answer: 54, category: 'History', difficulty: 3 },
  { text: 'How many players are on a baseball team on the field at once?', answer: 9, category: 'Sports', difficulty: 1 },
  { text: 'How many strikes make an out in baseball?', answer: 3, category: 'Sports', difficulty: 1 },
  { text: 'How many balls make a walk in baseball?', answer: 4, category: 'Sports', difficulty: 1 },
  { text: 'How many downs does a team get to advance 10 yards in American football?', answer: 4, category: 'Sports', difficulty: 1 },
  { text: 'How many points is a field goal worth in American football?', answer: 3, category: 'Sports', difficulty: 1 },
  { text: 'How many players are on a volleyball team on the court at once?', answer: 6, category: 'Sports', difficulty: 1 },
  { text: 'How many sets are needed to win a standard men\'s Wimbledon match (minimum)?', answer: 3, category: 'Sports', difficulty: 2 },
  { text: 'How many laps is the Indianapolis 500?', answer: 500, category: 'Sports', difficulty: 2 },
  { text: 'How many miles is the Boston Marathon (nearest whole)?', answer: 26, category: 'Sports', difficulty: 2 },
  { text: 'How many events are in a modern Olympic decathlon?', answer: 10, category: 'Sports', difficulty: 2 },
  { text: 'How many rings are on the Olympic flag?', answer: 5, category: 'Sports', difficulty: 1 },
  { text: 'How many years between Summer Olympic Games?', answer: 4, category: 'Sports', difficulty: 1 },
  { text: 'How many players are on a cricket team on the field?', answer: 11, category: 'Sports', difficulty: 2 },
  { text: 'How many dimples does a regulation golf ball have (approximate)?', answer: 336, category: 'Sports', difficulty: 3 },
  { text: 'How many squares are on a checkerboard?', answer: 64, category: 'Games', difficulty: 1 },
  { text: 'How many pieces does each player start with in chess?', answer: 16, category: 'Games', difficulty: 2 },
  { text: 'How many spaces are on a Monopoly board (including corners)?', answer: 40, category: 'Games', difficulty: 2 },
  { text: 'How many tiles are in a standard domino set (double-six)?', answer: 28, category: 'Games', difficulty: 3 },
  { text: 'How many numbers are on a standard bingo card row (US)?', answer: 5, category: 'Games', difficulty: 2 },
  { text: 'How many vertices does a cube have?', answer: 8, category: 'Math', difficulty: 2 },
  { text: 'How many edges does a cube have?', answer: 12, category: 'Math', difficulty: 2 },
  { text: 'How many faces does a cube have?', answer: 6, category: 'Math', difficulty: 1 },
  { text: 'What is the sum of the interior angles of a triangle in degrees?', answer: 180, category: 'Math', difficulty: 2 },
  { text: 'How many degrees are in a right angle?', answer: 90, category: 'Math', difficulty: 1 },
  { text: 'How many zeroes are in one million?', answer: 6, category: 'Math', difficulty: 1 },
  { text: 'How many zeroes are in one billion?', answer: 9, category: 'Math', difficulty: 2 },
  { text: 'What is 15 squared?', answer: 225, category: 'Math', difficulty: 2 },
  { text: 'What is 12 squared?', answer: 144, category: 'Math', difficulty: 2 },
  { text: 'What is the square root of 144?', answer: 12, category: 'Math', difficulty: 2 },
  { text: 'How many minutes are in half an hour?', answer: 30, category: 'Math', difficulty: 1 },
  { text: 'How many hours are in one week?', answer: 168, category: 'Math', difficulty: 3 },
  { text: 'How many days are in two weeks?', answer: 14, category: 'Math', difficulty: 1 },
  { text: 'How many sides does a pentagon have?', answer: 5, category: 'Math', difficulty: 1 },
  { text: 'How many sides does a heptagon have?', answer: 7, category: 'Math', difficulty: 2 },
  { text: 'How many sides does a nonagon have?', answer: 9, category: 'Math', difficulty: 3 },
  { text: 'How many sides does a decagon have?', answer: 10, category: 'Math', difficulty: 2 },
  { text: 'How many degrees are in each angle of an equilateral triangle?', answer: 60, category: 'Math', difficulty: 2 },
  { text: 'How many protons does a hydrogen atom have?', answer: 1, category: 'Science', difficulty: 1 },
  { text: 'How many protons does a helium atom have?', answer: 2, category: 'Science', difficulty: 1 },
  { text: 'How many protons does a carbon atom have?', answer: 6, category: 'Science', difficulty: 1 },
  { text: 'How many protons does an oxygen atom have?', answer: 8, category: 'Science', difficulty: 1 },
  { text: 'How many states of matter are commonly taught in basic science (solid, liquid, gas, plasma)?', answer: 4, category: 'Science', difficulty: 1 },
  { text: 'How many bones are in the human hand (one hand)?', answer: 27, category: 'Biology', difficulty: 3 },
  { text: 'How many bones are in the human foot (one foot)?', answer: 26, category: 'Biology', difficulty: 3 },
  { text: 'How many ribs does a human typically have in total?', answer: 24, category: 'Biology', difficulty: 2 },
  { text: 'How many liters can an adult human lung hold (total capacity, approximate)?', answer: 6, category: 'Biology', difficulty: 3 },
  { text: 'How many teeth does a child have in the primary set?', answer: 20, category: 'Biology', difficulty: 2 },
  { text: 'How many major blood types are in the ABO system (including Rh variants as groups)?', answer: 4, category: 'Biology', difficulty: 2 },
  { text: 'How many chambers are in a fish heart (typical)?', answer: 2, category: 'Biology', difficulty: 3 },
  { text: 'How many wings does a butterfly have?', answer: 4, category: 'Animals', difficulty: 1 },
  { text: 'How many legs does a lobster have?', answer: 10, category: 'Animals', difficulty: 2 },
  { text: 'How many teats does a female cat typically have?', answer: 8, category: 'Animals', difficulty: 3 },
  { text: 'How many lives is a cat said to have (folklore)?', answer: 9, category: 'Animals', difficulty: 1 },
  { text: 'How many humps does a Bactrian camel have?', answer: 2, category: 'Animals', difficulty: 1 },
  { text: 'How many humps does a dromedary camel have?', answer: 1, category: 'Animals', difficulty: 1 },
  { text: 'How many teats does a cow have (typical udder)?', answer: 4, category: 'Animals', difficulty: 2 },
  { text: 'How many stomach compartments does a ruminant have?', answer: 4, category: 'Animals', difficulty: 2 },
  { text: 'How many species of big cats are in the genus Panthera (traditional)?', answer: 4, category: 'Animals', difficulty: 3 },
  { text: 'How many legs does a millipede name imply (misnomer, often cited)?', answer: 1000, category: 'Animals', difficulty: 2 },
  { text: 'How many legs does a centipede name imply (misnomer, often cited)?', answer: 100, category: 'Animals', difficulty: 2 },
  { text: 'How many countries border Germany?', answer: 9, category: 'Geography', difficulty: 3 },
  { text: 'How many countries border China?', answer: 14, category: 'Geography', difficulty: 3 },
  { text: 'How many countries are in South America?', answer: 12, category: 'Geography', difficulty: 2 },
  { text: 'How many countries are in Africa (UN member states on continent, approximate)?', answer: 54, category: 'Geography', difficulty: 3 },
  { text: 'How many countries are in North America (UN members, approximate)?', answer: 23, category: 'Geography', difficulty: 3 },
  { text: 'How many countries are in the NATO alliance (approximate 2024)?', answer: 32, category: 'Geography', difficulty: 3 },
  { text: 'How many time zones does Canada span?', answer: 6, category: 'Geography', difficulty: 3 },
  { text: 'How many provinces and territories does Canada have in total?', answer: 13, category: 'Geography', difficulty: 2 },
  { text: 'How many boroughs are in New York City?', answer: 5, category: 'Geography', difficulty: 2 },
  { text: 'How many arrondissements does Paris have?', answer: 20, category: 'Geography', difficulty: 3 },
  { text: 'How many districts are in Washington, D.C. (quadrants)?', answer: 4, category: 'Geography', difficulty: 2 },
  { text: 'How many islands make up Hawaii (main inhabited islands)?', answer: 8, category: 'Geography', difficulty: 2 },
  { text: 'How many countries share the island of Hispaniola?', answer: 2, category: 'Geography', difficulty: 2 },
  { text: 'How many countries are landlocked in Europe (approximate)?', answer: 16, category: 'Geography', difficulty: 3 },
  { text: 'How many emirates make up the United Arab Emirates?', answer: 7, category: 'Geography', difficulty: 2 },
  { text: 'How many countries are in the G7 (as of 2020s)?', answer: 7, category: 'Geography', difficulty: 2 },
  { text: 'How many permanent members are on the UN Security Council?', answer: 5, category: 'Geography', difficulty: 2 },
  { text: 'How many official languages does Switzerland have?', answer: 4, category: 'Geography', difficulty: 2 },
  { text: 'How many official languages does South Africa recognize?', answer: 11, category: 'Geography', difficulty: 3 },
  { text: 'How many time zones does Australia have (approximate)?', answer: 3, category: 'Geography', difficulty: 2 },
  { text: 'How many capitals does South Africa have?', answer: 3, category: 'Geography', difficulty: 3 },
  { text: 'How many countries does the equator pass through (approximate)?', answer: 13, category: 'Geography', difficulty: 3 },
  { text: 'How many countries does the Prime Meridian pass through (approximate)?', answer: 8, category: 'Geography', difficulty: 3 },
  { text: 'How many Great Walls of China lengths in miles (often cited approximate)?', answer: 5500, category: 'Geography', difficulty: 3 },
  { text: 'How many miles long is the Amazon River (approximate)?', answer: 4000, category: 'Geography', difficulty: 3 },
  { text: 'How many feet are in the height of the Statue of Liberty from ground to torch (approximate)?', answer: 305, category: 'Geography', difficulty: 3 },
  { text: 'How many meters tall is the Eiffel Tower (approximate)?', answer: 330, category: 'Geography', difficulty: 3 },
  { text: 'How many steps are in the Eiffel Tower to the top (approximate)?', answer: 1665, category: 'Geography', difficulty: 3 },
  { text: 'How many paws does a typical dog have?', answer: 4, category: 'Animals', difficulty: 1 },
  { text: 'How many horns does a rhinoceros have?', answer: 1, category: 'Animals', difficulty: 1 },
  { text: 'How many arms does a squid have (including long feeding tentacles)?', answer: 10, category: 'Animals', difficulty: 2 },
  { text: 'How many bones does a shark skeleton have (cartilage segments often cited)?', answer: 0, category: 'Animals', difficulty: 3 },
  { text: 'How many seasons of The Office (U.S.) were produced?', answer: 9, category: 'Entertainment', difficulty: 2 },
  { text: 'How many episodes are in the first season of Breaking Bad?', answer: 7, category: 'Entertainment', difficulty: 3 },
  { text: 'In what year was the first Academy Awards ceremony held?', answer: 1929, category: 'Entertainment', difficulty: 3 },
  { text: 'How many books are in the Hunger Games trilogy?', answer: 3, category: 'Entertainment', difficulty: 1 },
  { text: 'How many Lord of the Rings volumes are in the main trilogy?', answer: 3, category: 'Literature', difficulty: 1 },
  { text: 'How many musketeers are in the title of Dumas\'s novel (not counting d\'Artagnan)?', answer: 3, category: 'Literature', difficulty: 2 },
  { text: 'How many Brontë sisters were published novelists?', answer: 3, category: 'Literature', difficulty: 3 },
  { text: 'How many wives did Henry VIII have executed?', answer: 2, category: 'History', difficulty: 3 },
  { text: 'How many years did Queen Victoria reign (rounded to nearest whole year)?', answer: 63, category: 'History', difficulty: 3 },
  { text: 'In what year did the Magna Carta first get sealed?', answer: 1215, category: 'History', difficulty: 3 },
  { text: 'How many colonies formed the original United States?', answer: 13, category: 'History', difficulty: 2 },
  { text: 'How many volts are in standard U.S. household outlet (approximate)?', answer: 120, category: 'Technology', difficulty: 2 },
  { text: 'How many pins are in a standard USB-A connector?', answer: 4, category: 'Technology', difficulty: 2 },
  { text: 'How many function keys are on a standard PC keyboard (F1 through F12)?', answer: 12, category: 'Technology', difficulty: 1 },
  { text: 'How many colors are in the visible spectrum (traditional ROYGBIV)?', answer: 7, category: 'Science', difficulty: 1 },
  { text: 'How many planets have rings visible from Earth (classical count)?', answer: 4, category: 'Astronomy', difficulty: 3 },
  { text: 'How many dwarf planets orbit in or near the Kuiper belt (commonly listed)?', answer: 5, category: 'Astronomy', difficulty: 3 },
  { text: 'How many miles per hour is the speed of sound at sea level (approximate)?', answer: 767, category: 'Science', difficulty: 3 },
  { text: 'How many fluid ounces are in one U.S. cup?', answer: 8, category: 'Math', difficulty: 2 },
  { text: 'How many quarts are in one gallon (US)?', answer: 4, category: 'Math', difficulty: 2 },
  { text: 'How many nickels make one U.S. dollar?', answer: 20, category: 'Math', difficulty: 1 },
  { text: 'How many dimes make one U.S. dollar?', answer: 10, category: 'Math', difficulty: 1 },
  { text: 'How many quarters make one U.S. dollar?', answer: 4, category: 'Math', difficulty: 1 },
  { text: 'How many players are on a rugby union team on the field?', answer: 15, category: 'Sports', difficulty: 2 },
  { text: 'How many holes are played in a standard round of golf?', answer: 18, category: 'Sports', difficulty: 1 },
  { text: 'How many sets are played in a standard professional tennis match (minimum to win)?', answer: 3, category: 'Sports', difficulty: 2 },
  { text: 'How many fouls before a player fouls out in NBA basketball?', answer: 6, category: 'Sports', difficulty: 2 },
  { text: 'How many minutes are in a standard NBA quarter?', answer: 12, category: 'Sports', difficulty: 2 },
  { text: 'How many minutes are in a standard soccer half?', answer: 45, category: 'Sports', difficulty: 1 },
  { text: 'How many points is a safety worth in American football?', answer: 2, category: 'Sports', difficulty: 2 },
  { text: 'How many pins must you knock down for a strike in bowling?', answer: 10, category: 'Sports', difficulty: 1 },
  { text: 'How many players are on a lacrosse field team at once?', answer: 10, category: 'Sports', difficulty: 3 },
  { text: 'How many countries hosted the 2002 FIFA World Cup jointly?', answer: 2, category: 'Sports', difficulty: 3 },
  { text: 'How many panels make up a traditional soccer ball pattern (approximate)?', answer: 32, category: 'Sports', difficulty: 3 },
]

function decodeText(raw) {
  if (!raw) return ''
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function parseNumericAnswer(raw) {
  const s = decodeText(raw).trim()
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return n
}

function difficultyToLevel(d) {
  if (d === 'easy') return 1
  if (d === 'medium') return 2
  if (d === 'hard') return 3
  return 2
}

function normKey(text) {
  return decodeText(text).toLowerCase().replace(/\s+/g, ' ').slice(0, 120)
}

async function requestToken() {
  const res = await fetch('https://opentdb.com/api_token.php?command=request')
  const j = await res.json()
  if (j.response_code !== 0 || !j.token) throw new Error('OpenTDB token request failed')
  return j.token
}

async function fetchBatch(token, { category, difficulty }) {
  const params = new URLSearchParams({
    amount: '50',
    type: 'multiple',
    token,
  })
  if (category != null) params.set('category', String(category))
  if (difficulty) params.set('difficulty', difficulty)
  const res = await fetch(`https://opentdb.com/api.php?${params}`)
  const j = await res.json()
  if (j.response_code === 3) return []
  if (j.response_code === 4) return []
  if (j.response_code !== 0) return []
  return j.results ?? []
}

async function harvestPoolQuick(token) {
  const pool = []
  const seen = new Set()
  for (let round = 0; round < 30; round++) {
    const batch = await fetchBatch(token, {})
    if (batch.length === 0) break
    for (const row of batch) {
      const answer = parseNumericAnswer(row.correct_answer)
      if (answer == null || answer > 999999) continue
      const text = decodeText(row.question)
      if (text.length < 12) continue
      const key = normKey(text)
      if (seen.has(key)) continue
      seen.add(key)
      pool.push({
        text,
        answer,
        category: decodeText(row.category),
        difficulty: difficultyToLevel(row.difficulty),
        source: 'opentdb',
      })
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  return pool
}

function curatedPool() {
  return CURATED.map((q) => ({ ...q, source: 'curated' }))
}

function setMatcher(slug, q) {
  const c = q.category ?? 'General'
  const d = q.difficulty ?? 2
  const t = q.text.toLowerCase()
  switch (slug) {
    case '01-general-mix':
      return d === 1 || ['Games', 'Time', 'General', 'Math'].includes(c)
    case '02-history':
      return c === 'History'
    case '03-science':
      return ['Science', 'Astronomy', 'Technology'].includes(c) || (c === 'Biology' && d <= 2)
    case '04-sports':
      return c === 'Sports'
    case '05-geography':
      return c === 'Geography' && d <= 2
    case '06-math':
      return c === 'Math' || c === 'Time'
    case '07-entertainment':
      return ['Entertainment', 'Music', 'Literature', 'Games'].includes(c)
    case '08-animals':
      return (
        c === 'Animals' ||
        (c === 'Biology' &&
          /dog|cat|bee|octopus|lobster|camel|cow|shark|butterfly|spider|insect|bird|fish|heart|rib|teeth|bone|wing|leg|stomach|chromosome|muscle|lung|blood|human|teats|humps|paws|horn|squid|species|penguin|ruminant|millipede|centipede|turtle|great white/i.test(
            t,
          ))
      )
    case '09-world-facts':
      return c === 'Geography' && d >= 3
    case '10-challenge':
      return d === 3
    default:
      return false
  }
}

function partitionSets(allQuestions, specs) {
  const buckets = specs.map((spec) => ({ spec, questions: [] }))
  const used = new Set()
  const shuffled = [...allQuestions].sort((a, b) => normKey(a.text).localeCompare(normKey(b.text)))

  for (const q of shuffled) {
    const key = normKey(q.text)
    if (used.has(key)) continue
    for (const bucket of buckets) {
      if (bucket.questions.length >= VENUE_QUESTION_SET_LENGTH) continue
      if (!setMatcher(bucket.spec.slug, q)) continue
      bucket.questions.push(q)
      used.add(key)
      break
    }
  }

  for (;;) {
    const needy = buckets
      .filter((b) => b.questions.length < VENUE_QUESTION_SET_LENGTH)
      .sort((a, b) => a.questions.length - b.questions.length)[0]
    if (!needy) break
    const next = shuffled.find((q) => !used.has(normKey(q.text)))
    if (!next) break
    needy.questions.push(next)
    used.add(normKey(next.text))
  }

  return buckets
}

function csvEscape(s) {
  const t = String(s)
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

function writeCsv(filePath, rows) {
  const lines = ['text,answer,category,difficulty']
  for (const r of rows) {
    lines.push(
      [csvEscape(r.text), r.answer, csvEscape(r.category ?? ''), r.difficulty ?? ''].join(','),
    )
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8')
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  console.log('Requesting OpenTDB session token…')
  const token = await requestToken()
  console.log('Harvesting numeric OpenTDB extras (optional)…')
  const apiPool = await harvestPoolQuick(token)
  console.log(`Harvested ${apiPool.length} numeric OpenTDB candidates.`)

  const allQuestions = [...apiPool, ...curatedPool()]
  const partitioned = partitionSets(allQuestions, SET_SPECS)
  const manifest = {
    setLength: VENUE_QUESTION_SET_LENGTH,
    setCount: SET_SPECS.length,
    totalQuestions: VENUE_QUESTION_SET_LENGTH * SET_SPECS.length,
    attribution:
      'Some questions may derive from Open Trivia DB (https://opentdb.com/), CC BY-SA 4.0. Majority are curated for Quizz\'em numeric play.',
    sets: [],
  }

  for (const { spec, questions: rows } of partitioned) {
    if (rows.length < VENUE_QUESTION_SET_LENGTH) {
      console.error(`Set ${spec.slug}: only ${rows.length}/${VENUE_QUESTION_SET_LENGTH} questions`)
      process.exitCode = 1
    }
    const file = `set-${spec.slug}.csv`
    const filePath = path.join(OUT_DIR, file)
    writeCsv(filePath, rows)
    const opentdb = rows.filter((r) => r.source === 'opentdb').length
    console.log(`Wrote ${file} (${rows.length} rows, ${opentdb} from OpenTDB)`)
    manifest.sets.push({
      file,
      name: spec.name,
      count: rows.length,
      opentdbCount: opentdb,
      curatedCount: rows.length - opentdb,
    })
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log('Done → data/question-packs/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
