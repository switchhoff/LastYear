
export type MemorableDate = {
  description: string;
  emoji: string;
};

// Using MM-DD format for keys
const memorableDates: Record<string, MemorableDate> = {
  '03-20': { description: "Amalie's Birthday", emoji: '🥳' },
  '08-29': { description: "Alex's Birthday", emoji: '🥳' },
  '09-23': { description: 'Our Anniversary', emoji: '💖' },
  '12-25': { description: 'Christmas Day', emoji: '🎄' },
  '01-01': { description: "New Year's Day", emoji: '🎉' },
};

export function getMemorableDate(date: Date): MemorableDate | undefined {
  // Use getMonth and getDate for local timezone
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;
  return memorableDates[key];
}
