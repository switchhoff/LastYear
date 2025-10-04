'use server';

import { getSentenceForDay } from "@/lib/daily-content";

export async function getDailyContent(forDate?: Date) {
  try {
    const date = forDate || new Date();
    // This function expects the memory date (one year ago) to perform the lookup.
    const sentence = getSentenceForDay(date);

    if (!sentence) {
      // It's okay for a sentence not to be found, we'll handle it gracefully.
      return {
        success: true,
        sentence: null,
      };
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
