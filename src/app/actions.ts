'use server';

import { getSentenceForDay } from "@/lib/daily-content";

export async function getDailyContent(forDate?: Date) {
  try {
    const date = forDate || new Date();
    // Ensure we are working with UTC dates to avoid timezone shift issues
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const sentence = getSentenceForDay(utcDate);

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
