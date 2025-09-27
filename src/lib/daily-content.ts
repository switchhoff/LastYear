
const dateSentences: { [key: string]: string } = {
  "2024-09-23": "A campfire under the stars.",
  "2024-09-27": "Filmed a Tiktok dance never to see the light of day",
};

export type DatedSentence = {
  date: Date;
  sentence: string;
};

export function getSentenceForDay(date: Date): string {
  // Format the date as YYYY-MM-DD to match the keys in our map
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  // Find the sentence for the given date
  const sentence = dateSentences[dateString];

  // If a sentence is found for the specific date, return it
  if (sentence) {
    return sentence;
  }

  // Fallback sentences if no specific date is matched
  const fallbackSentences = [
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

  // Simple fallback: use the day of the year to pick a sentence
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  return fallbackSentences[dayOfYear % fallbackSentences.length];
}

export function getAllSentences(): DatedSentence[] {
  return Object.entries(dateSentences)
    .map(([dateString, sentence]) => {
      const [year, month, day] = dateString.split('-').map(Number);
      // Create date in UTC to avoid timezone issues
      return {
        date: new Date(Date.UTC(year, month - 1, day)),
        sentence,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
