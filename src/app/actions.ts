'use server';

import { generateDailyStickFigureArt } from "@/ai/flows/generate-daily-stick-figure-art";
import { improveArtPromptWithExamples } from "@/ai/flows/improve-art-prompt-with-examples";
import { getSentenceForDay } from "@/lib/daily-content";

export async function getDailyArt() {
  try {
    const today = new Date();
    const sentence = getSentenceForDay(today);

    const improvedPromptResult = await improveArtPromptWithExamples({ sentence });

    const artResult = await generateDailyStickFigureArt({ sentence: improvedPromptResult.artPrompt });

    if (!artResult.stickFigureArtDataUri) {
      throw new Error('AI failed to generate art.');
    }

    return {
      success: true,
      sentence,
      imageUrl: artResult.stickFigureArtDataUri,
    };
  } catch (error) {
    console.error("Error generating daily art:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}
