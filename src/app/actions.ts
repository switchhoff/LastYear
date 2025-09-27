'use server';

import { getSentenceForDay } from "@/lib/daily-content";

export async function getDailyContent(forDate?: Date) {
  try {
    const date = forDate || new Date();
    const sentence = getSentenceForDay(date);

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
