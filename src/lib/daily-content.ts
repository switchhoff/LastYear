const sentences = [
  "A stick figure celebrating a birthday with a cake.",
  "Two stick figures playing soccer in a park.",
  "A stick figure reading a book under a tree.",
  "A stick figure flying a kite on a windy day.",
  "Stick figures having a picnic on a sunny afternoon.",
  "A stick figure artist painting a masterpiece.",
  "Two stick figures building a sandcastle on the beach.",
  "A stick figure exploring a mysterious cave.",
  "Stick figures dancing at a lively party.",
  "A stick figure astronaut floating in space.",
  "Two stick figures rowing a boat on a calm lake.",
  "A stick figure chef cooking a delicious meal.",
  "Stick figures camping under a starry night sky.",
  "A stick figure hiking up a tall mountain.",
  "Two stick figures sharing an umbrella in the rain.",
  "A stick figure superhero saving the day.",
  "Stick figures riding a roller coaster at an amusement park.",
  "A stick figure scientist making a groundbreaking discovery.",
  "Two stick figures playing a duet on musical instruments.",
  "A stick figure gardener tending to beautiful flowers."
];

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getSentenceForDay(date: Date): string {
  const dayIndex = getDayOfYear(date);
  return sentences[dayIndex % sentences.length];
}
