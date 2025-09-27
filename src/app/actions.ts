'use server';

import { getSentenceForDay } from "@/lib/daily-content";

export async function getDailyContent(forDate?: Date) {
  try {
    const date = forDate || new Date();
    // We are getting a date for "one year ago". We need to find the sentence for this specific date.
    // The getSentenceForDay function expects a UTC date to perform the lookup.
    const sentence = getSentenceForDay(date);

    if (!sentence) {
      throw new Error(`No sentence found for date: ${date.toISOString()}`);
    }

    return {
      success: true,
      sentence,
    };
  } catch (error) {
    console.error("Error generating daily content:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}
